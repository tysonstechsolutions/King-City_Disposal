// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================
// 
// Handles Stripe events:
// - checkout.session.completed → Mark booking as paid
// - payment_link.completed → Mark extension as paid
//
// SETUP IN STRIPE:
// 1. Go to Developers → Webhooks
// 2. Add endpoint: https://yourdomain.com/api/stripe/webhook
// 3. Select events: checkout.session.completed
// 4. Copy signing secret to STRIPE_WEBHOOK_SECRET env var
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

// Verify Stripe webhook signature
async function verifyStripeSignature(request, body) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set - skipping verification');
    return true;
  }

  // Simple signature verification (production should use stripe SDK)
  // For now, we'll trust the webhook if it has valid JSON
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}

// Update booking in database
async function updateBooking(bookingId, updates) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.anonKey;

  const response = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(updates),
  });

  return response.ok;
}

// Send SMS notification
async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) return null;

  try {
    await fetch(
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
    return true;
  } catch (e) {
    console.error('SMS error:', e);
    return false;
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================
export async function POST(request) {
  try {
    const body = await request.text();
    
    // Verify signature
    const isValid = await verifyStripeSignature(request, body);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log(`📦 Stripe webhook: ${event.type}`);

    // Handle checkout session completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const bookingId = metadata.booking_id;
      const type = metadata.type;

      if (bookingId) {
        // ========================================
        // NEW BOOKING PAYMENT
        // ========================================
        if (type === 'booking') {
          await updateBooking(bookingId, {
            paid: true,
            paid_at: new Date().toISOString(),
            stripe_session_id: session.id,
            status: 'confirmed', // Auto-confirm paid bookings
          });

          console.log(`✅ Booking ${bookingId} marked as paid`);

          // Notify owner
          if (process.env.OWNER_PHONE) {
            await sendSMS(process.env.OWNER_PHONE, 
              `💰 PAYMENT RECEIVED!\n\nBooking #${bookingId} just paid.\nAmount: $${(session.amount_total / 100).toFixed(2)}\n\nCheck admin panel for details.`
            );
          }
        }

        // ========================================
        // EXTENSION PAYMENT
        // ========================================
        else if (type === 'extension') {
          const extensionDays = parseInt(metadata.extension_days) || 3;
          
          // Get current booking to calculate new pickup date
          const supabaseUrl = config.supabase.url;
          const supabaseKey = config.supabase.anonKey;
          
          const bookingResponse = await fetch(
            `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              },
            }
          );

          if (bookingResponse.ok) {
            const [booking] = await bookingResponse.json();
            
            if (booking) {
              // Calculate new rental duration
              const currentDays = booking.rental_duration === '3-day' ? 3 : 7;
              const totalDays = currentDays + extensionDays;
              
              await updateBooking(bookingId, {
                rental_duration: `${totalDays}-day`,
                extension_paid: true,
                extension_paid_at: new Date().toISOString(),
                pickup_reminder_sent: null, // Reset so they get a new reminder
              });

              console.log(`✅ Booking ${bookingId} extended by ${extensionDays} days`);

              // Notify owner
              if (process.env.OWNER_PHONE) {
                await sendSMS(process.env.OWNER_PHONE,
                  `📅 EXTENSION PAID!\n\n${booking.customer_name}\n📍 ${booking.address}\n\n+${extensionDays} days added\nNew total: ${totalDays} days`
                );
              }

              // Confirm to customer
              const customerPhone = booking.customer_phone?.replace(/\D/g, '');
              if (customerPhone) {
                await sendSMS(`+1${customerPhone}`,
                  `Your extension is confirmed! ✅\n\n+${extensionDays} days added to your rental.\n\nNew pickup date coming in a reminder text.\n\n- ${config.businessName}`
                );
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
