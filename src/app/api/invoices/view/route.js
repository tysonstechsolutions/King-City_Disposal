// ============================================
// INVOICE VIEW TRACKING - Public (no auth required)
// ============================================
// Marks an invoice as "viewed" when a customer opens their invoice link.
// Only updates invoices that are currently in "sent" status.

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

export async function POST(request) {
  try {
    const { invoice_number } = await request.json();

    if (!invoice_number) {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?invoice_number=eq.${encodeURIComponent(invoice_number)}&status=eq.sent`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
        body: JSON.stringify({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      console.error('Mark viewed error:', await response.text());
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
