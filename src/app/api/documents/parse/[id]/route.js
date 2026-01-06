// ============================================
// PARSED INVOICE API - Update & Confirm
// ============================================
// Manage individual parsed invoice records

import { NextResponse } from 'next/server';
import { config } from '../../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// GET - Fetch single parsed invoice
// ============================================
export async function GET(request, { params }) {
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
  const { id } = await params;

  try {
    const updates = await request.json();

    // If line_items is being updated, stringify it
    if (updates.line_items && typeof updates.line_items !== 'string') {
      updates.line_items = JSON.stringify(updates.line_items);
    }

    // Prevent changing certain fields
    delete updates.id;
    delete updates.document_id;
    delete updates.parsed_at;

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
        { error: 'Failed to update parsed invoice' },
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
// POST - Confirm parsed invoice
// ============================================
export async function POST(request, { params }) {
  const { id } = await params;

  try {
    const { action } = await request.json();

    if (action === 'confirm') {
      // Mark as confirmed
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

      return NextResponse.json({
        success: true,
        message: 'Invoice confirmed',
        parsed_invoice: confirmed,
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

    // Reset document parse status
    if (documentId) {
      await fetch(
        `${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
          body: JSON.stringify({
            parse_status: null,
            parsed_invoice_id: null,
          }),
        }
      );
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
