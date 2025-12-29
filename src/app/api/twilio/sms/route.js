// ============================================
// TWILIO INBOUND SMS WEBHOOK
// ============================================
// 
// Handles all incoming text messages:
// - EXTEND → Extend rental, send payment link
// - PICKUP → Schedule pickup
// - STATUS → Check rental status
// - Address → Start booking flow (from missed call)
// - Random text → Forward to owner
//
// SETUP IN TWILIO:
// 1. Go to Phone Numbers → Your Number → Messaging
// 2. Set "A MESSAGE COMES IN" to Webhook: https://yourdomain.com/api/twilio/sms
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

// Send SMS via Twilio
async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({ To: to, From: from, Body: message }),
    }
  );

  return response.json();
}

// Get customer's active rental from database
async function getActiveRental(phone) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.anonKey;

  // Clean phone number for search
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/bookings?customer_phone=ilike.*${cleanPhone}*&status=in.(confirmed,delivered)&order=created_at.desc&limit=1`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  if (response.ok) {
    const data = await response.json();
    return data[0] || null;
  }
  return null;
}

// Update rental in database
async function updateRental(bookingId, updates) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.anonKey;

  await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(updates),
  });
}

// Create Stripe payment link for extension
async function createExtensionPaymentLink(booking, extraDays) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
  const dailyRate = dumpster?.dailyExtension || 20;
  const amount = dailyRate * extraDays * 100; // Stripe uses cents

  try {
    const response = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `${extraDays}-Day Extension - ${dumpster?.name || 'Dumpster'}`,
        'line_items[0][price_data][unit_amount]': amount.toString(),
        'line_items[0][quantity]': '1',
        'metadata[booking_id]': booking.id.toString(),
        'metadata[extension_days]': extraDays.toString(),
        'after_completion[type]': 'redirect',
        'after_completion[redirect][url]': `${config.websiteUrl || 'https://kingcitydisposal.com'}/extension-confirmed`,
      }),
    });

    const data = await response.json();
    return data.url;
  } catch (e) {
    console.error('Stripe payment link error:', e);
    return null;
  }
}

// Check if text looks like an address
function looksLikeAddress(text) {
  // Contains a number followed by text (basic address pattern)
  const hasStreetNumber = /^\d+\s+\w+/.test(text.trim());
  // Contains common address words
  const hasAddressWords = /(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|way|blvd|boulevard)/i.test(text);
  // Contains city/state pattern
  const hasCityState = /,\s*\w+\s*(IL|Illinois)?/i.test(text);
  
  return hasStreetNumber || (hasAddressWords && text.length > 10) || hasCityState;
}

// TwiML response helper
function twimlResponse(message) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

// ============================================
// MAIN SMS HANDLER
// ============================================
export async function POST(request) {
  try {
    const formData = await request.formData();
    const body = formData.get('Body')?.trim() || '';
    const from = formData.get('From');
    const upperBody = body.toUpperCase();

    console.log(`📨 SMS from ${from}: "${body}"`);

    // ========================================
    // EXTEND - Add days to rental
    // ========================================
    if (upperBody === 'EXTEND' || upperBody.startsWith('EXTEND ')) {
      const rental = await getActiveRental(from);
      
      if (!rental) {
        return twimlResponse(`We couldn't find an active rental for this phone number. Call us at ${config.phone} and we'll help you out!`);
      }

      // Parse days if specified (e.g., "EXTEND 3")
      const daysMatch = body.match(/\d+/);
      const extraDays = daysMatch ? parseInt(daysMatch[0]) : 3;
      const clampedDays = Math.min(Math.max(extraDays, 1), 14); // 1-14 days

      const dumpster = config.dumpsters.find(d => d.id === rental.dumpster_size);
      const dailyRate = dumpster?.dailyExtension || 20;
      const total = dailyRate * clampedDays;

      // Try to create payment link
      const paymentLink = await createExtensionPaymentLink(rental, clampedDays);

      if (paymentLink) {
        return twimlResponse(
          `Got it! ${clampedDays} extra days = $${total}\n\nPay here to confirm:\n${paymentLink}\n\nOr reply CALL and we'll reach out.`
        );
      } else {
        // No Stripe, just notify owner
        await sendSMS(process.env.OWNER_PHONE, 
          `📅 EXTENSION REQUEST\n\n${rental.customer_name}\n📞 ${from}\n📍 ${rental.address}\n\nWants ${clampedDays} extra days ($${total})\n\nReply to confirm.`
        );
        return twimlResponse(
          `Got your extension request for ${clampedDays} days ($${total}). We'll confirm shortly!`
        );
      }
    }

    // ========================================
    // PICKUP - Request early pickup
    // ========================================
    if (upperBody === 'PICKUP' || upperBody === 'PICK UP') {
      const rental = await getActiveRental(from);
      
      if (!rental) {
        return twimlResponse(`We couldn't find an active rental for this phone number. Call us at ${config.phone} and we'll help you out!`);
      }

      // Notify owner
      await sendSMS(process.env.OWNER_PHONE, 
        `🚛 PICKUP REQUEST\n\n${rental.customer_name}\n📞 ${from}\n📍 ${rental.address}\n📦 ${rental.dumpster_size}\n\nCustomer requested pickup!`
      );

      // Update status
      await updateRental(rental.id, { 
        pickup_requested: true,
        pickup_requested_at: new Date().toISOString(),
      });

      return twimlResponse(
        `Pickup request received! 🚛\n\nWe'll get your dumpster picked up soon. You'll get a text when we're on the way.\n\nAddress: ${rental.address}`
      );
    }

    // ========================================
    // STATUS - Check rental status
    // ========================================
    if (upperBody === 'STATUS') {
      const rental = await getActiveRental(from);
      
      if (!rental) {
        return twimlResponse(`No active rental found for this number. Need a dumpster? Reply with your address to get started!`);
      }

      const dumpster = config.dumpsters.find(d => d.id === rental.dumpster_size);
      const deliveryDate = new Date(rental.delivery_date).toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric' 
      });

      // Calculate end date
      const days = rental.rental_duration === '3-day' ? 3 : 7;
      const endDate = new Date(rental.delivery_date);
      endDate.setDate(endDate.getDate() + days);
      const pickupDate = endDate.toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric' 
      });

      const statusEmoji = {
        pending: '⏳',
        confirmed: '✅',
        delivered: '🚛',
        completed: '✔️',
      };

      return twimlResponse(
        `📦 YOUR RENTAL STATUS\n\n${statusEmoji[rental.status] || '📦'} ${rental.status.toUpperCase()}\n\n📍 ${rental.address}\n🚛 ${dumpster?.name || rental.dumpster_size}\n📅 Delivered: ${deliveryDate}\n📅 Pickup by: ${pickupDate}\n\nNeed more time? Reply EXTEND\nReady for pickup? Reply PICKUP`
      );
    }

    // ========================================
    // HELP - Show commands
    // ========================================
    if (upperBody === 'HELP' || upperBody === 'COMMANDS' || upperBody === '?') {
      return twimlResponse(
        `${config.businessName} SMS Commands:\n\n📅 EXTEND - Add rental days\n🚛 PICKUP - Request pickup\n📊 STATUS - Check your rental\n💬 Or just text us anything!\n\n📞 ${config.phone}`
      );
    }

    // ========================================
    // ADDRESS - Start booking (from missed call)
    // ========================================
    if (looksLikeAddress(body)) {
      // They're probably responding to a missed call text with their address
      // Forward to owner and send confirmation
      
      await sendSMS(process.env.OWNER_PHONE,
        `🏠 NEW LEAD (from missed call)\n\n📞 ${from}\n📍 "${body}"\n\nReply to this customer directly or add to system.`
      );

      return twimlResponse(
        `Thanks! We got your address:\n${body}\n\nWant a quick quote? Check out our sizes and book online:\n${config.websiteUrl || 'https://kingcitydisposal.com'}/pricing\n\nOr we'll call you back shortly!`
      );
    }

    // ========================================
    // ANYTHING ELSE - Forward to owner
    // ========================================
    await sendSMS(process.env.OWNER_PHONE,
      `💬 SMS from ${from}:\n\n"${body}"\n\nReply here to respond.`
    );

    return twimlResponse(
      `Thanks for your message! We'll get back to you shortly.\n\n📞 ${config.phone}\n🌐 ${config.websiteUrl || 'kingcitydisposal.com'}`
    );

  } catch (error) {
    console.error('SMS webhook error:', error);
    return twimlResponse(`Something went wrong. Please call us at ${config.phone}`);
  }
}
