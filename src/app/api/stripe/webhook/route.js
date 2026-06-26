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
import Stripe from 'stripe';
import { config } from '../../../../config';
import { notifyOwner, notifyCustomer, sendSMS, bookingConfirmationEmail, invoiceEmail, sendEmail } from '../../../../lib/notifications';

// Initialize Stripe lazily to avoid build-time crash when env var is missing
let _stripe;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  return _stripe;
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
    console.log(`✅ Booking ${id} updated:`, Object.keys(updates).join(', '));
    return data[0];
  }
  console.error(`❌ updateBooking ${id} failed:`, await response.text());
  return null;
}

async function getBooking(id) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

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

async function createTransaction(data) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';

  // Idempotency: Stripe retries webhooks. If we already created a transaction
  // for this Stripe session, return it instead of inserting a duplicate.
  if (data.stripe_session_id) {
    try {
      const supabaseUrl = config.supabase.url;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;
      const existingRes = await fetch(
        `${supabaseUrl}/rest/v1/transactions?stripe_session_id=eq.${encodeURIComponent(data.stripe_session_id)}&select=id,receipt_number`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      if (existingRes.ok) {
        const existing = await existingRes.json();
        if (existing.length > 0) {
          console.log(`Transaction already exists for session ${data.stripe_session_id} - skipping duplicate`);
          return { transaction: existing[0], receipt_number: existing[0].receipt_number, already_existed: true };
        }
      }
    } catch (e) {
      // Don't block on the dedup check — proceed with creation; worst case
      // is the transactions endpoint itself catches the duplicate via DB constraint.
      console.error('Transaction dedup check failed:', e?.message || e);
    }
  }

  // Use the SUPABASE service role key as fallback internal secret in case
  // CRON_SECRET isn't configured — same pattern as docs upload route.
  const internalSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  try {
    const response = await fetch(`${siteUrl}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
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

async function generateInvoiceNumber() {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/generate_invoice_number`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Error generating invoice number:', e);
  }

  // Fallback
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
}

async function createInvoiceForBooking(booking, amountCents, metadata) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

  // ⚠️ CRITICAL: Check if invoice already exists for this booking to prevent duplicates
  try {
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/invoices?booking_uuid=eq.${booking.id}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (checkResponse.ok) {
      const existing = await checkResponse.json();
      if (existing && existing.length > 0) {
        console.log(`Invoice already exists for booking ${booking.id}: ${existing[0].invoice_number} - skipping duplicate creation`);
        return existing[0]; // Return existing invoice instead of creating duplicate
      }
    }
  } catch (e) {
    console.error('Error checking for existing invoice:', e);
    // Continue to create invoice if check fails
  }

  const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
  const dumpsterName = dumpster?.name || booking.dumpster_size;
  const invoiceNumber = await generateInvoiceNumber();

  const today = new Date().toISOString().split('T')[0];

  // Build line items from metadata fee breakdown if available
  const basePriceCents = parseInt(metadata?.base_price_cents) || amountCents;
  const taxCents = parseInt(metadata?.tax_cents) || 0;
  const stripeFeeCents = parseInt(metadata?.stripe_fee_cents) || 0;

  const lineItems = [
    { description: `${dumpsterName} - ${booking.rental_duration} Rental`, amount_cents: basePriceCents },
  ];
  if (taxCents > 0) {
    lineItems.push({ description: 'Illinois Sales Tax', amount_cents: taxCents });
  }
  if (stripeFeeCents > 0) {
    lineItems.push({ description: 'Card Processing Fee', amount_cents: stripeFeeCents });
  }

  const subtotalCents = basePriceCents;
  const totalCents = basePriceCents + taxCents + stripeFeeCents;

  const invoiceData = {
    invoice_number: invoiceNumber,
    booking_uuid: booking.id,
    customer_id: booking.customer_id || null,
    customer_name: booking.customer_name,
    customer_phone: booking.customer_phone,
    customer_email: booking.customer_email,
    customer_address: booking.customer_address || '',
    service_address: booking.address,
    service_description: `${dumpsterName} - ${booking.rental_duration} Rental`,
    dumpster_size: dumpsterName,
    rental_duration: booking.rental_duration,
    delivery_date: booking.delivery_date,
    invoice_date: today,
    date_set: booking.delivery_date || today,
    line_items: JSON.stringify(lineItems),
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    cc_fee_cents: stripeFeeCents,
    discount_cents: 0,
    total_cents: totalCents,
    amount_paid_cents: amountCents,
    due_date: today,
    status: 'paid',
    paid_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
  };

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(invoiceData),
      }
    );

    if (!response.ok) {
      console.error('Invoice creation failed:', await response.text());
      return null;
    }

    const [invoice] = await response.json();

    // Note: Skipping invoice_id linking due to UUID/bigint type mismatch
    // Invoices are linked by customer_phone + service_address + delivery_date
    console.log(`✅ Invoice ${invoiceNumber} created for booking ${booking.id}`);
    return invoice;
  } catch (e) {
    console.error('Invoice creation error:', e);
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

    // Verify signature using Stripe SDK
    let event;
    try {
      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not set - rejecting webhook for security');
        return NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        );
      }

      if (!signature) {
        console.error('Missing stripe-signature header');
        return NextResponse.json(
          { error: 'Missing signature' },
          { status: 400 }
        );
      }

      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

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
          // Update booking as paid with actual amount paid
          await updateBooking(bookingId, {
            paid: true,
            stripe_payment_id: session.id,
            status: 'confirmed',
            price_cents: session.amount_total,
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

          const priceDisplay = `$${(session.amount_total / 100).toFixed(2)}`;

          // Create invoice and text customer the link
          let invoice = null;
          try {
            invoice = await createInvoiceForBooking(booking, session.amount_total, session.metadata);

            // Note: Skipping invoice_id linking due to UUID/bigint type mismatch in schema
            // Invoices can be found by customer_phone + service_address + delivery_date

            if (invoice && booking.customer_phone) {
              const invoiceUrl = `${siteUrl}/invoice/${invoice.invoice_number}`;

              const invoiceSms = `📋 INVOICE FROM ${config.businessName.toUpperCase()}\n\nInvoice: ${invoice.invoice_number}\nAmount: ${priceDisplay}\n\n📍 ${booking.address}\n🚛 ${dumpsterName}\n📅 ${booking.delivery_date}\n\n💳 View Invoice: ${invoiceUrl}\n\nQuestions? Reply to this text or call ${config.phone}\n\n- ${config.businessName}`;

              await sendSMS(booking.customer_phone, invoiceSms);
              console.log(`Invoice SMS sent to ${booking.customer_phone} - ${invoice.invoice_number}`);
            }

            // Send invoice email if customer has email
            const customerEmail = booking.customer_email || session.customer_details?.email;
            if (invoice && customerEmail) {
              const { html, text } = invoiceEmail(invoice);
              await sendEmail({
                to: customerEmail,
                subject: `Invoice ${invoice.invoice_number} from ${config.businessName}`,
                html,
                text,
              });
            }
          } catch (e) {
            console.error('Invoice creation/send failed:', e);
          }

          // Notify team (owner + billing + operations)
          try {
            await notifyOwner(
              `PAYMENT RECEIVED!\n\n${booking.customer_name}\n📞 ${booking.customer_phone}\n📍 ${booking.address}\n\n📦 ${dumpsterName}\n📅 ${booking.delivery_date}\n⏱️ ${booking.rental_duration}\n💰 ${priceDisplay}\n\nReceipt: ${txResult?.receipt_number || 'Created'}${invoice ? `\nInvoice: ${invoice.invoice_number}` : ''}`
            );
          } catch (e) {
            console.error('Team notification failed:', e);
          }

          // Send customer confirmation SMS + Email (now that payment is confirmed)
          try {
            const customerEmail = booking.customer_email || session.customer_details?.email;
            const bookingForEmail = {
              customer_name: booking.customer_name,
              dumpster_size: booking.dumpster_size,
              delivery_date: booking.delivery_date,
              rental_duration: booking.rental_duration,
              address: booking.address,
              placement_notes: booking.placement_notes,
              price_cents: session.amount_total,
              base_price_cents: parseInt(metadata.base_price_cents) || 0,
              tax_cents: parseInt(metadata.tax_cents) || 0,
              stripe_fee_cents: parseInt(metadata.stripe_fee_cents) || 0,
            };

            const { html, text } = bookingConfirmationEmail(bookingForEmail);

            await notifyCustomer({
              phone: booking.customer_phone,
              email: customerEmail,
              subject: `Booking Confirmed - ${config.businessName}`,
              smsMessage: `Thanks for booking with ${config.businessName}!\n\n📦 ${dumpsterName}\n📅 ${booking.delivery_date}\n📍 ${booking.address}\n💰 ${priceDisplay}\n\nWe'll deliver between 8am-12pm. Questions? Call ${config.phone}`,
              emailHtml: html,
              emailText: text,
            });
            console.log(`Customer confirmation sent to ${booking.customer_phone}`);
          } catch (e) {
            console.error('Customer confirmation failed:', e);
          }
        }
      }

      // ========================================
      // EXTENSION PAYMENT
      // ========================================
      else if (type === 'extension' && bookingId) {
        const booking = await getBooking(bookingId);
        const extensionDays = parseInt(metadata.extension_days) || 7;

        if (booking) {
          const durationMatch = booking.rental_duration?.match(/(\d+)-day/);
          const currentDays = durationMatch ? parseInt(durationMatch[1]) : 10;
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

          // Notify team
          try {
            await notifyOwner(
              `EXTENSION PAID!\n\n${booking.customer_name}\n${booking.address}\n\n+${extensionDays} days\nNew total: ${totalDays} days\n$${(session.amount_total / 100).toFixed(2)}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
            );
          } catch (e) {
            console.error('Team notification failed:', e);
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

          // Notify team
          try {
            await notifyOwner(
              `OVERAGE PAID!\n\n${booking.customer_name}\n${booking.address}\n\n$${(session.amount_total / 100).toFixed(2)}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
            );
          } catch (e) {
            console.error('Team notification failed:', e);
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

          // Notify team
          try {
            await notifyOwner(
              `LATE FEE PAID!\n\n${booking.customer_name}\n${booking.address}\n\n$${(session.amount_total / 100).toFixed(2)}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
            );
          } catch (e) {
            console.error('Team notification failed:', e);
          }
        }
      }

      // ========================================
      // INVOICE PAYMENT
      // ========================================
      else if (type === 'invoice') {
        const invoiceId = metadata.invoice_id;
        const invoiceNumber = metadata.invoice_number;
        const supabaseUrl = config.supabase.url;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

        if (invoiceId || invoiceNumber) {
          try {
            // Update invoice to paid
            const query = invoiceId
              ? `id=eq.${invoiceId}`
              : `invoice_number=eq.${invoiceNumber}`;

            const updateResponse = await fetch(
              `${supabaseUrl}/rest/v1/invoices?${query}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  amount_paid_cents: session.amount_total,
                  payment_method: 'stripe',
                  stripe_payment_intent_id: session.payment_intent,
                }),
              }
            );

            if (updateResponse.ok) {
              const [invoice] = await updateResponse.json();
              console.log(`Invoice ${invoice?.invoice_number || invoiceNumber} marked as PAID`);

              const priceDisplay = `$${(session.amount_total / 100).toFixed(2)}`;
              const customerName = session.customer_details?.name || metadata.customer_name || invoice?.customer_name || 'Customer';
              const customerPhone = metadata.customer_phone || invoice?.customer_phone;
              const customerEmail = session.customer_details?.email || metadata.customer_email || invoice?.customer_email;

              // Create transaction record so it shows in admin payments
              const txResult = await createTransaction({
                invoice_id: invoice?.id || parseInt(invoiceId),
                booking_id: invoice?.booking_id || null,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_email: customerEmail,
                amount_cents: session.amount_total,
                description: `Invoice ${invoice?.invoice_number || invoiceNumber}`,
                type: 'invoice',
                service_address: invoice?.service_address || '',
                stripe_session_id: session.id,
                stripe_payment_intent: session.payment_intent,
                payment_method: 'card',
                send_sms: !!customerPhone,
              });

              console.log(`Invoice payment transaction created, receipt: ${txResult?.receipt_number}`);

              // Notify owner
              await notifyOwner(
                `💰 INVOICE PAID!\n\nInvoice: ${invoice?.invoice_number || invoiceNumber}\nCustomer: ${customerName}\nAmount: ${priceDisplay}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
              );

              // Send confirmation to customer if email/phone available
              if (customerEmail || customerPhone) {
                await notifyCustomer({
                  phone: customerPhone,
                  email: customerEmail,
                  subject: `Payment Received - Invoice ${invoice?.invoice_number || invoiceNumber}`,
                  smsMessage: `✅ Payment received!\n\nInvoice: ${invoice?.invoice_number || invoiceNumber}\nAmount: ${priceDisplay}\n\nThank you for your business!\n\n${config.businessName}\n${config.billingPhone}`,
                  emailHtml: `<p>Thank you for your payment of ${priceDisplay} for invoice ${invoice?.invoice_number || invoiceNumber}.</p><p>Your payment has been processed successfully.</p><p>${config.businessName}<br>${config.billingPhone}</p>`,
                  emailText: `Thank you for your payment of ${priceDisplay} for invoice ${invoice?.invoice_number || invoiceNumber}.\n\nYour payment has been processed successfully.\n\n${config.businessName}\n${config.billingPhone}`,
                });
              }
            } else {
              console.error('Failed to update invoice:', await updateResponse.text());
            }
          } catch (e) {
            console.error('Invoice payment processing error:', e);
          }
        }
      }

      // ========================================
      // INVOICE BATCH PAYMENT (pay multiple invoices at once)
      // ========================================
      else if (type === 'invoice_batch') {
        const batchToken = metadata.batch_token;
        const supabaseUrl = config.supabase.url;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

        let invoiceIds = [];
        try {
          invoiceIds = JSON.parse(metadata.invoice_ids || '[]');
        } catch (e) {
          invoiceIds = [];
        }

        try {
          // Load the batch (for contact info + idempotency)
          let batch = null;
          if (batchToken) {
            const bRes = await fetch(
              `${supabaseUrl}/rest/v1/payment_batches?token=eq.${encodeURIComponent(batchToken)}`,
              {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                },
              }
            );
            if (bRes.ok) {
              [batch] = await bRes.json();
            }
          }

          // Idempotency: Stripe retries webhooks. If already paid, stop.
          if (batch && batch.status === 'paid') {
            console.log(`Batch ${batchToken} already paid - skipping duplicate`);
            return NextResponse.json({ received: true });
          }

          const paidInvoices = [];

          for (const invId of invoiceIds) {
            const invRes = await fetch(
              `${supabaseUrl}/rest/v1/invoices?id=eq.${invId}`,
              {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                },
              }
            );
            if (!invRes.ok) continue;
            const [inv] = await invRes.json();
            if (!inv) continue;

            // Already paid (e.g. separately) — record it but don't double-charge/receipt
            if (inv.status === 'paid') {
              paidInvoices.push(inv);
              continue;
            }

            const balance = Math.max(0, (inv.total_cents || 0) - (inv.amount_paid_cents || 0));

            // Mark this invoice paid
            await fetch(
              `${supabaseUrl}/rest/v1/invoices?id=eq.${invId}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  amount_paid_cents: inv.total_cents,
                  payment_method: 'stripe',
                  stripe_payment_intent_id: session.payment_intent,
                }),
              }
            );

            // One receipt per invoice. Composite session id keeps the webhook
            // dedup working per-invoice (one real Stripe session, many invoices).
            await createTransaction({
              invoice_id: inv.id,
              booking_id: inv.booking_id || null,
              customer_name: inv.customer_name,
              customer_phone: inv.customer_phone,
              customer_email: inv.customer_email,
              amount_cents: balance,
              description: `Invoice ${inv.invoice_number}`,
              type: 'invoice',
              service_address: inv.service_address || '',
              stripe_session_id: `${session.id}:${inv.id}`,
              stripe_payment_intent: session.payment_intent,
              payment_method: 'card',
              send_sms: false, // one combined confirmation sent below
            });

            paidInvoices.push(inv);
          }

          // Mark the batch paid
          if (batchToken) {
            await fetch(
              `${supabaseUrl}/rest/v1/payment_batches?token=eq.${encodeURIComponent(batchToken)}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  stripe_session_id: session.id,
                }),
              }
            );
          }

          const priceDisplay = `$${(session.amount_total / 100).toFixed(2)}`;
          const customerName = session.customer_details?.name || metadata.customer_name || batch?.customer_name || 'Customer';
          const customerPhone = metadata.customer_phone || batch?.customer_phone;
          const customerEmail = session.customer_details?.email || metadata.customer_email || batch?.customer_email;
          const numbers = paidInvoices.map((i) => i.invoice_number).join(', ');

          console.log(`Batch ${batchToken} paid: ${numbers} (${priceDisplay})`);

          // Notify owner
          try {
            await notifyOwner(
              `💰 BATCH PAYMENT RECEIVED!\n\nCustomer: ${customerName}\nInvoices (${paidInvoices.length}): ${numbers}\nAmount: ${priceDisplay}`
            );
          } catch (e) {
            console.error('Team notification failed:', e);
          }

          // One combined confirmation to the customer
          if (customerEmail || customerPhone) {
            try {
              await notifyCustomer({
                phone: customerPhone,
                email: customerEmail,
                subject: `Payment Received - ${config.businessName}`,
                smsMessage: `✅ Payment received!\n\nInvoices: ${numbers}\nAmount: ${priceDisplay}\n\nThank you for your business!\n\n${config.businessName}\n${config.billingPhone}`,
                emailHtml: `<p>Thank you for your payment of ${priceDisplay}.</p><p>The following invoices are now paid: ${numbers}.</p><p>${config.businessName}<br>${config.billingPhone}</p>`,
                emailText: `Thank you for your payment of ${priceDisplay}.\n\nThe following invoices are now paid: ${numbers}.\n\n${config.businessName}\n${config.billingPhone}`,
              });
            } catch (e) {
              console.error('Customer confirmation failed:', e);
            }
          }
        } catch (e) {
          console.error('Batch payment processing error:', e);
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

        // Notify team
        try {
          await notifyOwner(
            `CUSTOM PAYMENT!\n\n${session.customer_details?.name || 'Customer'}\n$${(session.amount_total / 100).toFixed(2)}\n\n${metadata.description || ''}\n\nReceipt: ${txResult?.receipt_number || 'Created'}`
          );
        } catch (e) {
          console.error('Team notification failed:', e);
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
