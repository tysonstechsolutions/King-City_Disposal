// ============================================
// STRIPE MANUAL CHARGE API - Charge card directly
// ============================================

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { config } from '../../../../config'
import { requireAdminAuth } from '../../../../lib/adminAuth'

export const dynamic = 'force-dynamic'

// Initialize Stripe lazily to avoid build-time crash when env var is missing.
// Explicit guard so a missing key surfaces as an actionable error in the
// admin UI ("Stripe is not configured on the server") instead of a generic
// "Cannot read property" SDK crash.
let _stripe;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set on the server. Add it to Vercel environment variables.');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// POST - Create a PaymentIntent for manual card entry
export async function POST(request) {
  const auth = await requireAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { amount_cents, customer_name, customer_email, invoice_id, description, idempotency_key } = await request.json()

    if (!amount_cents || amount_cents < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      )
    }
    // Cap to a sane max so a tampered admin request can't accidentally charge
    // a card $1M. Real invoices are well under this.
    if (amount_cents > 1_000_000) {
      return NextResponse.json(
        { error: 'Amount exceeds maximum of $10,000' },
        { status: 400 }
      )
    }

    // Idempotency key prevents Stripe from creating duplicate PaymentIntents
    // when the network retries this request. Frontend can pass one (e.g., a
    // stable hash of invoice_id+amount); otherwise we synthesize one from
    // the invoice and amount so retries within a few seconds collapse safely.
    const stableKey = idempotency_key
      || (invoice_id ? `inv_${invoice_id}_${amount_cents}_${Date.now() - (Date.now() % 60000)}` : undefined)

    // Create a PaymentIntent
    const paymentIntent = await getStripe().paymentIntents.create(
      {
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
      },
      stableKey ? { idempotencyKey: stableKey } : undefined
    )

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
