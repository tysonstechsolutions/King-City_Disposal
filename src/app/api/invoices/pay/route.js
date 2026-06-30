// ============================================
// PAY INVOICE API
// ============================================
// Creates a Stripe payment link for an invoice

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// Find an existing Stripe customer id for our customer, or create one and store
// it. Used when the office chooses to save the card on file for a repeat
// customer. Best-effort: never blocks the payment if the lookup/store fails.
async function getOrCreateStripeCustomer(invoice) {
  try {
    let ourCustomer = null;
    if (invoice.customer_id) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/customers?id=eq.${invoice.customer_id}&select=id,stripe_customer_id`,
        { headers: { apikey: getSupabaseKey(), Authorization: `Bearer ${getSupabaseKey()}` } }
      );
      if (res.ok) [ourCustomer] = await res.json();
      if (ourCustomer?.stripe_customer_id) return ourCustomer.stripe_customer_id;
    }

    const params = new URLSearchParams();
    if (invoice.customer_name) params.append('name', invoice.customer_name);
    if (invoice.customer_email) params.append('email', invoice.customer_email);
    if (invoice.customer_phone) params.append('phone', invoice.customer_phone);
    if (invoice.customer_id) params.append('metadata[customer_id]', String(invoice.customer_id));

    const stripeRes = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
      body: params,
    });
    const stripeCustomer = await stripeRes.json();
    if (stripeCustomer.error) {
      console.error('Stripe customer create error:', stripeCustomer.error);
      return null;
    }

    // Remember it on our customer so we reuse the same Stripe customer next time.
    if (invoice.customer_id) {
      await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${invoice.customer_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: getSupabaseKey(),
          Authorization: `Bearer ${getSupabaseKey()}`,
        },
        body: JSON.stringify({ stripe_customer_id: stripeCustomer.id }),
      }).catch(() => {});
    }
    return stripeCustomer.id;
  } catch (e) {
    console.error('getOrCreateStripeCustomer error:', e?.message || e);
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { invoice_id, save_card } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'Invoice ID required' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
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

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    const amountDue = invoice.balance_due_cents || invoice.total_cents;
    if (amountDue <= 0) {
      return NextResponse.json({ error: 'No balance due' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kingcitydisposal.com';

    // Build description from line items
    let lineItems;
    try {
      lineItems = typeof invoice.line_items === 'string' 
        ? JSON.parse(invoice.line_items) 
        : invoice.line_items;
    } catch (e) {
      lineItems = [];
    }

    const description = lineItems.length > 0
      ? lineItems.map(item => item.description).join(', ')
      : `Invoice ${invoice.invoice_number}`;

    // Create Stripe Checkout Session (NOT a Payment Link!)
    // Checkout Sessions properly pass metadata to the webhook
    const checkoutParams = new URLSearchParams({
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': `Invoice ${invoice.invoice_number}`,
      'line_items[0][price_data][product_data][description]': description.substring(0, 500),
      'line_items[0][price_data][unit_amount]': amountDue.toString(),
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'metadata[type]': 'invoice',
      'metadata[invoice_id]': invoice.id.toString(),
      'metadata[invoice_number]': invoice.invoice_number,
      'metadata[customer_name]': invoice.customer_name || '',
      'metadata[customer_phone]': invoice.customer_phone || '',
      'metadata[customer_email]': invoice.customer_email || '',
      'success_url': `${siteUrl}/payment-success?invoice=${invoice.invoice_number}&amount=${amountDue}&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${siteUrl}/invoice/${invoice.invoice_number}?canceled=true`,
      'phone_number_collection[enabled]': 'true',
    });

    // When saving the card on file (office charging a repeat customer), attach
    // the payment to a Stripe Customer and tell Stripe to keep the card for
    // future off-session charges. Otherwise just pre-fill the email.
    let stripeCustomerId = null;
    if (save_card) {
      stripeCustomerId = await getOrCreateStripeCustomer(invoice);
    }
    if (stripeCustomerId) {
      checkoutParams.append('customer', stripeCustomerId);
      checkoutParams.append('payment_intent_data[setup_future_usage]', 'off_session');
    } else if (invoice.customer_email) {
      checkoutParams.append('customer_email', invoice.customer_email);
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

    console.log(`💳 Invoice payment link created: ${stripeData.url}`);

    return NextResponse.json({
      success: true,
      payment_url: stripeData.url,
      payment_link_id: stripeData.id,
      amount: amountDue / 100,
    });

  } catch (error) {
    console.error('Invoice payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
