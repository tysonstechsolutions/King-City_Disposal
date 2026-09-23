// ============================================
// ADMIN CUSTOMER UPDATE/DELETE API
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../../config';
import { requireAdminAuth } from '../../../../../lib/adminAuth';

const supabaseUrl = config.supabase.url;
const getServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// PATCH - Update a customer
// ============================================
export async function PATCH(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    body.updated_at = new Date().toISOString();

    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getServiceKey(),
          'Authorization': `Bearer ${getServiceKey()}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Customer update error:', errorText);
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Customer update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// DELETE - Delete a customer
// ============================================
export async function DELETE(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  try {
    // Other rows point at this customer (the receipt that created it, invoices,
    // bookings...). Postgres blocks the delete while those references exist, so
    // unlink them first. Best-effort: a table/column may not exist in every DB.
    const headers = {
      'Content-Type': 'application/json',
      'apikey': getServiceKey(),
      'Authorization': `Bearer ${getServiceKey()}`,
    };
    const unlink = (table) =>
      fetch(`${supabaseUrl}/rest/v1/${table}?customer_id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ customer_id: null }),
      }).catch(() => {});
    await Promise.all(
      ['parsed_invoices', 'invoices', 'bookings', 'transactions', 'documents', 'payment_batches', 'customer_requests'].map(unlink)
    );

    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': getServiceKey(),
          'Authorization': `Bearer ${getServiceKey()}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Customer delete error:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete customer', detail: errorText.substring(0, 300) || undefined },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
