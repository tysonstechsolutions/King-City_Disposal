// ============================================
// STRIPE WEBHOOK HANDLER (WITH TRANSACTIONS)
// ============================================
//
// Handles Stripe events:
// - checkout.session.completed → Mark booking as paid + create transaction
//
// Now includes:
// - Transaction/receipt creation
// - SMS receipt to customer
// - Receipt URL in notifications
//
// SETUP IN STRIPE:
// 1. Go to Developers → Webhooks
// 2. Add endpoint: https://yourdomain.com/api/stripe/webhook
// 3. Select events: checkout.session.completed
// 4. Copy signing secret to STRIPE_WEBHOOK_SECRET env var
//
// ============================================

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { config } from '../../../../config';

// ============================================
// STRIPE SIGNATURE VERIFICATION
// ============================================
function verifyStripeSignature(payload, signature, secret) {
  if (!secret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set - webhook verification disabled');
    return false;
  }

  if (!signature) {
    console.error('No stripe-signature header present');
    return false;
  }

  try {
    const elements = signature.split(',');
    let timestamp = null;
    let v1Signature = null;

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') v1Signature = value;
    }

    if (!timestamp || !v1Signature) {
      console.error('Invalid signature format');
      return false;
    }

    const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (timestampAge > 300) {
      console.error('Webhook timestamp too old');
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(v1Signature),
      Buffer.from(expectedSignature)
    );

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
async function updateBooking(id, updates) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/bookings?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updates),
    }
  );

  if (response.ok) {
    const data = await response.json();
    return data[0];
  }
  return null;
}

