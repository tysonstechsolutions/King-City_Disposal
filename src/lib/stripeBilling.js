// ============================================
// SHARED STRIPE BILLING HELPERS
// ============================================
// Used by the payment-confirmation fallback (/api/stripe/confirm) and the
// one-click saved-card charge (/api/stripe/charge-saved). Keeping the
// "mark an invoice paid", "record the receipt", and "save the card on file"
// logic in one place keeps those two routes consistent and idempotent.

import { config } from '../config'
import { notifyOwner, notifyCustomer } from './notifications'

const supabaseUrl = config.supabase.url
const getServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey

function authHeaders(extra = {}) {
  const key = getServiceKey()
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  }
}

// Look up an invoice by numeric id or by invoice_number. Returns the row or null.
export async function findInvoice({ invoiceId, invoiceNumber }) {
  const query = invoiceId
    ? `id=eq.${encodeURIComponent(invoiceId)}`
    : `invoice_number=eq.${encodeURIComponent(invoiceNumber)}`
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/invoices?${query}`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    const [invoice] = await res.json()
    return invoice || null
  } catch (e) {
    console.error('findInvoice error:', e?.message || e)
    return null
  }
}

// Mark an invoice paid (idempotent). If it is already fully paid we leave it
// alone and report wasAlreadyPaid so callers don't re-notify or double count.
// `amountCents` is the amount that was just collected.
export async function markInvoicePaid(invoice, { amountCents, paymentIntentId, paymentMethod = 'card' }) {
  if (!invoice) return { wasAlreadyPaid: false, invoice: null }

  // Already settled — nothing to do.
  if (invoice.status === 'paid' || (invoice.balance_due_cents != null && invoice.balance_due_cents <= 0)) {
    return { wasAlreadyPaid: true, invoice }
  }

  const newAmountPaid = (invoice.amount_paid_cents || 0) + (amountCents || 0)
  const newBalanceDue = (invoice.total_cents || 0) - newAmountPaid
  const fullyPaid = newBalanceDue <= 0

  const update = {
    amount_paid_cents: newAmountPaid,
    balance_due_cents: Math.max(0, newBalanceDue),
    status: fullyPaid ? 'paid' : 'partial',
    payment_method: paymentMethod === 'card' ? 'stripe' : paymentMethod,
    updated_at: new Date().toISOString(),
  }
  if (fullyPaid) update.paid_at = new Date().toISOString()
  if (paymentIntentId) update.stripe_payment_intent_id = paymentIntentId

  const patchInvoice = (payload) => fetch(`${supabaseUrl}/rest/v1/invoices?id=eq.${invoice.id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(payload),
  })

  try {
    let res = await patchInvoice(update)
    if (!res.ok) {
      // PostgREST rejects the WHOLE update when any column in the body doesn't
      // exist (e.g. payment_method / stripe_payment_intent_id before the
      // migration is run). Retry with only the core columns so the invoice
      // still flips to paid — this is what makes payments show on the website.
      const err = await res.text().catch(() => '')
      console.error('markInvoicePaid full update failed, retrying minimal:', err.substring(0, 300))
      const minimal = {
        amount_paid_cents: newAmountPaid,
        balance_due_cents: Math.max(0, newBalanceDue),
        status: fullyPaid ? 'paid' : 'partial',
      }
      if (fullyPaid) minimal.paid_at = update.paid_at
      res = await patchInvoice(minimal)
    }
    if (!res.ok) {
      console.error('markInvoicePaid update failed:', await res.text())
      return { wasAlreadyPaid: false, invoice }
    }
    const [updated] = await res.json()
    return { wasAlreadyPaid: false, invoice: updated || { ...invoice, ...update } }
  } catch (e) {
    console.error('markInvoicePaid error:', e?.message || e)
    return { wasAlreadyPaid: false, invoice }
  }
}

// Create a receipt/transaction row via the internal transactions API. Dedup is
// handled there by stripe_session_id, so pass a stable id (the Checkout session
// id, or `pi_<paymentIntent>` for direct charges) to make retries safe.
export async function recordTransaction(payload) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kingcitydisposal.com'
  const internalSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  // Idempotency: skip if a transaction already exists for this stable id.
  if (payload.stripe_session_id) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/transactions?stripe_session_id=eq.${encodeURIComponent(payload.stripe_session_id)}&select=id,receipt_number`,
        { headers: authHeaders() }
      )
      if (res.ok) {
        const existing = await res.json()
        if (existing.length > 0) {
          return { receipt_number: existing[0].receipt_number, already_existed: true }
        }
      }
    } catch (e) {
      // fall through to creation; the DB/endpoint is the final guard
    }
  }

  try {
    const res = await fetch(`${siteUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': internalSecret },
      body: JSON.stringify(payload),
    })
    if (res.ok) return await res.json()
    console.error('recordTransaction failed:', await res.text())
    return null
  } catch (e) {
    console.error('recordTransaction error:', e?.message || e)
    return null
  }
}

// Persist a saved card on our customer record so the office can charge it later.
// We only store Stripe reference ids + last4/brand for display. Best-effort:
// if the card-on-file columns haven't been added yet, this logs and moves on.
export async function saveCardOnCustomer(customerId, { stripeCustomerId, paymentMethodId, card }) {
  if (!customerId || !stripeCustomerId) return false
  const update = {
    stripe_customer_id: stripeCustomerId,
    stripe_payment_method_id: paymentMethodId || null,
    card_brand: card?.brand || null,
    card_last4: card?.last4 || null,
    card_exp: card?.exp_month && card?.exp_year ? `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}` : null,
  }
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(update),
    })
    if (!res.ok) {
      console.error('saveCardOnCustomer failed (did you run add-stripe-card-on-file.sql?):', await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error('saveCardOnCustomer error:', e?.message || e)
    return false
  }
}

export async function getCustomer(customerId) {
  if (!customerId) return null
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    const [customer] = await res.json()
    return customer || null
  } catch (e) {
    return null
  }
}

// Owner + customer "payment received" messages. Mirrors the webhook copy so a
// payment confirmed via the fallback path looks the same as a webhook one.
export async function notifyInvoicePaid(invoice, amountCents) {
  const priceDisplay = `$${((amountCents || 0) / 100).toFixed(2)}`
  const number = invoice?.invoice_number || ''
  try {
    await notifyOwner(
      `💰 INVOICE PAID!\n\nInvoice: ${number}\nCustomer: ${invoice?.customer_name || 'Customer'}\nAmount: ${priceDisplay}`
    )
  } catch (e) {
    console.error('notifyOwner failed:', e?.message || e)
  }

  if (invoice?.customer_email || invoice?.customer_phone) {
    try {
      await notifyCustomer({
        phone: invoice.customer_phone,
        email: invoice.customer_email,
        subject: `Payment Received - Invoice ${number}`,
        smsMessage: `✅ Payment received!\n\nInvoice: ${number}\nAmount: ${priceDisplay}\n\nThank you for your business!\n\n${config.businessName}\n${config.billingPhone}`,
        emailHtml: `<p>Thank you for your payment of ${priceDisplay} for invoice ${number}.</p><p>Your payment has been processed successfully.</p><p>${config.businessName}<br>${config.billingPhone}</p>`,
        emailText: `Thank you for your payment of ${priceDisplay} for invoice ${number}.\n\nYour payment has been processed successfully.\n\n${config.businessName}\n${config.billingPhone}`,
      })
    } catch (e) {
      console.error('notifyCustomer failed:', e?.message || e)
    }
  }
}
