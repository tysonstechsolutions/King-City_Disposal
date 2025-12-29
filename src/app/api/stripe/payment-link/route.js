// ============================================
// STRIPE PAYMENT LINK GENERATOR
// ============================================
// 
// Creates instant Stripe payment links for:
// - New bookings (from chatbot)
// - Rental extensions (from SMS)
// - Custom invoices
//
// Returns a URL the customer can tap to pay instantly.
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

// ============================================
// CREATE PAYMENT LINK
// ============================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      type,           // 'booking' | 'extension' | 'custom'
      bookingId,      // Required for booking/extension
      amount,         // Amount in dollars (for custom)
      description,    // Description (for custom)
      customerName,
      customerEmail,
      customerPhone,
      dumpsterSize,
      rentalDuration,
      address,
      extraDays,      // For extensions
    } = body;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    let lineItems;
    let metadata = { source: 'king-city-disposal' };

    // ========================================
    // NEW BOOKING PAYMENT
    // ========================================
    if (type === 'booking') {
      const dumpster = config.dumpsters.find(d => d.id === dumpsterSize);
      if (!dumpster) {
        return NextResponse.json({ error: 'Invalid dumpster size' }, { status: 400 });
      }

      const price = dumpster.pricing[rentalDuration];
      if (!price) {
        return NextResponse.json({ error: 'Invalid rental duration' }, { status: 400 });
      }

      const durationLabel = rentalDuration === '3-day' ? '3-Day' : '7-Day';

      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${dumpster.name} - ${durationLabel} Rental`,
            description: `Dumpster rental at ${address}. Includes ${dumpster.weightIncluded}.`,
          },
          unit_amount: price * 100, // Stripe uses cents
        },
        quantity: 1,
      }];

      metadata = {
        ...metadata,
        type: 'booking',
        booking_id: bookingId?.toString() || '',
        dumpster_size: dumpsterSize,
        rental_duration: rentalDuration,
        address: address,
        customer_name: customerName,
        customer_phone: customerPhone,
      };
    }

    // ========================================
    // EXTENSION PAYMENT
    // ========================================
    else if (type === 'extension') {
      const dumpster = config.dumpsters.find(d => d.id === dumpsterSize);
      const dailyRate = dumpster?.dailyExtension || 20;
      const days = extraDays || 3;
      const total = dailyRate * days;

      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${days}-Day Rental Extension`,
            description: `Extension for ${dumpster?.name || 'dumpster'} at ${address}`,
          },
          unit_amount: total * 100,
        },
        quantity: 1,
      }];

      metadata = {
        ...metadata,
        type: 'extension',
        booking_id: bookingId?.toString() || '',
        extension_days: days.toString(),
      };
    }

    // ========================================
    // CUSTOM PAYMENT (Overages, etc.)
    // ========================================
    else if (type === 'custom') {
      if (!amount || !description) {
        return NextResponse.json({ error: 'Amount and description required' }, { status: 400 });
      }

      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: description,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }];

      metadata = {
        ...metadata,
        type: 'custom',
        booking_id: bookingId?.toString() || '',
        description: description,
      };
    }

    else {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    // ========================================
    // CREATE STRIPE PAYMENT LINK
    // ========================================
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price_data][currency]': lineItems[0].price_data.currency,
        'line_items[0][price_data][product_data][name]': lineItems[0].price_data.product_data.name,
        'line_items[0][price_data][product_data][description]': lineItems[0].price_data.product_data.description || '',
        'line_items[0][price_data][unit_amount]': lineItems[0].price_data.unit_amount.toString(),
        'line_items[0][quantity]': '1',
        'metadata[type]': metadata.type,
        'metadata[booking_id]': metadata.booking_id || '',
        'metadata[source]': metadata.source,
        'after_completion[type]': 'redirect',
        'after_completion[redirect][url]': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com'}/payment-success?booking=${bookingId || ''}`,
        'phone_number_collection[enabled]': 'true',
      }),
    });

    const stripeData = await stripeResponse.json();

    if (stripeData.error) {
      console.error('Stripe error:', stripeData.error);
      return NextResponse.json({ error: stripeData.error.message }, { status: 400 });
    }

    console.log(`💳 Payment link created: ${stripeData.url}`);

    return NextResponse.json({
      success: true,
      paymentLink: stripeData.url,
      paymentLinkId: stripeData.id,
      amount: lineItems[0].price_data.unit_amount / 100,
    });

  } catch (error) {
    console.error('Payment link error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// GET PAYMENT LINK STATUS
// ============================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const linkId = searchParams.get('id');

  if (!linkId) {
    return NextResponse.json({ error: 'Payment link ID required' }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/payment_links/${linkId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
