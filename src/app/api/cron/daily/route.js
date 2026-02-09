// ============================================
// COMBINED DAILY CRON JOB
// ============================================
//
// Runs once daily at 9am CST (15:00 UTC)
// Handles ALL scheduled tasks:
// - Daily route text to owner
// - Delivery/pickup reminders
// - Late fee notifications
// - Invoice payment reminders
//
// This combines 4 jobs into 1 to stay within Vercel free tier limits
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { sendSMS, notifyCustomer, notifyOwner, deliveryReminderEmail } from '../../../../lib/notifications';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// 1. DAILY ROUTE
// ============================================
async function runDailyRoute() {
  console.log('📋 Running daily route...');

  const today = new Date().toISOString().split('T')[0];

  // Get today's deliveries
  const deliveriesRes = await fetch(
    `${supabaseUrl}/rest/v1/bookings?delivery_date=eq.${today}&status=in.(pending,confirmed)&order=address.asc`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  // Get today's pickups
  const pickupsRes = await fetch(
    `${supabaseUrl}/rest/v1/bookings?status=eq.pickup_requested&order=address.asc`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  const deliveries = deliveriesRes.ok ? await deliveriesRes.json() : [];
  const pickups = pickupsRes.ok ? await pickupsRes.json() : [];

  if (deliveries.length === 0 && pickups.length === 0) {
    console.log('No deliveries or pickups today');
    return { deliveries: 0, pickups: 0 };
  }

  const ownerPhone = process.env.OWNER_PHONE;
  if (!ownerPhone) return { deliveries: deliveries.length, pickups: pickups.length };

  let message = `📋 TODAY'S ROUTE\n${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}\n`;

  if (deliveries.length > 0) {
    message += `\n🚛 DELIVERIES (${deliveries.length}):\n`;
    deliveries.forEach((b, i) => {
      message += `${i + 1}. ${b.customer_name}\n   📍 ${b.address}\n   📦 ${b.dumpster_size}\n`;
    });
  }

  if (pickups.length > 0) {
    message += `\n📤 PICKUPS (${pickups.length}):\n`;
    pickups.forEach((b, i) => {
      message += `${i + 1}. ${b.customer_name}\n   📍 ${b.address}\n`;
    });
  }

  await sendSMS(ownerPhone, message);
  return { deliveries: deliveries.length, pickups: pickups.length };
}

// ============================================
// 2. DELIVERY/PICKUP REMINDERS
// ============================================
async function runReminders() {
  console.log('🔔 Running delivery/pickup reminders...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Tomorrow's deliveries (not yet reminded)
  const deliveriesRes = await fetch(
    `${supabaseUrl}/rest/v1/bookings?delivery_date=eq.${tomorrowStr}&status=in.(pending,confirmed)&delivery_reminder_sent=is.null`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  const deliveries = deliveriesRes.ok ? await deliveriesRes.json() : [];
  let sent = 0;

  for (const booking of deliveries) {
    if (!booking.customer_phone && !booking.customer_email) continue;

    const smsMessage = `🚛 DELIVERY REMINDER

Hi ${booking.customer_name?.split(' ')[0] || 'there'}!

Your ${booking.dumpster_size || 'dumpster'} is scheduled for delivery TOMORROW.

📍 ${booking.address}
${booking.placement_notes ? `📌 Placement: ${booking.placement_notes}\n` : ''}
Please ensure the area is clear and accessible.

Questions? Reply to this text or call ${config.phone}

- ${config.businessName}`;

    // Get email template
    const { html: emailHtml, text: emailText } = deliveryReminderEmail(booking);

    // Send both SMS and email
    const results = await notifyCustomer({
      phone: booking.customer_phone,
      email: booking.customer_email,
      subject: `Delivery Tomorrow - ${config.businessName}`,
      smsMessage,
      emailHtml,
      emailText,
    });

    if (results.sms?.success || results.email?.success) {
      await fetch(
        `${supabaseUrl}/rest/v1/bookings?id=eq.${booking.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
          body: JSON.stringify({ delivery_reminder_sent: new Date().toISOString() }),
        }
      );
      sent++;
    }
  }

  return { reminders_sent: sent };
}

// ============================================
// 3. LATE FEE NOTIFICATIONS
// ============================================
async function runLateFees() {
  console.log('⏰ Running late fee check...');

  // Get delivered bookings past their pickup date
  const response = await fetch(
    `${supabaseUrl}/rest/v1/bookings?status=eq.delivered&select=*`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  if (!response.ok) return { overdue: 0 };

  const bookings = await response.json();
  const today = new Date();
  let notified = 0;

  for (const booking of bookings) {
    if (!booking.delivery_date || !booking.rental_duration) continue;

    const deliveryDate = new Date(booking.delivery_date);
    const days = parseInt(booking.rental_duration) || 7;
    const dueDate = new Date(deliveryDate);
    dueDate.setDate(dueDate.getDate() + days);

    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

    if (daysOverdue > 0 && booking.customer_phone) {
      // Only notify once per 3 days
      const lastNotified = booking.late_fee_notified_at ? new Date(booking.late_fee_notified_at) : null;
      const daysSinceNotified = lastNotified ? Math.floor((today - lastNotified) / (1000 * 60 * 60 * 24)) : 999;

      if (daysSinceNotified >= 3) {
        const lateFee = daysOverdue * (config.pricing?.lateFeePerDay || 25);

        const message = `⏰ RENTAL OVERDUE

Your dumpster at ${booking.address} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past the pickup date.

Daily late fee: $${config.pricing?.lateFeePerDay || 25}/day
Current charges: $${lateFee}

To schedule pickup, reply PICKUP or call ${config.phone}

- ${config.businessName}`;

        const success = await sendSMS(booking.customer_phone, message);
        if (success) {
          await fetch(
            `${supabaseUrl}/rest/v1/bookings?id=eq.${booking.id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': getSupabaseKey(),
                'Authorization': `Bearer ${getSupabaseKey()}`,
              },
              body: JSON.stringify({
                late_fee_notified_at: new Date().toISOString(),
                days_overdue: daysOverdue,
                pending_late_fee: lateFee * 100,
              }),
            }
          );
          notified++;
        }
      }
    }
  }

  return { overdue_notified: notified };
}

// ============================================
// 4. INVOICE REMINDERS
// ============================================
async function runInvoiceReminders() {
  console.log('📋 Running invoice reminders...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unpaid invoices
  const response = await fetch(
    `${supabaseUrl}/rest/v1/invoices?status=neq.paid&status=neq.void&status=neq.draft&order=due_date.asc`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  if (!response.ok) return { invoice_reminders: 0 };

  const invoices = await response.json();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kingcitydisposal.com';
  let sent = 0;

  for (const invoice of invoices) {
    if (!invoice.customer_phone || !invoice.due_date) continue;

    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    const daysSinceLastReminder = invoice.last_reminder_sent_at
      ? Math.floor((today - new Date(invoice.last_reminder_sent_at)) / (1000 * 60 * 60 * 24))
      : 999;

    let shouldRemind = false;

    // Remind at: 3 days before, day of, 1 day after, 3 days after, 7 days after
    if (daysUntilDue === 3 && invoice.reminder_count === 0) shouldRemind = true;
    else if (daysUntilDue === 0 && daysSinceLastReminder >= 1) shouldRemind = true;
    else if (daysUntilDue < 0 && daysSinceLastReminder >= 3) shouldRemind = true;

    if (shouldRemind) {
      const amount = `$${((invoice.balance_due_cents || invoice.total_cents) / 100).toFixed(2)}`;
      const invoiceUrl = `${siteUrl}/invoice/${invoice.invoice_number}`;

      let message;
      if (daysUntilDue < 0) {
        const daysOverdue = Math.abs(daysUntilDue);
        message = `⚠️ PAYMENT OVERDUE

Invoice ${invoice.invoice_number}
Amount: ${amount}
${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past due

💳 Pay now: ${invoiceUrl}

- ${config.businessName}`;
      } else {
        message = `📋 PAYMENT ${daysUntilDue === 0 ? 'DUE TODAY' : 'REMINDER'}

Invoice ${invoice.invoice_number}
Amount: ${amount}

💳 Pay now: ${invoiceUrl}

- ${config.businessName}`;
      }

      const success = await sendSMS(invoice.customer_phone, message);
      if (success) {
        await fetch(
          `${supabaseUrl}/rest/v1/invoices?id=eq.${invoice.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
            },
            body: JSON.stringify({
              reminder_count: (invoice.reminder_count || 0) + 1,
              last_reminder_sent_at: new Date().toISOString(),
              status: daysUntilDue < 0 ? 'overdue' : invoice.status,
            }),
          }
        );
        sent++;
      }
    }
  }

  return { invoice_reminders: sent };
}

// ============================================
// MAIN CRON HANDLER
// ============================================
export async function GET(request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🚀 Starting daily cron job...');
  const startTime = Date.now();

  const results = {
    timestamp: new Date().toISOString(),
    daily_route: null,
    reminders: null,
    late_fees: null,
    invoice_reminders: null,
    errors: [],
  };

  // Run all tasks, catching errors individually
  try {
    results.daily_route = await runDailyRoute();
  } catch (e) {
    console.error('Daily route error:', e);
    results.errors.push({ task: 'daily_route', error: e.message });
  }

  try {
    results.reminders = await runReminders();
  } catch (e) {
    console.error('Reminders error:', e);
    results.errors.push({ task: 'reminders', error: e.message });
  }

  try {
    results.late_fees = await runLateFees();
  } catch (e) {
    console.error('Late fees error:', e);
    results.errors.push({ task: 'late_fees', error: e.message });
  }

  try {
    results.invoice_reminders = await runInvoiceReminders();
  } catch (e) {
    console.error('Invoice reminders error:', e);
    results.errors.push({ task: 'invoice_reminders', error: e.message });
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Daily cron complete in ${duration}ms`);

  return NextResponse.json({
    success: true,
    duration_ms: duration,
    ...results,
  });
}
