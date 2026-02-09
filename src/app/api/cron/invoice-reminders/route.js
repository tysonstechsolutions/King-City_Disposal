// ============================================
// INVOICE REMINDER CRON JOB
// ============================================
//
// Runs daily at 9am CST
// Sends reminders for:
// - Invoices due in 3 days
// - Invoices due today
// - Overdue invoices (at 30 days from date_set, then 1, 3, 7, 14 days after)
// - Sends BOTH SMS and email for 30+ day overdue invoices
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
// SEND EMAIL (via Resend or fallback)
// ============================================
async function sendEmail(to, subject, htmlContent, textContent) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey || !to) return false;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `King City Disposal Billing <billing@${process.env.RESEND_DOMAIN || 'kingcitydisposal.com'}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    });
    return response.ok;
  } catch (e) {
    console.error('Email error:', e);
    return false;
  }
}

// ============================================
// GET INVOICES NEEDING REMINDERS
// ============================================
async function getInvoicesForReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    // Need phone OR email to send reminders
    if (!invoice.customer_phone && !invoice.customer_email) continue;

    // Use date_set if available, otherwise use due_date or invoice_date
    // Late fees apply 30 days after date_set
    const referenceDate = invoice.date_set
      ? new Date(invoice.date_set)
      : (invoice.due_date ? new Date(invoice.due_date) : new Date(invoice.invoice_date || invoice.created_at));
    referenceDate.setHours(0, 0, 0, 0);

    // Calculate days since the reference date (date_set or due_date)
    const daysSinceReference = Math.floor((today - referenceDate) / (1000 * 60 * 60 * 24));

    const daysSinceLastReminder = invoice.last_reminder_sent_at
      ? Math.floor((today - new Date(invoice.last_reminder_sent_at)) / (1000 * 60 * 60 * 24))
      : 999;

    let shouldRemind = false;
    let reminderType = '';
    let sendBothSmsAndEmail = false;

    // For invoices with date_set: reminder kicks in at 30 days
    if (invoice.date_set) {
      if (daysSinceReference === 30) {
        // Exactly 30 days after date_set - send SMS AND email
        shouldRemind = true;
        reminderType = 'overdue_30_day';
        sendBothSmsAndEmail = true;
      } else if (daysSinceReference > 30) {
        const daysOverdue = daysSinceReference - 30;
        // After 30 days, remind at 1, 3, 7, 14 days overdue
        if ([1, 3, 7, 14].includes(daysOverdue) && daysSinceLastReminder >= 2) {
          shouldRemind = true;
          reminderType = `overdue_${daysOverdue}_after_30`;
          sendBothSmsAndEmail = true;
        }
        // Then every 7 days after 14 days overdue
        if (daysOverdue > 14 && daysSinceLastReminder >= 7) {
          shouldRemind = true;
          reminderType = 'overdue_recurring';
          sendBothSmsAndEmail = true;
        }
      }
    } else if (invoice.due_date) {
      // Traditional due date logic
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilDue === 3 && invoice.reminder_count === 0) {
        shouldRemind = true;
        reminderType = 'upcoming';
      } else if (daysUntilDue === 0 && daysSinceLastReminder >= 1) {
        shouldRemind = true;
        reminderType = 'due_today';
      } else if (daysUntilDue < 0) {
        const daysOverdue = Math.abs(daysUntilDue);
        // At 30 days overdue, send both SMS and email
        if (daysOverdue === 30) {
          shouldRemind = true;
          reminderType = 'overdue_30_day';
          sendBothSmsAndEmail = true;
        } else if ([1, 3, 7, 14].includes(daysOverdue) && daysSinceLastReminder >= 2) {
          shouldRemind = true;
          reminderType = `overdue_${daysOverdue}`;
        }
        if (daysOverdue > 30 && daysSinceLastReminder >= 7) {
          shouldRemind = true;
          reminderType = 'overdue_recurring';
          sendBothSmsAndEmail = true;
        }
      }
    }

    if (shouldRemind) {
      toRemind.push({
        ...invoice,
        days_since_reference: daysSinceReference,
        reminder_type: reminderType,
        send_both: sendBothSmsAndEmail,
      });
    }
  }

  return toRemind;
}

// ============================================
// BUILD REMINDER MESSAGE (SMS)
// ============================================
function buildReminderMessage(invoice) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';
  const invoiceUrl = `${siteUrl}/invoice/${invoice.invoice_number}`;
  const formatCurrency = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  const amount = formatCurrency(invoice.balance_due_cents || invoice.total_cents);
  const daysOverdue = invoice.days_since_reference >= 30 ? invoice.days_since_reference - 30 : invoice.days_since_reference;

  if (invoice.reminder_type === 'upcoming') {
    return `📋 UPCOMING PAYMENT

