// ============================================
// MANUAL DOCUMENT ENTRY
// ============================================
// For documents the AI can't read, the admin types the data in by hand (with
// the receipt image on screen). This saves a parsed_invoices row marked as
// manually entered + confirmed and flips the document to "Parsed" so it moves
// to the completed section — the same shape the AI parser produces, so it flows
// into expenses/reports identically.

import { NextResponse } from 'next/server'
import { config } from '../../../../../config'
import { requireAdminAuth } from '../../../../../lib/adminAuth'
import { logger } from '../../../../../lib/logger'

export const dynamic = 'force-dynamic'

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey

const MANUAL_MARKER = 'Manually entered'

function formatDate(dateStr) {
  if (!dateStr) return null
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return null
  return parsed.toISOString().split('T')[0]
}

export async function POST(request) {
  const auth = await requireAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()

    const headers = {
      'Content-Type': 'application/json',
      apikey: getSupabaseKey(),
      Authorization: `Bearer ${getSupabaseKey()}`,
    }

    const invoiceDate = formatDate(body.invoice_date)

    // A document_id is normally supplied (manual review of an uploaded file).
    // When it's absent — the standalone "Manual" entry with no attachment —
    // create a fileless document record server-side (service key) so the rest
    // of the flow is identical. Only base-schema columns go in the insert so
    // an unmigrated database can't reject it; richer fields are patched below.
    let docIdInt = parseInt(body.document_id, 10)
    if (Number.isNaN(docIdInt)) {
      const newDoc = {
        category: body.expense_category || 'other',
        title: body.from_name
          ? `${body.from_name}${invoiceDate ? ` - ${invoiceDate}` : ''}`
          : 'Manual entry',
        amount_cents: parseInt(body.total_cents, 10) || null,
        service_date: invoiceDate || null,
      }
      Object.keys(newDoc).forEach((k) => (newDoc[k] == null) && delete newDoc[k])

      const createRes = await fetch(`${getSupabaseUrl()}/rest/v1/documents`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(newDoc),
      })
      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => '')
        logger.error('Manual entry: could not create document', null, { error: errText.substring(0, 300) })
        return NextResponse.json(
          { error: `Could not create the record: ${errText.substring(0, 200) || 'database rejected the write'}` },
          { status: 500 }
        )
      }
      const [createdDoc] = await createRes.json()
      if (!createdDoc || createdDoc.id == null) {
        return NextResponse.json(
          { error: 'The record did not save (database returned no row — check RLS on documents).' },
          { status: 500 }
        )
      }
      docIdInt = createdDoc.id
    }
    const taxYear = invoiceDate ? new Date(invoiceDate).getFullYear() : new Date().getFullYear()
    const totalCents = parseInt(body.total_cents, 10) || 0

    const parsedInvoiceData = {
      document_id: docIdInt,
      customer_id: body.customer_id || null,
      invoice_type: body.invoice_type || 'vendor_expense',
      from_name: body.from_name || null,
      from_address: body.from_address || null,
      from_phone: body.from_phone || null,
      from_email: body.from_email || null,
      to_name: body.to_name || null,
      to_address: body.to_address || null,
      to_phone: body.to_phone || null,
      to_email: body.to_email || null,
      invoice_number: body.invoice_number || null,
      invoice_date: invoiceDate,
      due_date: formatDate(body.due_date),
      payment_terms: body.payment_terms || null,
      line_items: JSON.stringify(Array.isArray(body.line_items) ? body.line_items : []),
      subtotal_cents: parseInt(body.subtotal_cents, 10) || 0,
      tax_cents: parseInt(body.tax_cents, 10) || 0,
      fees_cents: parseInt(body.fees_cents, 10) || 0,
      discount_cents: parseInt(body.discount_cents, 10) || 0,
      total_cents: totalCents,
      expense_category: body.expense_category || 'other',
      is_tax_deductible: body.is_tax_deductible !== false,
      tax_year: taxYear,
      // Mark manual + confirmed so it lands directly in the completed section.
      status: 'confirmed',
      confidence_score: 1.0,
      confirmed_at: new Date().toISOString(),
      raw_text: body.notes ? `${MANUAL_MARKER} — ${body.notes}` : MANUAL_MARKER,
      // NOTE: weight_lbs is NOT a column on parsed_invoices (it lives on the
      // documents table). Including it here made PostgREST reject the entire
      // insert, so every manual entry failed. Weight is written to the
      // document record below instead.
    }

    const weightLbs = body.weight_lbs != null && body.weight_lbs !== ''
      ? parseInt(body.weight_lbs, 10)
      : null

    // Remove a fresh existing parsed row for this document (re-entry), so we
    // don't stack duplicates.
    try {
      await fetch(`${getSupabaseUrl()}/rest/v1/parsed_invoices?document_id=eq.${docIdInt}`, {
        method: 'DELETE',
        headers: { apikey: getSupabaseKey(), Authorization: `Bearer ${getSupabaseKey()}` },
      })
    } catch (e) {
      // non-fatal
    }

    const insertRes = await fetch(`${getSupabaseUrl()}/rest/v1/parsed_invoices`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(parsedInvoiceData),
    })

    if (!insertRes.ok) {
      const errText = await insertRes.text().catch(() => '')
      logger.error('Manual entry insert failed', null, { document_id: docIdInt, error: errText.substring(0, 300) })
      return NextResponse.json(
        { error: `Could not save the entry: ${errText.substring(0, 200) || 'database rejected the write'}` },
        { status: 500 }
      )
    }

    const [parsedInvoice] = await insertRes.json()
    if (!parsedInvoice || parsedInvoice.id == null) {
      return NextResponse.json(
        { error: 'The entry did not save (database returned no record — check RLS on parsed_invoices).' },
        { status: 500 }
      )
    }

    // Flip the document to parsed (best-effort, with progressively smaller
    // payloads so a missing column can't wedge it on Pending).
    const writeDoc = (payload) => fetch(`${getSupabaseUrl()}/rest/v1/documents?id=eq.${docIdInt}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    })

    const fullDoc = {
      parse_status: 'parsed',
      parsed_invoice_id: parsedInvoice.id,
      amount_cents: totalCents || null,
      vendor: body.from_name || null,
      category: body.expense_category || null,
      service_date: invoiceDate || null,
      weight_lbs: weightLbs,
    }
    Object.keys(fullDoc).forEach((k) => (fullDoc[k] == null) && delete fullDoc[k])

    let docRes = await writeDoc(fullDoc)
    if (!docRes.ok) {
      // Base-schema columns only (no parse_status/vendor — those may not exist,
      // and PostgREST rejects the whole payload when any column is unknown).
      // parsed_invoice_id goes in its own attempt: in unmigrated databases that
      // column is a UUID and the bigint id would sink the whole PATCH.
      const minimalDoc = {
        ...(totalCents ? { amount_cents: totalCents } : {}),
        ...(body.expense_category ? { category: body.expense_category } : {}),
        ...(invoiceDate ? { service_date: invoiceDate } : {}),
        ...(weightLbs != null ? { weight_lbs: weightLbs } : {}),
      }
      if (Object.keys(minimalDoc).length > 0) {
        docRes = await writeDoc(minimalDoc)
      }
      await writeDoc({ parsed_invoice_id: parsedInvoice.id }).catch(() => {})
    }

    return NextResponse.json({ success: true, parsed_invoice: parsedInvoice })
  } catch (error) {
    logger.error('Manual entry error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
