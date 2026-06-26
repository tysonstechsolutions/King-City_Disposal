// ============================================
// PAYMENT BATCH API (public read)
// ============================================
// GET /api/payment-batches?token=<token>
// Returns the batch plus its invoices (with live balances) for the /pay/<token> page.

import { NextResponse } from 'next/server';
import { config } from '../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

const balanceOf = (inv) =>
  Math.max(0, (inv.total_cents || 0) - (inv.amount_paid_cents || 0));

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  try {
    const batchRes = await fetch(
      `${supabaseUrl}/rest/v1/payment_batches?token=eq.${encodeURIComponent(token)}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!batchRes.ok) {
      return NextResponse.json({ error: 'Failed to load batch' }, { status: 500 });
    }

    const [batch] = await batchRes.json();
    if (!batch) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    // Load the underlying invoices
    const ids = Array.isArray(batch.invoice_ids) ? batch.invoice_ids : [];
    let invoices = [];
    if (ids.length > 0) {
      const idList = ids.map((id) => String(id)).join(',');
      const invRes = await fetch(
        `${supabaseUrl}/rest/v1/invoices?id=in.(${idList})&order=invoice_date.asc`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );
      if (invRes.ok) {
        const data = await invRes.json();
        invoices = data.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          service_address: inv.service_address,
          total_cents: inv.total_cents,
          balance_due_cents: balanceOf(inv),
          paid: inv.status === 'paid' || balanceOf(inv) <= 0,
        }));
      }
    }

    const amount_due_cents = invoices
      .filter((inv) => !inv.paid)
      .reduce((sum, inv) => sum + inv.balance_due_cents, 0);

    return NextResponse.json({
      token: batch.token,
      status: batch.status,
      customer_name: batch.customer_name,
      invoices,
      amount_due_cents,
      all_paid: amount_due_cents <= 0,
    });
  } catch (error) {
    console.error('Get payment batch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