Hi ${invoice.customer_name?.split(' ')[0] || 'there'},

Your invoice ${invoice.invoice_number} for ${amount} is due soon.

💳 Pay now: ${invoiceUrl}

- ${config.businessName}`;
  } else if (invoice.reminder_type === 'due_today') {
    return `⏰ PAYMENT DUE TODAY

Invoice ${invoice.invoice_number}
Amount: ${amount}

Please pay today to avoid late fees.

💳 Pay now: ${invoiceUrl}

- ${config.businessName}`;
  } else {
    // Overdue (30+ days from date_set)
    return `⚠️ PAYMENT OVERDUE

Invoice ${invoice.invoice_number}
Amount Due: ${amount}
${daysOverdue > 0 ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past due` : 'Payment is past due'}

Please pay immediately to avoid late fees and service interruption.

💳 Pay now: ${invoiceUrl}

Questions? Call ${config.phone}

- ${config.businessName}`;
  }
}

// ============================================
// BUILD REMINDER EMAIL
// ============================================
function buildReminderEmail(invoice) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';
  const invoiceUrl = `${siteUrl}/invoice/${invoice.invoice_number}`;
  const formatCurrency = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  const amount = formatCurrency(invoice.balance_due_cents || invoice.total_cents);
  const daysOverdue = invoice.days_since_reference >= 30 ? invoice.days_since_reference - 30 : invoice.days_since_reference;

  const subject = `Payment Reminder - Invoice ${invoice.invoice_number} - ${amount} Due`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc2626; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px;">${config.businessName}</h1>
      <p style="margin: 0; opacity: 0.9;">Payment Reminder</p>
    </div>

    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #dc2626; font-weight: 600;">⚠️ Payment Overdue${daysOverdue > 0 ? ` - ${daysOverdue} Day${daysOverdue > 1 ? 's' : ''}` : ''}</p>
      </div>

      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Hi ${invoice.customer_name?.split(' ')[0] || 'there'},
      </p>

      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        This is a reminder that your invoice <strong>${invoice.invoice_number}</strong> for <strong style="color: #dc2626;">${amount}</strong> is past due.
      </p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Amount Due:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">${amount}</td>
          </tr>
          ${invoice.service_address ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Service Address:</td>
            <td style="padding: 8px 0; text-align: right;">${invoice.service_address}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Please pay as soon as possible to avoid additional late fees.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${invoiceUrl}" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 18px;">
          Pay Now
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #333;">Contact Information</h3>
        <p style="margin: 0; color: #666;">King City Disposal Operations</p>
        <p style="margin: 4px 0 0 0;"><a href="tel:6182318481" style="color: #dc2626; font-weight: 600; text-decoration: none;">(618) 231-8481</a></p>
        <p style="margin: 12px 0 0 0; color: #666;">King City Disposal Billing</p>
        <p style="margin: 4px 0 0 0;"><a href="tel:6182318380" style="color: #dc2626; font-weight: 600; text-decoration: none;">(618) 231-8380</a></p>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        If you have already sent payment, please disregard this reminder. Thank you!
      </p>
    </div>

    <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
      <p style="margin: 0;">${config.businessName}</p>
      <p style="margin: 4px 0 0 0;">${config.phone} • ${config.email || 'info@kingcitydisposal.com'}</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
PAYMENT REMINDER - ${config.businessName}

Invoice: ${invoice.invoice_number}
Amount Due: ${amount}
${daysOverdue > 0 ? `${daysOverdue} days past due` : 'Payment is past due'}

Hi ${invoice.customer_name?.split(' ')[0] || 'there'},

This is a reminder that your invoice ${invoice.invoice_number} for ${amount} is past due.

Pay now: ${invoiceUrl}

Please pay as soon as possible to avoid additional late fees.

Contact Information:
King City Disposal Operations: (618) 231-8481
King City Disposal Billing: (618) 231-8380

If you have already sent payment, please disregard this reminder.

Thank you,
${config.businessName}
${config.phone}
  `.trim();

  return { subject, html, text };
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

  const seriouslyOverdue = overdueInvoices.filter(i => i.days_since_reference >= 37);
  if (seriouslyOverdue.length === 0) return;

  const formatCurrency = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
  const totalOverdue = seriouslyOverdue.reduce((sum, i) => sum + (i.balance_due_cents || i.total_cents), 0);

  const message = `⚠️ OVERDUE INVOICES ALERT

${seriouslyOverdue.length} invoice${seriouslyOverdue.length > 1 ? 's' : ''} 7+ days overdue
Total: ${formatCurrency(totalOverdue)}

${seriouslyOverdue.slice(0, 5).map(i =>
  `• ${i.customer_name}: ${formatCurrency(i.balance_due_cents || i.total_cents)} (${i.days_since_reference - 30}d overdue)`
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
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔔 Running invoice reminder cron...');

  try {
    const invoices = await getInvoicesForReminders();
    console.log(`Found ${invoices.length} invoices needing reminders`);

    let smsSent = 0;
    let emailSent = 0;
    let failed = 0;

    for (const invoice of invoices) {
      let reminderSent = false;

      // Send SMS if phone available
      if (invoice.customer_phone) {
        const message = buildReminderMessage(invoice);
        const smsSuccess = await sendSMS(invoice.customer_phone, message);
        if (smsSuccess) {
          smsSent++;
          reminderSent = true;
          console.log(`✅ SMS sent for ${invoice.invoice_number} (${invoice.reminder_type})`);
        } else {
          console.log(`❌ SMS failed for ${invoice.invoice_number}`);
        }
      }

      // Send email if:
      // 1. Email is available AND
      // 2. Either send_both flag is set (30+ days overdue) OR no phone available
      if (invoice.customer_email && (invoice.send_both || !invoice.customer_phone)) {
        const { subject, html, text } = buildReminderEmail(invoice);
        const emailSuccess = await sendEmail(invoice.customer_email, subject, html, text);
        if (emailSuccess) {
          emailSent++;
          reminderSent = true;
          console.log(`✅ Email sent for ${invoice.invoice_number} (${invoice.reminder_type})`);
        } else {
          console.log(`❌ Email failed for ${invoice.invoice_number}`);
        }
      }

      if (reminderSent) {
        await updateInvoiceReminder(invoice.id, invoice.reminder_count || 0);
      } else {
        failed++;
        console.log(`❌ No reminder sent for ${invoice.invoice_number} - no valid contact`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Notify owner of seriously overdue invoices (30+ days)
    const overdueInvoices = invoices.filter(i => i.days_since_reference >= 30);
    await notifyOwnerOfOverdue(overdueInvoices);

    console.log(`🔔 Invoice reminders complete: ${smsSent} SMS sent, ${emailSent} emails sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: invoices.length,
      smsSent,
      emailSent,
      failed,
    });

  } catch (error) {
    console.error('Invoice reminder cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
