// ============================================
// DOCUMENTS LIST API (enriched with parsed data)
// ============================================
// Returns all documents for the admin Documents page, enriched with data from
// the parsed_invoices table. This is the source of truth for parsed results:
// the browser cannot read parsed_invoices directly (RLS blocks the anon key),
// and the write-back of parse results onto the documents row can silently fail
// (missing column / policy). Deriving status + amount from parsed_invoices here
// (with the service-role key) makes the UI show "Parsed" and the correct amount
// as long as the parse actually ran — independent of the documents write-back.

import { NextResponse } from 'next/server'
import { config } from '../../../config'
import { requireAdminAuth } from '../../../lib/adminAuth'

export const dynamic = 'force-dynamic'

const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey

export async function GET(request) {
  const auth = await requireAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const headers = {
      apikey: getSupabaseKey(),
      Authorization: `Bearer ${getSupabaseKey()}`,
    }

    const [docsRes, parsedRes] = await Promise.all([
      fetch(`${getSupabaseUrl()}/rest/v1/documents?order=created_at.desc&limit=10000`, { headers }),
      fetch(
        `${getSupabaseUrl()}/rest/v1/parsed_invoices?select=document_id,status,total_cents,from_name,expense_category,invoice_date,parsed_at,raw_text&order=parsed_at.asc&limit=10000`,
        { headers }
      ),
    ])

    if (!docsRes.ok) {
      const err = await docsRes.text().catch(() => '')
      return NextResponse.json({ error: `Failed to load documents: ${err.substring(0, 200)}` }, { status: 500 })
    }

    const documents = await docsRes.json()
    const parsed = parsedRes.ok ? await parsedRes.json() : []

    // Latest parsed_invoice per document (ordered asc, so last write wins).
    const parsedByDoc = {}
    for (const pi of parsed) {
      if (pi.document_id == null) continue
      parsedByDoc[pi.document_id] = pi
    }

    // Merge: a document with a parsed_invoice is shown as parsed/confirmed with
    // its extracted amount/vendor, even if the document row itself wasn't updated.
    const enriched = documents.map((d) => {
      const pi = parsedByDoc[d.id]
      if (!pi) return d
      const alreadyParsed = d.parse_status === 'parsed' || d.parse_status === 'confirmed'
      const derivedStatus = alreadyParsed
        ? d.parse_status
        : pi.status === 'confirmed'
          ? 'confirmed'
          : 'parsed'
      return {
        ...d,
        parse_status: derivedStatus,
        amount_cents: d.amount_cents != null ? d.amount_cents : (pi.total_cents ?? null),
        vendor: d.vendor || pi.from_name || null,
        category: d.category || pi.expense_category || d.category,
        service_date: d.service_date || pi.invoice_date || null,
        manual: pi.raw_text === 'Manually entered',
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
