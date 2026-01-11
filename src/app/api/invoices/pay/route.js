// ============================================
// PAY INVOICE API
// ============================================
// Creates a Stripe payment link for an invoice

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

export async function POST(request) {
  try {
    const body = await request.json();
    const { invoice_id } = body;

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

    // Create Stripe payment link
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
      body: new URLSearchParams({
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `Invoice ${invoice.invoice_number}`,
        'line_items[0][price_data][product_data][description]': description.substring(0, 500),
        'line_items[0][price_data][unit_amount]': amountDue.toString(),
        'line_items[0][quantity]': '1',
        'metadata[type]': 'invoice',
        'metadata[invoice_id]': invoice.id.toString(),
        'metadata[invoice_number]': invoice.invoice_number,
        'metadata[customer_name]': invoice.customer_name || '',
        'metadata[customer_phone]': invoice.customer_phone || '',
        'after_completion[type]': 'redirect',
        'after_completion[redirect][url]': `${siteUrl}/payment-success?invoice=${invoice.invoice_number}`,
        'phone_number_collection[enabled]': 'true',
      }),
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
