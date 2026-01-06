// ============================================
// DOCUMENT IMAGE API - Authenticated Access
// ============================================
// Fetches document images from Supabase Storage with auth

import { NextResponse } from 'next/server';
import { config } from '../../../../../config';

export const dynamic = 'force-dynamic';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

export async function GET(request, { params }) {
  const { id } = await params;

  try {
    // First get the document record to find storage_path
    const docResponse = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${id}&select=storage_path,file_type`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!docResponse.ok) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docs = await docResponse.json();
    if (!docs.length || !docs[0].storage_path) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { storage_path, file_type } = docs[0];

    // Fetch the image from Supabase Storage with authentication
    const imageUrl = `${supabaseUrl}/storage/v1/object/authenticated/documents/${storage_path}`;
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    });

    if (!imageResponse.ok) {
      console.error('Storage fetch error:', await imageResponse.text());
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': file_type || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Document image error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
