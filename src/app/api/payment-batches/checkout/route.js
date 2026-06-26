// ============================================
// PAYMENT BATCH CHECKOUT (public)
// ============================================
// POST /api/payment-batches/checkout  { token }
// Re-reads the batch's invoices live, sums current balances (skipping any paid
// separately since the link was created), and creates one Stripe Checkout Session
// for the total. The webhook (type=invoice_batch) marks every invoice paid.

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

const balanceOf = (inv) =>
  Math.max(0, (inv.total_cents || 0) - (inv.amount_paid_cents || 0));

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // Load batch
    const batchRes = await fetch(
      `${supabaseUrl}/rest/v1/payment_batches?token=eq.${encodeURIComponent(token)}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!batchRes.ok) {
      return NextResponse.json({ error: 'Failed to load batch' }, { status: 500 });
    }

    const [batch] = await batchRes.json();
    if (!batch) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    if (batch.status === 'paid') {
      return NextResponse.json({ error: 'This batch is already paid' }, { status: 400 });
    }

    // Re-read invoices live so we only charge what is still owed
    const ids = Array.isArray(batch.invoice_ids) ? batch.invoice_ids : [];
    const idList = ids.map((id) => String(id)).join(',');
    const invRes = await fetch(
      `${supabaseUrl}/rest/v1/invoices?id=in.(${idList})`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!invRes.ok) {
      return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
    }

    const invoices = await invRes.json();
    const stillDue = invoices.filter((inv) => balanceOf(inv) > 0 && inv.status !== 'void');
    const amountDue = stillDue.reduce((sum, inv) => sum + balanceOf(inv), 0);

    if (amountDue <= 0) {
      return NextResponse.json({ error: 'No balance due — these invoices are already paid' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kingcitydisposal.com';
    const invoiceNumbers = stillDue.map((inv) => inv.invoice_number).join(', ');
    const description = `${stillDue.length} invoices: ${invoiceNumbers}`.substring(0, 500);

    const checkoutParams = new URLSearchParams({
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]':
        `${config.businessName} — ${stillDue.length} Invoices`,
      'line_items[0][price_data][product_data][description]': description,
      'line_items[0][price_data][unit_amount]': amountDue.toString(),
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'metadata[type]': 'invoice_batch',
      'metadata[batch_token]': batch.token,
      'metadata[invoice_ids]': JSON.stringify(stillDue.map((inv) => inv.id)),
      'metadata[customer_name]': batch.customer_name || '',
      'metadata[customer_phone]': batch.customer_phone || '',
      'metadata[customer_email]': batch.customer_email || '',
      'success_url': `${siteUrl}/payment-success?batch=${batch.token}&amount=${amountDue}&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${siteUrl}/pay/${batch.token}?canceled=true`,
      'phone_number_collection[enabled]': 'true',
    });

    if (batch.customer_email) {
      checkoutParams.append('customer_email', batch.customer_email);
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
      body: checkoutParams,
    });

    const stripeData = await stripeResponse.json();

    if (stripeData.error) {
      console.error('Stripe error:', stripeData.error);
      return NextResponse.json({ error: stripeData.error.message }, { status: 400 });
    }

    console.log(`💳 Batch payment link created: ${batch.token} — $${(amountDue / 100).toFixed(2)}`);

    return NextResponse.json({
      success: true,
      payment_url: stripeData.url,
      amount: amountDue / 100,
    });
  } catch (error) {
    console.error('Batch checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
