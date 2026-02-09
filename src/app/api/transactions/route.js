// ============================================
// TRANSACTION API - CREATE & MANAGE RECEIPTS
// ============================================
//
// POST - Create new transaction (called by Stripe webhook)
// GET - Get transaction by receipt number
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../config';
import { requireAdminAuth } from '../../../lib/adminAuth';

// ============================================
// GENERATE RECEIPT NUMBER
// ============================================
async function generateReceiptNumber() {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

  // Call the database function to generate receipt number
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/generate_receipt_number`,
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
    const receiptNumber = await response.json();
    return receiptNumber;
  }

  // Fallback: generate manually if function doesn't exist
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `KCD-${year}-${random}`;
}

// ============================================
// SEND SMS RECEIPT
// ============================================
async function sendReceiptSMS(phone, receiptNumber, amount, description) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from || !phone) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';
  const receiptUrl = `${siteUrl}/receipt/${receiptNumber}`;

  const message = `PAYMENT RECEIVED

Receipt: ${receiptNumber}
Amount: $${(amount / 100).toFixed(2)}

${description}

View Receipt: ${receiptUrl}

Thank you!
- ${config.businessName}`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({ To: phone, From: from, Body: message }),
      }
    );
    return response.ok;
  } catch (e) {
    console.error('Receipt SMS error:', e);
    return false;
  }
}

// ============================================
// CREATE TRANSACTION
// ============================================
export async function POST(request) {
  // Allow internal calls from webhook via internal secret, otherwise require admin auth
  const internalSecret = request.headers.get('x-internal-secret');
  const isInternalCall = internalSecret && internalSecret === process.env.CRON_SECRET;
  if (!isInternalCall) {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  }

  try {
    const body = await request.json();
    const {
      booking_id,
      customer_name,
      customer_phone,
      customer_email,
      amount_cents,
      description,
      type, // 'booking', 'extension', 'overage', 'late_fee', 'custom'
      service_address,
      dumpster_size,
      rental_duration,
      delivery_date,
      stripe_session_id,
      stripe_payment_intent,
      payment_method = 'card',
      send_sms = true,
    } = body;

    if (!amount_cents || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: amount_cents, type' },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receipt_number = await generateReceiptNumber();

    // Create transaction record
    const supabaseUrl = config.supabase.url;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

    const transactionData = {
      receipt_number,
      booking_id: booking_id || null,
      customer_name: customer_name || 'Customer',
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      amount_cents,
      description: description || null,
      type,
      service_address: service_address || null,
      dumpster_size: dumpster_size || null,
      rental_duration: rental_duration || null,
      delivery_date: delivery_date || null,
      stripe_session_id: stripe_session_id || null,
      stripe_payment_intent: stripe_payment_intent || null,
      payment_method,
      status: 'completed',
      paid_at: new Date().toISOString(),
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/transactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(transactionData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transaction creation error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    const [transaction] = await response.json();
    console.log(`Transaction created: ${receipt_number}`);

    // Send SMS receipt
    if (send_sms && customer_phone) {
      const smsDescription = description ||
        (dumpster_size ? `${dumpster_size} - ${rental_duration || 'Rental'}` : type);

      const smsSent = await sendReceiptSMS(
        customer_phone,
        receipt_number,
        amount_cents,
        smsDescription
      );

      if (smsSent) {
        console.log(`Receipt SMS sent to ${customer_phone}`);
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';

    return NextResponse.json({
      success: true,
      transaction,
      receipt_number,
      receipt_url: `${siteUrl}/receipt/${receipt_number}`,
    });

  } catch (error) {
    console.error('Transaction error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// GET TRANSACTION
// ============================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const receiptNumber = searchParams.get('receipt_number');
  const bookingId = searchParams.get('booking_id');

  if (!receiptNumber && !bookingId) {
    return NextResponse.json(
      { error: 'Provide receipt_number or booking_id' },
      { status: 400 }
    );
  }

  try {
    const supabaseUrl = config.supabase.url;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

    let query = '';
    if (receiptNumber) {
      query = `receipt_number=eq.${receiptNumber}`;
    } else {
      query = `booking_id=eq.${bookingId}&order=created_at.desc&limit=1`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/transactions?${query}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        return NextResponse.json(data[0]);
      }
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });

  } catch (error) {
    console.error('Get transaction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
