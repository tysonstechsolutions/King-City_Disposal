// ============================================
// VENDOR CORRECTIONS API - AI Learning System
// ============================================
// Store and apply vendor corrections learned from user edits

import { NextResponse } from 'next/server';
import { config } from '../../../config';

export const dynamic = 'force-dynamic';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// GET - Fetch all vendor corrections
// ============================================
export async function GET() {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/vendor_corrections?order=vendor_name.asc`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch vendor corrections' },
        { status: 500 }
      );
    }

    const corrections = await response.json();
    return NextResponse.json(corrections);

  } catch (error) {
    console.error('Get vendor corrections error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// POST - Add or update vendor correction
// ============================================
export async function POST(request) {
  try {
    const {
      vendor_name,
      corrected_name,
      corrected_phone,
      corrected_address,
      default_category,
    } = await request.json();

    if (!vendor_name) {
      return NextResponse.json(
        { error: 'Vendor name is required' },
        { status: 400 }
      );
    }

    // Check if correction already exists for this vendor
    const existingResponse = await fetch(
      `${supabaseUrl}/rest/v1/vendor_corrections?vendor_name=ilike.${encodeURIComponent(vendor_name)}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    const existing = await existingResponse.json();

    const correctionData = {
      vendor_name: vendor_name.trim(),
      corrected_name: corrected_name?.trim() || null,
      corrected_phone: corrected_phone?.replace(/\D/g, '') || null,
      corrected_address: corrected_address?.trim() || null,
      default_category: default_category || null,
      updated_at: new Date().toISOString(),
    };

    let response;

    if (existing.length > 0) {
      // Update existing
      response = await fetch(
        `${supabaseUrl}/rest/v1/vendor_corrections?id=eq.${existing[0].id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(correctionData),
        }
      );
    } else {
      // Insert new
      correctionData.created_at = new Date().toISOString();
      response = await fetch(
        `${supabaseUrl}/rest/v1/vendor_corrections`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(correctionData),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vendor correction save error:', errorText);
      return NextResponse.json(
        { error: 'Failed to save vendor correction' },
        { status: 500 }
      );
    }

    const [saved] = await response.json();

    return NextResponse.json({
      success: true,
      message: existing.length > 0 ? 'Vendor correction updated' : 'Vendor correction saved',
      correction: saved,
    });

  } catch (error) {
    console.error('Save vendor correction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// DELETE - Remove a vendor correction
// ============================================
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Correction ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/vendor_corrections?id=eq.${id}`,
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
        { error: 'Failed to delete vendor correction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vendor correction deleted',
    });

  } catch (error) {
    console.error('Delete vendor correction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
