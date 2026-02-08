// ============================================
// STRIPE MANUAL CHARGE API - Charge card directly
// ============================================

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { config } from '../../../../config'

export const dynamic = 'force-dynamic'

// Initialize Stripe lazily to avoid build-time crash when env var is missing
let _stripe;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// POST - Create a PaymentIntent for manual card entry
export async function POST(request) {
  try {
    const { amount_cents, customer_name, customer_email, invoice_id, description } = await request.json()

    if (!amount_cents || amount_cents < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      )
    }

    // Create a PaymentIntent
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      description: description || `Invoice payment - ${config.businessName}`,
      metadata: {
        invoice_id: invoice_id || '',
        customer_name: customer_name || '',
        source: 'admin_manual_charge',
      },
      receipt_email: customer_email || undefined,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Stripe PaymentIntent error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// GET - Check payment status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('payment_intent_id')

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'payment_intent_id required' },
        { status: 400 }
      )
    }

    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId)

    return NextResponse.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      receipt_url: paymentIntent.charges?.data?.[0]?.receipt_url || null,
    })
  } catch (error) {
    console.error('Stripe retrieve error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
