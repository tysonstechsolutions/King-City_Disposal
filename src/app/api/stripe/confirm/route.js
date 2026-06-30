// ============================================
// STRIPE PAYMENT CONFIRMATION (FALLBACK)
// ============================================
// Called by the /payment-success page after a customer returns from Stripe
// Checkout. It asks Stripe directly whether the session was paid and, if so,
// marks the invoice(s) paid and records the receipt.
//
// Why this exists: marking invoices paid normally relies on the Stripe
// `checkout.session.completed` webhook. If that webhook isn't configured (or
// is briefly down), invoices would stay "unpaid" even though the customer paid.
// This endpoint is a safety net that verifies the payment server-side and is
// fully idempotent with the webhook (shared dedup on session id / paid status),
// so a payment is never recorded twice.

import { NextResponse } from 'next/server'
import { config } from '../../../../config'
import {
  findInvoice,
  markInvoicePaid,
  recordTransaction,
  saveCardOnCustomer,
  notifyInvoicePaid,
} from '../../../../lib/stripeBilling'

export const dynamic = 'force-dynamic'

const supabaseUrl = config.supabase.url
const getServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey

async function retrieveSession(sessionId) {
  const params = new URLSearchParams()
  params.append('expand[]', 'payment_intent')
  params.append('expand[]', 'payment_intent.payment_method')
  params.append('expand[]', 'customer')
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
  )
  return res.json()
}

// If Stripe saved the card during this checkout (setup_future_usage), persist
// it on our customer so the office can charge it one-click later.
async function maybeSaveCard(session, ourCustomerId) {
  try {
    if (!ourCustomerId) return
    const pi = session.payment_intent
    if (!pi || typeof pi === 'string') return
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    const pm = pi.payment_method
    if (!stripeCustomerId || !pm || typeof pm === 'string') return
    if (pm.type !== 'card' || !pm.card) return
    await saveCardOnCustomer(ourCustomerId, {
      stripeCustomerId,
      paymentMethodId: pm.id,
      card: pm.card,
    })
  } catch (e) {
    console.error('maybeSaveCard error:', e?.message || e)
  }
}

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const { session_id } = await request.json()
    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const session = await retrieveSession(session_id)
    if (session.error) {
      return NextResponse.json({ error: session.error.message }, { status: 400 })
    }

    // Trust anchor: we asked Stripe directly, so this can't be forged by a
    // tampered query param. Only act on genuinely-paid sessions.
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ paid: false, status: session.payment_status })
    }

    const metadata = session.metadata || {}
    const type = metadata.type || ''
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id

    // ---- Single invoice ----
    if (type === 'invoice') {
      const invoice = await findInvoice({
        invoiceId: metadata.invoice_id,
        invoiceNumber: metadata.invoice_number,
      })
      if (!invoice) {
        return NextResponse.json({ paid: true, handled: false, reason: 'invoice_not_found' })
      }

      const { wasAlreadyPaid, invoice: updated } = await markInvoicePaid(invoice, {
        amountCents: session.amount_total,
        paymentIntentId,
        paymentMethod: 'card',
      })

      await recordTransaction({
        invoice_id: invoice.id,
        booking_id: invoice.booking_id || null,
        customer_name: session.customer_details?.name || invoice.customer_name,
        customer_phone: invoice.customer_phone,
        customer_email: session.customer_details?.email || invoice.customer_email,
        amount_cents: session.amount_total,
        description: `Invoice ${invoice.invoice_number}`,
        type: 'invoice',
        service_address: invoice.service_address || null,
        stripe_session_id: session.id,
        stripe_payment_intent: paymentIntentId,
        payment_method: 'card',
        send_sms: false,
      })

      await maybeSaveCard(session, invoice.customer_id)

      // Only message on the transition to paid so the webhook + this fallback
      // never both notify for the same payment.
      if (!wasAlreadyPaid) {
        await notifyInvoicePaid(updated || invoice, session.amount_total)
      }

      return NextResponse.json({ paid: true, handled: true, invoice_number: invoice.invoice_number, already_paid: wasAlreadyPaid })
    }

    // ---- Batch of invoices ----
    if (type === 'invoice_batch') {
      const result = await confirmBatch(session, metadata)
      return NextResponse.json({ paid: true, ...result })
    }

    // Other types (booking/extension/etc.) are owned by the webhook, which does
    // a lot more (confirmation emails, booking state). Don't duplicate that here.
    return NextResponse.json({ paid: true, handled: false, type })
  } catch (error) {
    console.error('Stripe confirm error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function confirmBatch(session, metadata) {
  const serviceKey = getServiceKey()
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id

  let invoiceIds = []
  try {
    invoiceIds = JSON.parse(metadata.invoice_ids || '[]')
  } catch (e) {
    invoiceIds = []
  }

  const paid = []
  for (const invId of invoiceIds) {
    const invoice = await findInvoice({ invoiceId: invId })
    if (!invoice) continue
    const balance = Math.max(0, (invoice.total_cents || 0) - (invoice.amount_paid_cents || 0))
    const { wasAlreadyPaid } = await markInvoicePaid(invoice, {
      amountCents: balance,
      paymentIntentId,
      paymentMethod: 'card',
    })
    // Composite session id keeps dedup per-invoice (one Stripe session, many invoices).
    await recordTransaction({
      invoice_id: invoice.id,
      booking_id: invoice.booking_id || null,
      customer_name: invoice.customer_name,
      customer_phone: invoice.customer_phone,
      customer_email: invoice.customer_email,
      amount_cents: balance,
      description: `Invoice ${invoice.invoice_number}`,
      type: 'invoice',
      service_address: invoice.service_address || null,
      stripe_session_id: `${session.id}:${invoice.id}`,
      stripe_payment_intent: paymentIntentId,
      payment_method: 'card',
      send_sms: false,
    })
    if (!wasAlreadyPaid) paid.push(invoice)
  }

  // Mark the batch row paid (idempotent).
  const batchToken = metadata.batch_token
  if (batchToken) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/payment_batches?token=eq.${encodeURIComponent(batchToken)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString(), stripe_session_id: session.id }),
      })
    } catch (e) {
      console.error('confirmBatch mark batch failed:', e?.message || e)
    }
  }

  return { handled: true, paid_count: paid.length }
}
