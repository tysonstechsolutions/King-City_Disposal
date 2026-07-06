// ============================================
// PARSED INVOICE API - Update & Confirm
// ============================================
// Manage individual parsed invoice records

import { NextResponse } from 'next/server';
import { config } from '../../../../../config';
import { requireAdminAuth } from '../../../../../lib/adminAuth';

// Force dynamic rendering (not static)
export const dynamic = 'force-dynamic';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// Columns that actually exist on parsed_invoices and are safe to edit.
// The review form carries extra client-only fields (e.g. weight_lbs, which
// lives on the documents table). Sending an unknown column makes PostgREST
// reject the entire request with a 500, so we filter to this allowlist.
const EDITABLE_COLUMNS = new Set([
  'invoice_type',
  'from_name', 'from_address', 'from_phone', 'from_email',
  'to_name', 'to_address', 'to_phone', 'to_email',
  'invoice_number', 'invoice_date', 'due_date', 'payment_terms',
  'line_items',
  'subtotal_cents', 'tax_cents', 'fees_cents', 'discount_cents', 'total_cents',
  'expense_category', 'is_tax_deductible', 'tax_year',
  'status', 'confidence_score', 'confirmed_at',
  'raw_text', 'notes', 'customer_id',
]);

// DATE columns reject empty strings ("" is not valid date syntax), so coerce
// blank values to null.
const DATE_COLUMNS = new Set(['invoice_date', 'due_date']);

