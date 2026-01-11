import { NextResponse } from 'next/server';
import { config } from '../../../config';
import { notifyCustomer, notifyOwner, bookingConfirmationEmail } from '../../../lib/notifications';
import { bookingSchema, validateInput } from '../../../lib/validations';
import { logger } from '../../../lib/logger';
import { bookingRateLimit } from '../../../lib/rateLimit';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// FIND OR CREATE CUSTOMER
// ============================================
async function findOrCreateCustomer({ name, phone, email, address, city, zip }) {
  if (!name || !phone) return null;

  // Clean phone number for matching - only allow digits
  const cleanPhone = phone.replace(/\D/g, '');

  // Validate phone contains only digits after cleaning (SQL injection prevention)
  if (!/^\d+$/.test(cleanPhone)) {
    console.error('Invalid phone number format after cleaning');
    return null;
  }

  // Sanitize email for query (basic validation)
  const sanitizedEmail = email ? email.replace(/['"\\;]/g, '').trim() : null;

  // Try to find existing customer by phone or email
  const conditions = [];
  if (cleanPhone.length >= 10) {
    conditions.push(`phone.ilike.%${cleanPhone.slice(-10)}%`);
  }
  if (sanitizedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    conditions.push(`email.ilike.${encodeURIComponent(sanitizedEmail)}`);
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

        // Update customer stats and city/zip if provided
        const updateData = {
          total_jobs: (existing[0].total_jobs || 0) + 1,
          last_job_date: new Date().toISOString().split('T')[0],
        };
        // Update city/zip if they were provided but customer doesn't have them
        if (city && !existing[0].city) updateData.city = city;
        if (zip && !existing[0].zip) updateData.zip = zip;

        await fetch(
          `${supabaseUrl}/rest/v1/customers?id=eq.${existing[0].id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
            },
            body: JSON.stringify(updateData),
          }
        );

        return existing[0];
      }
    }
  }

  // Use explicit city/zip if provided, otherwise parse from address
  let customerCity = city || null;
  let customerZip = zip || null;
  let state = 'IL';

  // Only parse address if city/zip not explicitly provided
  if (!customerCity && !customerZip && address) {
    const stateZipMatch = address.match(/([A-Za-z\s]+),?\s*([A-Z]{2})\s*(\d{5})?/);
    if (stateZipMatch) {
      customerCity = stateZipMatch[1]?.trim();
      state = stateZipMatch[2] || 'IL';
      customerZip = stateZipMatch[3] || null;
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
        city: customerCity,
        state,
        zip: customerZip,
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
// Handles year rollover (e.g., booking in December for January)
function parseDeliveryDate(dateStr) {
  try {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    // Try parsing with current year
    let parsed = new Date(`${dateStr} ${currentYear}`);

    if (isNaN(parsed.getTime())) {
      // Fallback: return tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Year rollover fix: if parsed date is more than 7 days in the past,
    // it's likely meant for next year (e.g., "Jan 6" in December)
    const daysDiff = Math.floor((parsed - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < -7) {
      parsed = new Date(`${dateStr} ${currentYear + 1}`);
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
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const rateLimitResult = bookingRateLimit(ip);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for booking', { ip });
      return NextResponse.json(
        { error: 'Too many booking attempts. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = validateInput(bookingSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

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
    } = validation.data;

    // Extract city and zip (not in Zod schema, just pass through)
    const city = body.city || null;
    const zip = body.zip || null;

    // ============================================
    // 1. FIND OR CREATE CUSTOMER
    // ============================================
    const customer = await findOrCreateCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: address,
      city: city,
      zip: zip,
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
    logger.info('Booking saved', {
      booking_id: savedBooking[0]?.id,
      customer: customerName,
      size: dumpsterSize,
      date: deliveryDate,
    });

    // ============================================
    // 3. SEND NOTIFICATIONS
    // ============================================

    // Get dumpster info for notification
    const dumpster = config.dumpsters.find(d => d.id === dumpsterSize);
    const priceDisplay = priceCents ? `$${(priceCents / 100).toFixed(0)}` : 'TBD';

    // Notify owner via SMS
    try {
      await notifyOwner(
        `🚛 NEW BOOKING!\n\n${customerName}\n📞 ${customerPhone}\n📍 ${address}\n📌 Placement: ${placementNotes || 'Not specified'}\n\n📦 ${dumpster?.name || dumpsterSize}\n📅 ${deliveryDate}\n⏱️ ${rentalDuration}\n💰 ${priceDisplay}`
      );
      logger.notification('sms', 'owner', true, { booking_id: savedBooking[0]?.id });
    } catch (notifyError) {
      logger.error('Owner notification failed', notifyError, { booking_id: savedBooking[0]?.id });
    }

    // Notify customer via SMS and Email
    try {
      const bookingForEmail = {
        ...bookingData,
        customer_name: customerName,
        dumpster_size: dumpsterSize,
        delivery_date: deliveryDate,
        rental_duration: rentalDuration,
        address: address,
        placement_notes: placementNotes,
        price_cents: priceCents,
      };

      const { html, text } = bookingConfirmationEmail(bookingForEmail);

      await notifyCustomer({
        phone: customerPhone,
        email: customerEmail,
        subject: `Booking Confirmed - ${config.businessName}`,
        smsMessage: `Thanks for booking with ${config.businessName}!\n\n📦 ${dumpster?.name || dumpsterSize}\n📅 ${deliveryDate}\n📍 ${address}\n\nWe'll deliver between 8am-12pm. Questions? Call ${config.phone}`,
        emailHtml: html,
        emailText: text,
      });
      logger.notification('sms+email', customerPhone, true, { booking_id: savedBooking[0]?.id });
    } catch (notifyError) {
      logger.error('Customer notification failed', notifyError, { booking_id: savedBooking[0]?.id });
    }

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
    logger.error('Booking API error', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please call us directly.' },
      { status: 500 }
    );
  }
}