async function getBooking(id) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.anonKey;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/bookings?id=eq.${id}`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  if (response.ok) {
    const data = await response.json();
    return data[0];
  }
  return null;
}

async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) return false;

  try {
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
    return response.ok;
  } catch (e) {
    console.error('SMS error:', e);
    return false;
  }
}

async function createTransaction(data) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';

  try {
    const response = await fetch(`${siteUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      return await response.json();
    }
    console.error('Transaction creation failed:', await response.text());
    return null;
  } catch (e) {
    console.error('Transaction error:', e);
    return null;
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify signature
    const isValid = verifyStripeSignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    console.log(`Stripe webhook: ${event.type}`);

    // Handle checkout session completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const bookingId = metadata.booking_id;
      const type = metadata.type || 'booking';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';

      // ========================================
      // NEW BOOKING PAYMENT
      // ========================================
      if (type === 'booking' && bookingId) {
        const booking = await getBooking(bookingId);

        if (booking) {
          // Update booking as paid
          await updateBooking(bookingId, {
            paid: true,
            paid_at: new Date().toISOString(),
            stripe_session_id: session.id,
            status: 'confirmed',
          });

          // Get dumpster info
          const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
          const dumpsterName = dumpster?.name || booking.dumpster_size;

          // Create transaction record
          const txResult = await createTransaction({
            booking_id: parseInt(bookingId),
            customer_name: booking.customer_name,
            customer_phone: booking.customer_phone,
            customer_email: booking.customer_email || session.customer_details?.email,
            amount_cents: session.amount_total,
            description: `${dumpsterName} - ${booking.rental_duration} Rental`,
            type: 'booking',
            service_address: booking.address,
            dumpster_size: dumpsterName,
            rental_duration: booking.rental_duration,
            delivery_date: booking.delivery_date,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            payment_method: 'card',
            send_sms: true,
          });

          console.log(`Booking ${bookingId} paid, receipt: ${txResult?.receipt_number}`);

          // Notify owner with receipt link
          if (process.env.OWNER_PHONE) {
            await sendSMS(process.env.OWNER_PHONE,
              `PAYMENT RECEIVED!\n\n${booking.customer_name}\n${booking.address}\n\n${dumpsterName}\n${booking.delivery_date}\n$${(session.amount_total / 100).toFixed(2)}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
            );
          }
        }
      }

      // ========================================
      // EXTENSION PAYMENT
      // ========================================
      else if (type === 'extension' && bookingId) {
        const booking = await getBooking(bookingId);
        const extensionDays = parseInt(metadata.extension_days) || 3;

        if (booking) {
          const currentDays = booking.rental_duration === '3-day' ? 3 : 7;
          const totalDays = currentDays + extensionDays;

          await updateBooking(bookingId, {
            rental_duration: `${totalDays}-day`,
            extension_paid: true,
            extension_paid_at: new Date().toISOString(),
            pickup_reminder_sent: null,
          });

          // Create transaction record
          const txResult = await createTransaction({
            booking_id: parseInt(bookingId),
            customer_name: booking.customer_name,
            customer_phone: booking.customer_phone,
            customer_email: booking.customer_email,
            amount_cents: session.amount_total,
            description: `${extensionDays}-Day Extension`,
            type: 'extension',
            service_address: booking.address,
            dumpster_size: booking.dumpster_size,
            rental_duration: `+${extensionDays} days`,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            payment_method: 'card',
            send_sms: true,
          });

          console.log(`Extension for ${bookingId} paid, receipt: ${txResult?.receipt_number}`);

          // Notify owner
          if (process.env.OWNER_PHONE) {
            await sendSMS(process.env.OWNER_PHONE,
              `EXTENSION PAID!\n\n${booking.customer_name}\n${booking.address}\n\n+${extensionDays} days\nNew total: ${totalDays} days\n$${(session.amount_total / 100).toFixed(2)}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
            );
          }
        }
      }

      // ========================================
      // OVERAGE PAYMENT
      // ========================================
      else if (type === 'overage' && bookingId) {
        const booking = await getBooking(bookingId);

        if (booking) {
          await updateBooking(bookingId, {
            overage_paid: true,
            overage_paid_at: new Date().toISOString(),
            pending_overage_amount: null,
            pending_overage_link: null,
          });

          // Create transaction record
          const txResult = await createTransaction({
            booking_id: parseInt(bookingId),
            customer_name: booking.customer_name,
            customer_phone: booking.customer_phone,
            customer_email: booking.customer_email,
            amount_cents: session.amount_total,
            description: `Weight Overage`,
            type: 'overage',
            service_address: booking.address,
            dumpster_size: booking.dumpster_size,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            payment_method: 'card',
            send_sms: true,
          });

          console.log(`Overage for ${bookingId} paid, receipt: ${txResult?.receipt_number}`);

          // Notify owner
          if (process.env.OWNER_PHONE) {
            await sendSMS(process.env.OWNER_PHONE,
              `OVERAGE PAID!\n\n${booking.customer_name}\n${booking.address}\n\n$${(session.amount_total / 100).toFixed(2)}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
            );
          }
        }
      }

      // ========================================
      // LATE FEE PAYMENT
      // ========================================
      else if (type === 'late_fee' && bookingId) {
        const booking = await getBooking(bookingId);

        if (booking) {
          await updateBooking(bookingId, {
            late_fee_paid: true,
            late_fee_paid_at: new Date().toISOString(),
            pending_late_fee: null,
          });

          // Create transaction record
          const txResult = await createTransaction({
            booking_id: parseInt(bookingId),
            customer_name: booking.customer_name,
            customer_phone: booking.customer_phone,
            customer_email: booking.customer_email,
            amount_cents: session.amount_total,
            description: `Late Fee`,
            type: 'late_fee',
            service_address: booking.address,
            dumpster_size: booking.dumpster_size,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            payment_method: 'card',
            send_sms: true,
          });

          console.log(`Late fee for ${bookingId} paid, receipt: ${txResult?.receipt_number}`);

          // Notify owner
          if (process.env.OWNER_PHONE) {
            await sendSMS(process.env.OWNER_PHONE,
              `LATE FEE PAID!\n\n${booking.customer_name}\n${booking.address}\n\n$${(session.amount_total / 100).toFixed(2)}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
            );
          }
        }
      }

      // ========================================
      // CUSTOM PAYMENT (no booking)
      // ========================================
      else if (type === 'custom') {
        const txResult = await createTransaction({
          customer_name: session.customer_details?.name || metadata.customer_name || 'Customer',
          customer_phone: metadata.customer_phone,
          customer_email: session.customer_details?.email || metadata.customer_email,
          amount_cents: session.amount_total,
          description: metadata.description || 'Custom Payment',
          type: 'custom',
          service_address: metadata.service_address,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          payment_method: 'card',
          send_sms: !!metadata.customer_phone,
        });

        console.log(`Custom payment received, receipt: ${txResult?.receipt_number}`);

        // Notify owner
        if (process.env.OWNER_PHONE) {
          await sendSMS(process.env.OWNER_PHONE,
            `CUSTOM PAYMENT!\n\n${session.customer_details?.name || 'Customer'}\n$${(session.amount_total / 100).toFixed(2)}\n\n${metadata.description || ''}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
          );
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