function sanitizeUpdates(raw) {
  const clean = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!EDITABLE_COLUMNS.has(key)) continue;
    if (DATE_COLUMNS.has(key) && (value === '' || value === undefined)) {
      clean[key] = null;
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

// ============================================
// GET - Fetch single parsed invoice
// ============================================
export async function GET(request, { params }) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/parsed_invoices?id=eq.${id}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch parsed invoice' },
        { status: 500 }
      );
    }

    const results = await response.json();
    if (!results.length) {
      return NextResponse.json(
        { error: 'Parsed invoice not found' },
        { status: 404 }
      );
    }

    const parsedInvoice = results[0];

    // Parse line_items if it's a string
    if (typeof parsedInvoice.line_items === 'string') {
      parsedInvoice.line_items = JSON.parse(parsedInvoice.line_items);
    }

    return NextResponse.json(parsedInvoice);

  } catch (error) {
    console.error('Get parsed invoice error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// PATCH - Update parsed invoice (edit fields)
// ============================================
export async function PATCH(request, { params }) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const rawUpdates = await request.json();

    // Keep only real, editable columns (drops client-only fields like
    // weight_lbs that would otherwise make PostgREST reject the whole PATCH).
    const updates = sanitizeUpdates(rawUpdates);

    // If line_items is being updated, stringify it
    if (updates.line_items && typeof updates.line_items !== 'string') {
      updates.line_items = JSON.stringify(updates.line_items);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No editable fields provided' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/parsed_invoices?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update parsed invoice error:', errorText);
      return NextResponse.json(
        { error: 'Failed to update parsed invoice', detail: errorText },
        { status: 500 }
      );
    }

    const [updated] = await response.json();

    // Parse line_items for response
    if (typeof updated.line_items === 'string') {
      updated.line_items = JSON.parse(updated.line_items);
    }

    return NextResponse.json({
      success: true,
      parsed_invoice: updated,
    });

  } catch (error) {
    console.error('Update parsed invoice error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// GENERATE INVOICE NUMBER
// ============================================
async function generateInvoiceNumber() {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/generate_invoice_number`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Error generating invoice number:', e);
  }

  // Fallback
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${year}-${random}`;
}

// ============================================
// POST - Confirm parsed invoice
// ============================================
export async function POST(request, { params }) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const { action } = await request.json();

    if (action === 'confirm') {
      // First, fetch the full parsed invoice data
      const getResponse = await fetch(
        `${supabaseUrl}/rest/v1/parsed_invoices?id=eq.${id}`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );

      if (!getResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch parsed invoice' },
          { status: 500 }
        );
      }

      const parsedResults = await getResponse.json();
      if (!parsedResults.length) {
        return NextResponse.json(
          { error: 'Parsed invoice not found' },
          { status: 404 }
        );
      }

      const parsedInvoice = parsedResults[0];

      // Parse line_items if it's a string
      let lineItems = parsedInvoice.line_items;
      if (typeof lineItems === 'string') {
        lineItems = JSON.parse(lineItems);
      }

      // Determine tax year from invoice date or current year
      let taxYear = new Date().getFullYear();
      if (parsedInvoice.invoice_date) {
        const invoiceDate = new Date(parsedInvoice.invoice_date);
        if (!isNaN(invoiceDate.getTime())) {
          taxYear = invoiceDate.getFullYear();
        }
      }

      // Mark as confirmed with tax_year
      const response = await fetch(
        `${supabaseUrl}/rest/v1/parsed_invoices?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            tax_year: taxYear,
          }),
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to confirm parsed invoice' },
          { status: 500 }
        );
      }

      const [confirmed] = await response.json();

      // Create actual invoice record if this is a customer_record type
      // (invoices we send to customers, not vendor expenses)
      let createdInvoice = null;
      if (parsedInvoice.invoice_type === 'customer_record' && parsedInvoice.customer_id) {
        // Generate invoice number (use parsed one if available, otherwise generate)
        const invoice_number = parsedInvoice.invoice_number || await generateInvoiceNumber();

        // Determine customer info - for customer_record, the "to" is the customer
        const customerName = parsedInvoice.to_name || '';
        const customerPhone = parsedInvoice.to_phone || '';
        const customerEmail = parsedInvoice.to_email || '';
        const customerAddress = parsedInvoice.to_address || '';

        // Build invoice data
        const invoiceData = {
          invoice_number,
          customer_id: parsedInvoice.customer_id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          customer_address: customerAddress,
          service_address: customerAddress,
          line_items: JSON.stringify(lineItems || []),
          subtotal_cents: parsedInvoice.subtotal_cents || 0,
          tax_cents: parsedInvoice.tax_cents || 0,
          cc_fee_cents: 0, // No CC fee for parsed/imported invoices
          discount_cents: parsedInvoice.discount_cents || 0,
          total_cents: parsedInvoice.total_cents || parsedInvoice.subtotal_cents || 0,
          amount_paid_cents: 0,
          invoice_date: parsedInvoice.invoice_date || new Date().toISOString().split('T')[0],
          due_date: parsedInvoice.due_date || null,
          notes: `Created from parsed document #${parsedInvoice.document_id}`,
          status: 'draft',
        };

        const invoiceResponse = await fetch(
          `${supabaseUrl}/rest/v1/invoices`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(invoiceData),
          }
        );

        if (invoiceResponse.ok) {
          const [invoice] = await invoiceResponse.json();
          createdInvoice = invoice;

          // Link the document to this invoice
          if (parsedInvoice.document_id) {
            await fetch(
              `${supabaseUrl}/rest/v1/documents?id=eq.${parsedInvoice.document_id}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': getSupabaseKey(),
                  'Authorization': `Bearer ${getSupabaseKey()}`,
                },
                body: JSON.stringify({
                  invoice_id: invoice.id,
                }),
              }
            );
          }

          console.log(`✅ Invoice created from parsed document: ${invoice_number}`);
        } else {
          console.error('Failed to create invoice from parsed data:', await invoiceResponse.text());
        }
      }

      return NextResponse.json({
        success: true,
        message: createdInvoice ? 'Invoice confirmed and added to customer' : 'Invoice confirmed',
        parsed_invoice: confirmed,
        invoice: createdInvoice,
      });

    } else if (action === 'reject') {
      // Mark as rejected
      const response = await fetch(
        `${supabaseUrl}/rest/v1/parsed_invoices?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            status: 'rejected',
          }),
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to reject parsed invoice' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Invoice rejected',
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "confirm" or "reject".' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Confirm/reject parsed invoice error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// DELETE - Delete parsed invoice
// ============================================
export async function DELETE(request, { params }) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    // First get the document_id to update the document
    const getResponse = await fetch(
      `${supabaseUrl}/rest/v1/parsed_invoices?id=eq.${id}&select=document_id`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    const results = await getResponse.json();
    const documentId = results[0]?.document_id;

    // Delete the parsed invoice
    const response = await fetch(
      `${supabaseUrl}/rest/v1/parsed_invoices?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to delete parsed invoice' },
        { status: 500 }
      );
    }

    // Reset document parse status. Try the full reset first; if parse_status
    // doesn't exist in this database the whole PATCH is rejected, so retry
    // with just the parsed_invoice link (which does exist in the base schema).
    if (documentId) {
      const resetDoc = (payload) => fetch(
        `${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const resetRes = await resetDoc({ parse_status: null, parsed_invoice_id: null });
      if (!resetRes.ok) {
        await resetDoc({ parsed_invoice_id: null });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Parsed invoice deleted',
    });

  } catch (error) {
    console.error('Delete parsed invoice error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
