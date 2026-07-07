// ============================================
// INVOICE UPDATE/DELETE API - Admin only
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { requireAdminAuth } from '../../../../lib/adminAuth';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// PATCH - Update an invoice
// ============================================
export async function PATCH(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // If line_items is an array, stringify it for storage
    if (Array.isArray(body.line_items)) {
      body.line_items = JSON.stringify(body.line_items);
    }

    body.updated_at = new Date().toISOString();

    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Invoice update error:', errorText);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    const data = await response.json();
    // Parse line_items back for the response
    const invoices = data.map(inv => ({
      ...inv,
      line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : inv.line_items,
    }));

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// DELETE - Delete an invoice
// ============================================
export async function DELETE(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  try {
    // Other rows can reference this invoice via a foreign key (transactions
    // and documents both carry invoice_id). Postgres blocks the delete while
    // those references exist, which surfaced as an opaque 500. Unlink them
    // first (best-effort — a table/column may not exist in every database) so
    // the record can be removed without orphaning or erroring.
    const headers = {
      'Content-Type': 'application/json',
      'apikey': getSupabaseKey(),
      'Authorization': `Bearer ${getSupabaseKey()}`,
    };
    const unlink = (table) =>
      fetch(`${supabaseUrl}/rest/v1/${table}?invoice_id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ invoice_id: null }),
      }).catch(() => {});

    await Promise.all([unlink('transactions'), unlink('documents')]);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Invoice delete error:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete invoice', detail: errorText.substring(0, 300) || undefined },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invoice delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
