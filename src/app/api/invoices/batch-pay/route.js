// ============================================
// BATCH PAY API (admin)
// ============================================
// Creates a "payment batch" covering several existing unpaid invoices for ONE
// customer, then texts the customer a single /pay/<token> link. The originals are
// not duplicated — when the batch is paid, the webhook marks each invoice paid.

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { config } from '../../../../config';
import { requireAdminAuth } from '../../../../lib/adminAuth';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// Inline SMS (same pattern as invoices/send)
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

const balanceOf = (inv) =>
  Math.max(0, (inv.total_cents || 0) - (inv.amount_paid_cents || 0));

export async function POST(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { invoice_ids } = body;

    if (!Array.isArray(invoice_ids) || invoice_ids.length < 2) {
      return NextResponse.json(
        { error: 'Select at least two invoices' },
        { status: 400 }
      );
    }

    // Fetch the selected invoices
    const idList = invoice_ids.map((id) => String(id)).join(',');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?id=in.(${idList})`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
    }

    const invoices = await response.json();

    if (invoices.length !== invoice_ids.length) {
      return NextResponse.json({ error: 'Some invoices were not found' }, { status: 404 });
    }

    // All must be unpaid with a real balance
    const unpayable = invoices.filter(
      (inv) => inv.status === 'paid' || inv.status === 'void' || balanceOf(inv) <= 0
    );
    if (unpayable.length > 0) {
      return NextResponse.json(
        { error: `Some selected invoices are already paid or have no balance` },
        { status: 400 }
      );
    }

    // Must be a single customer (one phone to text, one name on the receipt).
    // Group by customer_id when present, else by normalized name.
    const customerKey = (inv) =>
      inv.customer_id != null
        ? `id:${inv.customer_id}`
        : `name:${(inv.customer_name || '').trim().toLowerCase()}`;
    const keys = new Set(invoices.map(customerKey));
    if (keys.size > 1) {
      return NextResponse.json(
        { error: 'All invoices must belong to the same customer' },
        { status: 400 }
      );
    }

    const total_cents = invoices.reduce((sum, inv) => sum + balanceOf(inv), 0);

    // Prefer a record that actually has contact info for delivery
    const withPhone = invoices.find((inv) => inv.customer_phone) || invoices[0];
    const withEmail = invoices.find((inv) => inv.customer_email) || invoices[0];

    const token = crypto.randomBytes(9).toString('base64url'); // ~12 url-safe chars

    const batchData = {
      token,
      customer_name: withPhone.customer_name || withEmail.customer_name || '',
      customer_phone: withPhone.customer_phone || '',
      customer_email: withEmail.customer_email || '',
      invoice_ids: invoices.map((inv) => inv.id),
      total_cents,
      status: 'pending',
    };

    const insert = await fetch(`${supabaseUrl}/rest/v1/payment_batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(batchData),
    });

    if (!insert.ok) {
      const errText = await insert.text();
      console.error('Batch creation failed:', errText);
      return NextResponse.json(
        { error: 'Failed to create payment batch', details: errText },
        { status: 500 }
      );
    }

    const [batch] = await insert.json();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kingcitydisposal.com';
    const payUrl = `${siteUrl}/pay/${token}`;
    const amountDisplay = `$${(total_cents / 100).toFixed(2)}`;

    // Text the customer the combined link
    let smsSent = false;
    if (batch.customer_phone) {
      const message = `📋 PAYMENT FROM ${config.businessName.toUpperCase()}

You have ${invoices.length} invoices ready to pay together.
Total Due: ${amountDisplay}

💳 Pay All Now: ${payUrl}

Questions? Reply to this text or call ${config.billingPhone}

- ${config.businessName}`;
      smsSent = await sendSMS(batch.customer_phone, message);
    }

    console.log(
      `🔗 Payment batch ${token} created: ${invoices.length} invoices, ${amountDisplay}, SMS: ${smsSent}`
    );

    return NextResponse.json({
      success: true,
      token,
      pay_url: payUrl,
      total_cents,
      invoice_count: invoices.length,
      sms_sent: smsSent,
      customer_phone: batch.customer_phone || null,
    });
  } catch (error) {
    console.error('Batch pay error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
