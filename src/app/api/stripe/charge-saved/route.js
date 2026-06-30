// ============================================
// CHARGE A SAVED CARD (one-click, off-session)
// ============================================
// Lets the office charge a repeat customer's saved card with one click — no
// card re-entry and no customer present. Runs entirely server-side, so the
// browser Tracking Prevention / ad-blocker that blocks the embedded Stripe form
// never comes into play.
//
// Requires the customer to already have a card on file (saved during a previous
// "Charge Card" hosted checkout — see /api/invoices/pay save_card).

import { NextResponse } from 'next/server'
import { config } from '../../../../config'
import { requireAdminAuth } from '../../../../lib/adminAuth'
import {
  findInvoice,
  markInvoicePaid,
  recordTransaction,
  getCustomer,
  notifyInvoicePaid,
} from '../../../../lib/stripeBilling'

export const dynamic = 'force-dynamic'

const PLATFORM_FEE_PERCENT = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '0')

async function stripePost(path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    },
    body: params,
  })
  return res.json()
}

// Find the card to charge: the saved default, or the customer's first card.
async function resolvePaymentMethod(customer) {
  if (customer.stripe_payment_method_id) return customer.stripe_payment_method_id
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/payment_methods?customer=${encodeURIComponent(customer.stripe_customer_id)}&type=card&limit=1`,
      { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    )
    const data = await res.json()
    return data?.data?.[0]?.id || null
  } catch (e) {
    return null
  }
}

export async function POST(request) {
  const auth = await requireAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    const { invoice_id, amount_cents } = await request.json()
    if (!invoice_id) {
      return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })
    }

    const invoice = await findInvoice({ invoiceId: invoice_id })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
    }

    if (!invoice.customer_id) {
      return NextResponse.json({ error: 'This invoice has no linked customer, so there is no card on file. Use "Charge Card" to take a payment.' }, { status: 400 })
    }
    const customer = await getCustomer(invoice.customer_id)
    if (!customer?.stripe_customer_id) {
      return NextResponse.json({ error: 'No card on file for this customer yet. Use "Charge Card" once to save their card, then you can charge it with one click.' }, { status: 400 })
    }

    const paymentMethodId = await resolvePaymentMethod(customer)
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'No saved card found for this customer. Use "Charge Card" to add one.' }, { status: 400 })
    }

    const balanceDue = invoice.balance_due_cents != null
      ? invoice.balance_due_cents
      : (invoice.total_cents || 0) - (invoice.amount_paid_cents || 0)
    const chargeCents = Math.round(amount_cents || balanceDue)
    if (!chargeCents || chargeCents < 50) {
      return NextResponse.json({ error: 'Amount must be at least $0.50' }, { status: 400 })
    }

    const params = new URLSearchParams({
      amount: String(chargeCents),
      currency: 'usd',
      customer: customer.stripe_customer_id,
      payment_method: paymentMethodId,
      off_session: 'true',
      confirm: 'true',
      description: `Invoice ${invoice.invoice_number} - ${config.businessName}`,
    })
    if (invoice.customer_email) params.append('receipt_email', invoice.customer_email)
    params.append('metadata[type]', 'invoice')
    params.append('metadata[invoice_id]', String(invoice.id))
    params.append('metadata[invoice_number]', invoice.invoice_number || '')
    params.append('metadata[source]', 'admin_saved_card')

    // Route funds through Connect if the platform is configured for it.
    const connectedAccountId = process.env.STRIPE_CONNECT_ACCOUNT_ID
    if (connectedAccountId) {
      params.append('transfer_data[destination]', connectedAccountId)
      const platformFee = PLATFORM_FEE_PERCENT > 0 ? Math.round(chargeCents * (PLATFORM_FEE_PERCENT / 100)) : 0
      if (platformFee > 0) params.append('application_fee_amount', String(platformFee))
    }

    const pi = await stripePost('payment_intents', params)

    if (pi.error) {
      // Off-session charges can be declined or need authentication (3-D Secure),
      // which can't be completed without the customer. Surface a clear message.
      const code = pi.error.code || ''
      if (code === 'authentication_required') {
        return NextResponse.json({
          error: 'The bank requires the customer to verify this payment (3-D Secure). Send them a payment link instead so they can approve it.',
          needs_customer: true,
        }, { status: 402 })
      }
      return NextResponse.json({ error: pi.error.message || 'Card was declined' }, { status: 402 })
    }

    if (pi.status !== 'succeeded') {
      return NextResponse.json({
        error: `Payment not completed (status: ${pi.status}). The card may need customer verification — send a payment link instead.`,
        status: pi.status,
        needs_customer: true,
      }, { status: 402 })
    }

    // Paid — mark the invoice and record the receipt (idempotent via pi id).
    const { wasAlreadyPaid, invoice: updated } = await markInvoicePaid(invoice, {
      amountCents: chargeCents,
      paymentIntentId: pi.id,
      paymentMethod: 'card',
    })

    const txResult = await recordTransaction({
      invoice_id: invoice.id,
      booking_id: invoice.booking_id || null,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      customer_email: invoice.customer_email,
      amount_cents: chargeCents,
      description: `Invoice ${invoice.invoice_number}`,
      type: 'invoice',
      service_address: invoice.service_address || null,
      stripe_session_id: `pi_${pi.id}`,
      stripe_payment_intent: pi.id,
      payment_method: 'card',
      send_sms: !!invoice.customer_phone,
    })

    if (!wasAlreadyPaid) {
      await notifyInvoicePaid(updated || invoice, chargeCents)
    }

    return NextResponse.json({
      success: true,
      amount_cents: chargeCents,
      invoice_number: invoice.invoice_number,
      receipt_number: txResult?.receipt_number || null,
    })
  } catch (error) {
    console.error('charge-saved error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
