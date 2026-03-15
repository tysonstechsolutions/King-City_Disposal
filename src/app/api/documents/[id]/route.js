// ============================================
// DOCUMENT API - Individual Document Operations
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { requireAdminAuth } from '../../../../lib/adminAuth';

// Get Supabase credentials at runtime for serverless
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// DELETE - Delete a document
// ============================================
export async function DELETE(request, { params }) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  try {
    // First, get the document to find its storage path
    const docRes = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${id}&select=storage_path,parsed_invoice_id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!docRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
    }

    const docs = await docRes.json();
    if (docs.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docs[0];

    // Delete the parsed invoice if it exists
    if (doc.parsed_invoice_id) {
      await fetch(
        `${supabaseUrl}/rest/v1/parsed_invoices?id=eq.${doc.parsed_invoice_id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
    }

    // Delete the file from storage
    if (doc.storage_path) {
      await fetch(
        `${supabaseUrl}/storage/v1/object/documents/${doc.storage_path}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
    }

    // Delete the document record
    const deleteRes = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      console.error('Delete document error:', errorText);
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// GET - Get a single document
// ============================================
export async function GET(request, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${id}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
    }

    const docs = await response.json();
    if (docs.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Add public URL
    const doc = docs[0];
    doc.url = `${supabaseUrl}/storage/v1/object/public/documents/${doc.storage_path}`;

    return NextResponse.json(doc);

  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
