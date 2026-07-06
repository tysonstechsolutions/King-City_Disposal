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

    // Encode each path segment (spaces / unicode in filenames otherwise make
    // the storage API 400) while preserving the "/" separators.
    const encodedPath = String(storage_path)
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');

    const key = getSupabaseKey();

    // Try storage endpoints in order of likelihood. A given bucket is either
    // public or private, and using the wrong endpoint returns 400/404 — so we
    // fall through instead of failing on the first miss:
    //   1. authenticated  (private bucket, service-role bearer)
    //   2. public         (public bucket, no auth needed)
    //   3. signed URL     (works for private buckets without exposing the key)
    const attempts = [
      {
        url: `${supabaseUrl}/storage/v1/object/authenticated/documents/${encodedPath}`,
        headers: { Authorization: `Bearer ${key}` },
      },
      {
        url: `${supabaseUrl}/storage/v1/object/public/documents/${encodedPath}`,
        headers: {},
      },
    ];

    let imageResponse = null;
    let lastError = '';
    for (const attempt of attempts) {
      try {
        const res = await fetch(attempt.url, { headers: attempt.headers });
        if (res.ok) {
          imageResponse = res;
          break;
        }
        lastError = `${res.status} ${(await res.text().catch(() => '')).substring(0, 120)}`;
      } catch (e) {
        lastError = e?.message || String(e);
      }
    }

    // Last resort: mint a short-lived signed URL and follow it.
    if (!imageResponse) {
      try {
        const signRes = await fetch(
          `${supabaseUrl}/storage/v1/object/sign/documents/${encodedPath}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({ expiresIn: 3600 }),
          }
        );
        if (signRes.ok) {
          const { signedURL } = await signRes.json();
          if (signedURL) {
            const signed = await fetch(`${supabaseUrl}/storage/v1${signedURL}`);
            if (signed.ok) imageResponse = signed;
            else lastError = `signed ${signed.status}`;
          }
        } else {
          lastError = `sign ${signRes.status} ${(await signRes.text().catch(() => '')).substring(0, 120)}`;
        }
      } catch (e) {
        lastError = e?.message || String(e);
      }
    }

    if (!imageResponse) {
      console.error('Storage fetch error:', lastError);
      return NextResponse.json(
        { error: 'Failed to fetch image', detail: lastError },
        { status: 502 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': imageResponse.headers.get('content-type') || file_type || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Document image error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
