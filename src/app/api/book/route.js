import { NextResponse } from 'next/server';
import { config } from '../../../config';

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
      dumpsterSize,
      rentalDuration,
      deliveryDate,
      priceCents,
    } = body;

    // Validate required fields
    if (!customerName || !customerPhone || !address || !dumpsterSize || !rentalDuration || !deliveryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ============================================
    // 1. SAVE TO DATABASE (Supabase)
    // ============================================
    const supabaseUrl = config.supabase.url;
    const supabaseKey = config.supabase.anonKey;

    const bookingData = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      address: address,
      placement_lat: placementLat || null,
      placement_lng: placementLng || null,
      dumpster_size: dumpsterSize,
      rental_duration: rentalDuration,
      delivery_date: deliveryDate,
      price_cents: priceCents || 0,
      status: 'pending',
      paid: false,
    };

    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
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
    // 2. SEND NOTIFICATIONS
    // ============================================
    
    // Get dumpster info for notification
    const dumpster = config.dumpsters.find(d => d.id === dumpsterSize);
    const priceDisplay = priceCents ? `$${(priceCents / 100).toFixed(0)}` : 'TBD';

    // ┌─────────────────────────────────────────┐
    // │  🔌 PLUG IN LATER: Twilio SMS           │
    // └─────────────────────────────────────────┘
    if (config.notifications.twilio.enabled && config.notifications.twilio.phoneNumber) {
      try {
        await sendTwilioSMS({
          to: config.notifications.twilio.ownerPhone,
          message: `🚛 NEW BOOKING!\n\n${customerName}\n📞 ${customerPhone}\n📍 ${address}\n\n📦 ${dumpster?.name || dumpsterSize}\n📅 ${deliveryDate}\n⏱️ ${rentalDuration}\n💰 ${priceDisplay}\n\nView: ${config.supabase.url.replace('.supabase.co', '')}/admin`,
        });
        console.log('SMS notification sent');
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
    // 3. RETURN SUCCESS
    // ============================================
    return NextResponse.json({
      success: true,
      bookingId: savedBooking[0]?.id,
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
// This function is ready to use once Twilio is enabled

async function sendTwilioSMS({ to, message }) {
  const accountSid = config.notifications.twilio.accountSid;
  const authToken = config.notifications.twilio.authToken;
  const from = config.notifications.twilio.phoneNumber;

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
