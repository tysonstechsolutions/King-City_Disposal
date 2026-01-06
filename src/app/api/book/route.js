import { NextResponse } from 'next/server';
import { config } from '../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// FIND OR CREATE CUSTOMER
// ============================================
async function findOrCreateCustomer({ name, phone, email, address }) {
  if (!name || !phone) return null;

  // Clean phone number for matching
  const cleanPhone = phone.replace(/\D/g, '');

  // Try to find existing customer by phone or email
  const conditions = [];
  if (cleanPhone.length >= 10) {
    conditions.push(`phone.ilike.%${cleanPhone.slice(-10)}%`);
  }
  if (email) {
    conditions.push(`email.ilike.${email}`);
  }

  if (conditions.length > 0) {
    const searchResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?or=(${conditions.join(',')})&limit=1`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (searchResponse.ok) {
      const existing = await searchResponse.json();
      if (existing.length > 0) {
        console.log(`Found existing customer: ${existing[0].name} (ID: ${existing[0].id})`);

        // Update customer stats
        await fetch(
          `${supabaseUrl}/rest/v1/customers?id=eq.${existing[0].id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
            },
            body: JSON.stringify({
              total_jobs: (existing[0].total_jobs || 0) + 1,
              last_job_date: new Date().toISOString().split('T')[0],
            }),
          }
        );

        return existing[0];
      }
    }
  }

  // Parse address for city/state/zip
  let city = null, state = 'IL', zip = null;
  if (address) {
    const stateZipMatch = address.match(/([A-Za-z\s]+),?\s*([A-Z]{2})\s*(\d{5})?/);
    if (stateZipMatch) {
      city = stateZipMatch[1]?.trim();
      state = stateZipMatch[2] || 'IL';
      zip = stateZipMatch[3] || null;
    }
  }

  // Create new customer
  const createResponse = await fetch(
    `${supabaseUrl}/rest/v1/customers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        name,
        phone,
        email: email || null,
        address: address || null,
        city,
        state,
        zip,
        total_jobs: 1,
        last_job_date: new Date().toISOString().split('T')[0],
        notes: 'Auto-created from online booking',
      }),
    }
  );

  if (createResponse.ok) {
    const [created] = await createResponse.json();
    console.log(`✅ Created new customer: ${created.name} (ID: ${created.id})`);
    return created;
  }

  console.error('Failed to create customer');
  return null;
}

// Parse "Mon, Jan 6" format to "2025-01-06" for database
function parseDeliveryDate(dateStr) {
  try {
    const currentYear = new Date().getFullYear();
    const parsed = new Date(`${dateStr} ${currentYear}`);
    if (isNaN(parsed.getTime())) {
      // Fallback: return tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    return parsed.toISOString().split('T')[0]; // Returns "2025-01-06" format
  } catch {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
}

// ============================================
// BOOKING API ENDPOINT
// ============================================
// This handles new bookings from the chatbot
// 
// Currently:
// ✅ Saves to Supabase database
// ✅ Returns success/error
//
// 🔌 PLUG IN LATER:
// - Twilio SMS notification (when enabled in config)
// - Stripe payment (when enabled in config)
// - Email notification (when Resend is added)
// ============================================

export async function POST(request) {
  try {
    const body = await request.json();
    
    const {
      customerName,
      customerPhone,
      customerEmail,
      address,
      placementLat,
      placementLng,
      placementNotes,
      dumpsterSize,
      rentalDuration,
      deliveryDate,
      priceCents,
      projectType,
    } = body;

    // Validate required fields
    if (!customerName || !customerPhone || !address || !dumpsterSize || !rentalDuration || !deliveryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ============================================
    // 1. FIND OR CREATE CUSTOMER
    // ============================================
    const customer = await findOrCreateCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: address,
    });

    // ============================================
    // 2. SAVE BOOKING TO DATABASE
    // ============================================
    const bookingData = {
      customer_id: customer?.id || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      address: address,
      placement_lat: placementLat || null,
      placement_lng: placementLng || null,
      placement_notes: placementNotes || null,
      dumpster_size: dumpsterSize,
      rental_duration: rentalDuration,
      delivery_date: parseDeliveryDate(deliveryDate),
      price_cents: priceCents || 0,
      project_type: projectType || null,
      status: 'pending',
      paid: false,
    };

    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(bookingData),
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.error('Supabase error:', errorText);
      return NextResponse.json(
        { error: 'Failed to save booking' },
        { status: 500 }
      );
    }

    const savedBooking = await dbResponse.json();
    console.log('Booking saved:', savedBooking);

    // ============================================
    // 3. SEND NOTIFICATIONS
    // ============================================
    
    // Get dumpster info for notification
    const dumpster = config.dumpsters.find(d => d.id === dumpsterSize);
    const priceDisplay = priceCents ? `$${(priceCents / 100).toFixed(0)}` : 'TBD';

    // ┌─────────────────────────────────────────┐
    // │  🔌 PLUG IN LATER: Twilio SMS           │
    // └─────────────────────────────────────────┘
    if (config.notifications.twilio.enabled && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const ownerPhone = process.env.OWNER_PHONE;
        if (ownerPhone) {
          await sendTwilioSMS({
            to: ownerPhone,
            message: `🚛 NEW BOOKING!\n\n${customerName}\n📞 ${customerPhone}\n📍 ${address}\n📌 Placement: ${placementNotes || 'Not specified'}\n\n📦 ${dumpster?.name || dumpsterSize}\n📅 ${deliveryDate}\n⏱️ ${rentalDuration}\n💰 ${priceDisplay}`,
          });
          console.log('SMS notification sent');
        }
      } catch (smsError) {
        console.error('SMS failed (continuing):', smsError);
        // Don't fail the booking if SMS fails
      }
    }

    // ┌─────────────────────────────────────────┐
    // │  🔌 PLUG IN LATER: Email notification   │
    // │  Using Resend (free tier: 100/day)      │
    // └─────────────────────────────────────────┘
    // For now, bookings show up in the admin panel
    // Email can be added later with Resend API

    // ============================================
    // 4. RETURN SUCCESS
    // ============================================
    return NextResponse.json({
      success: true,
      bookingId: savedBooking[0]?.id,
      customerId: customer?.id || null,
      customerCreated: customer ? !customer.created_at || (Date.now() - new Date(customer.created_at).getTime()) < 5000 : false,
      message: 'Booking received! We\'ll be in touch soon.',
    });

  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please call us directly.' },
      { status: 500 }
    );
  }
}

// ============================================
// TWILIO SMS HELPER
// ============================================
// Reads from environment variables (set in Vercel)

async function sendTwilioSMS({ to, message }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials not configured');
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio error: ${response.status}`);
  }

  return response.json();
}
