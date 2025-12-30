// ============================================
// INVOICE REMINDER CRON JOB
// ============================================
// 
// Runs daily at 9am CST
// Sends reminders for:
// - Invoices due in 3 days
// - Invoices due today
// - Overdue invoices (1, 3, 7, 14 days)
//
// Add to vercel.json:
// { "path": "/api/cron/invoice-reminders", "schedule": "0 15 * * *" }
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// SEND SMS
// ============================================
async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from || !to) return false;

  let cleanPhone = to.replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '1' + cleanPhone;
  if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({ To: cleanPhone, From: from, Body: message }),
      }
    );
    return response.ok;
  } catch (e) {
    console.error('SMS error:', e);
    return false;
  }
}

// ============================================
// GET INVOICES NEEDING REMINDERS
// ============================================
async function getInvoicesForReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // Get all unpaid invoices
  const response = await fetch(
    `${supabaseUrl}/rest/v1/invoices?status=neq.paid&status=neq.void&status=neq.draft&order=due_date.asc`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  if (!response.ok) return [];

  const invoices = await response.json();
  const toRemind = [];

  for (const invoice of invoices) {
    if (!invoice.customer_phone || !invoice.due_date) continue;

    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    const daysSinceLastReminder = invoice.last_reminder_sent_at
      ? Math.floor((today - new Date(invoice.last_reminder_sent_at)) / (1000 * 60 * 60 * 24))
      : 999;

    let shouldRemind = false;
    let reminderType = '';

    if (daysUntilDue === 3 && invoice.reminder_count === 0) {
      // 3 days before due - first reminder
      shouldRemind = true;
      reminderType = 'upcoming';
    } else if (daysUntilDue === 0 && daysSinceLastReminder >= 1) {
      // Due today
      shouldRemind = true;
      reminderType = 'due_today';
    } else if (daysUntilDue < 0) {
      // Overdue
      const daysOverdue = Math.abs(daysUntilDue);
      
      // Remind at 1, 3, 7, 14 days overdue (if not reminded in last 2 days)
      if ([1, 3, 7, 14].includes(daysOverdue) && daysSinceLastReminder >= 2) {
        shouldRemind = true;
        reminderType = `overdue_${daysOverdue}`;
      }
      
      // After 14 days, remind every 7 days
      if (daysOverdue > 14 && daysSinceLastReminder >= 7) {
        shouldRemind = true;
        reminderType = 'overdue_recurring';
      }
    }

    if (shouldRemind) {
      toRemind.push({
        ...invoice,
        days_until_due: daysUntilDue,
        reminder_type: reminderType,
      });
    }
  }

  return toRemind;
}

// ============================================
// BUILD REMINDER MESSAGE
// ============================================
function buildReminderMessage(invoice) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';
  const invoiceUrl = `${siteUrl}/invoice/${invoice.invoice_number}`;
  const formatCurrency = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const amount = formatCurrency(invoice.balance_due_cents || invoice.total_cents);
  const dueDate = formatDate(invoice.due_date);

  if (invoice.days_until_due > 0) {
    // Upcoming
    return `📋 UPCOMING PAYMENT

Hi ${invoice.customer_name?.split(' ')[0] || 'there'},

Your invoice ${invoice.invoice_number} for ${amount} is due in ${invoice.days_until_due} days (${dueDate}).

💳 Pay now: ${invoiceUrl}

- ${config.businessName}`;
  } else if (invoice.days_until_due === 0) {
    // Due today
    return `⏰ PAYMENT DUE TODAY

Invoice ${invoice.invoice_number}
Amount: ${amount}

Please pay today to avoid late fees.

💳 Pay now: ${invoiceUrl}

- ${config.businessName}`;
  } else {
    // Overdue
    const daysOverdue = Math.abs(invoice.days_until_due);
    return `⚠️ PAYMENT OVERDUE

Invoice ${invoice.invoice_number}
Amount Due: ${amount}
${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past due

Please pay immediately to avoid service interruption.

💳 Pay now: ${invoiceUrl}

Questions? Call ${config.phone}

- ${config.businessName}`;
  }
}

// ============================================
// UPDATE INVOICE AFTER REMINDER
// ============================================
async function updateInvoiceReminder(invoiceId, reminderCount) {
  const nextReminder = new Date();
  nextReminder.setDate(nextReminder.getDate() + 3);

  await fetch(
    `${supabaseUrl}/rest/v1/invoices?id=eq.${invoiceId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
      body: JSON.stringify({
        reminder_count: reminderCount + 1,
        last_reminder_sent_at: new Date().toISOString(),
        next_reminder_at: nextReminder.toISOString(),
        status: reminderCount > 0 ? 'overdue' : undefined,
      }),
    }
  );
}

// ============================================
// NOTIFY OWNER OF SERIOUSLY OVERDUE
// ============================================
async function notifyOwnerOfOverdue(overdueInvoices) {
  const ownerPhone = process.env.OWNER_PHONE;
  if (!ownerPhone || overdueInvoices.length === 0) return;

  const seriouslyOverdue = overdueInvoices.filter(i => Math.abs(i.days_until_due) >= 7);
  if (seriouslyOverdue.length === 0) return;

  const formatCurrency = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
  const totalOverdue = seriouslyOverdue.reduce((sum, i) => sum + (i.balance_due_cents || i.total_cents), 0);

  const message = `⚠️ OVERDUE INVOICES ALERT

${seriouslyOverdue.length} invoice${seriouslyOverdue.length > 1 ? 's' : ''} 7+ days overdue
Total: ${formatCurrency(totalOverdue)}

${seriouslyOverdue.slice(0, 5).map(i => 
  `• ${i.customer_name}: ${formatCurrency(i.balance_due_cents || i.total_cents)} (${Math.abs(i.days_until_due)}d)`
).join('\n')}${seriouslyOverdue.length > 5 ? `\n...and ${seriouslyOverdue.length - 5} more` : ''}

View all: /admin/invoices`;

  await sendSMS(ownerPhone, message);
}

// ============================================
// CRON HANDLER
// ============================================
export async function GET(request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔔 Running invoice reminder cron...');

  try {
    const invoices = await getInvoicesForReminders();
    console.log(`Found ${invoices.length} invoices needing reminders`);

    let sent = 0;
    let failed = 0;

    for (const invoice of invoices) {
      const message = buildReminderMessage(invoice);
      const success = await sendSMS(invoice.customer_phone, message);

      if (success) {
        await updateInvoiceReminder(invoice.id, invoice.reminder_count || 0);
        sent++;
        console.log(`✅ Reminder sent for ${invoice.invoice_number} (${invoice.reminder_type})`);
      } else {
        failed++;
        console.log(`❌ Failed to send reminder for ${invoice.invoice_number}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Notify owner of seriously overdue invoices
    const overdueInvoices = invoices.filter(i => i.days_until_due < 0);
    await notifyOwnerOfOverdue(overdueInvoices);

    console.log(`🔔 Invoice reminders complete: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: invoices.length,
      sent,
      failed,
    });

  } catch (error) {
    console.error('Invoice reminder cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
