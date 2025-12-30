// ============================================
// SEND INVOICE API
// ============================================
// Sends invoice link via SMS (and optionally email)

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

  // Clean phone number
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
// SEND INVOICE
// ============================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { invoice_id, reminder = false } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'Invoice ID required' },
        { status: 400 }
      );
    }

    // Get invoice
    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?id=eq.${invoice_id}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const [invoice] = await response.json();
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';
    const invoiceUrl = `${siteUrl}/invoice/${invoice.invoice_number}`;

    const formatCurrency = (cents) => `$${(cents / 100).toFixed(2)}`;
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Build message
    let message;
    if (reminder) {
      const daysOverdue = invoice.due_date 
        ? Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysOverdue > 0) {
        message = `⚠️ PAYMENT OVERDUE

Invoice: ${invoice.invoice_number}
Amount Due: ${formatCurrency(invoice.balance_due_cents || invoice.total_cents)}

Your payment is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.

💳 Pay Now: ${invoiceUrl}

Questions? Reply to this text or call ${config.phone}

- ${config.businessName}`;
      } else {
        message = `📋 PAYMENT REMINDER

Invoice: ${invoice.invoice_number}
Amount Due: ${formatCurrency(invoice.balance_due_cents || invoice.total_cents)}
Due Date: ${formatDate(invoice.due_date)}

💳 Pay Now: ${invoiceUrl}

- ${config.businessName}`;
      }
    } else {
      message = `📋 INVOICE FROM ${config.businessName.toUpperCase()}

Invoice: ${invoice.invoice_number}
Amount: ${formatCurrency(invoice.total_cents)}
Due: ${formatDate(invoice.due_date)}

${invoice.service_address ? `📍 ${invoice.service_address}\n` : ''}${invoice.dumpster_size ? `🚛 ${invoice.dumpster_size}\n` : ''}
💳 View & Pay: ${invoiceUrl}

Questions? Reply to this text or call ${config.phone}

- ${config.businessName}`;
    }

    // Send SMS
    let smsSent = false;
    if (invoice.customer_phone) {
      smsSent = await sendSMS(invoice.customer_phone, message);
    }

    // Update invoice status
    const updateData = {
      status: invoice.status === 'draft' ? 'sent' : invoice.status,
      sent_at: invoice.sent_at || new Date().toISOString(),
    };

    if (reminder) {
      updateData.reminder_count = (invoice.reminder_count || 0) + 1;
      updateData.last_reminder_sent_at = new Date().toISOString();
      
      // Schedule next reminder (3 days later)
      const nextReminder = new Date();
      nextReminder.setDate(nextReminder.getDate() + 3);
      updateData.next_reminder_at = nextReminder.toISOString();
    }

    await fetch(
      `${supabaseUrl}/rest/v1/invoices?id=eq.${invoice_id}`,
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

    console.log(`✅ Invoice ${invoice.invoice_number} ${reminder ? 'reminder' : ''} sent via SMS: ${smsSent}`);

    return NextResponse.json({
      success: true,
      sms_sent: smsSent,
      invoice_number: invoice.invoice_number,
      invoice_url: invoiceUrl,
    });

  } catch (error) {
    console.error('Send invoice error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
