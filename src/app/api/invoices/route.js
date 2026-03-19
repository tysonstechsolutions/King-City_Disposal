// ============================================
// INVOICE API ROUTES
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../config';
import { requireAdminAuth } from '../../../lib/adminAuth';
import {
  calculateInvoiceTotals,
  cleanLineItemsForStorage
} from '../../../lib/invoiceHelpers';

// Get Supabase credentials at runtime for serverless
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// GENERATE INVOICE NUMBER
// ============================================
async function generateInvoiceNumber() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/generate_invoice_number`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
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
// CREATE INVOICE
// ============================================
export async function POST(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  try {
    // Verify Supabase config
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing for invoice creation');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Creating invoice with data:', {
      customer_name: body.customer_name,
      customer_id: body.customer_id,
      booking_id: body.booking_id,
      line_items_count: body.line_items?.length
    });

    const {
      customer_id,
      booking_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      service_address,
      service_description,
      dumpster_size,
      rental_duration,
      delivery_date,
      pickup_date,
      invoice_date,
      date_set,
      weight_lbs,
      weight_included_lbs,
      line_items,
      notes,
      status = 'draft',
      sent_at,
      due_date,
      purchase_order,
      // Frontend may send these, but we recalculate them
      include_cc_fee = false,
      include_tax = true,
      discount_cents = 0,
    } = body;

    if (!customer_name || !line_items || line_items.length === 0) {
      return NextResponse.json(
        { error: 'Customer name and line items are required' },
        { status: 400 }
      );
    }

    // Clean line items (remove any tax/fee items that frontend might have included)
    const cleanedLineItems = cleanLineItemsForStorage(line_items);

    // BACKEND CALCULATES TOTALS - single source of truth
    const totals = calculateInvoiceTotals(cleanedLineItems, {
      includeCardFee: include_cc_fee,
      includeTax: include_tax,
      discountCents: discount_cents,
    });

    console.log('Calculated totals:', totals);

    // Use custom invoice number if provided, otherwise auto-generate
    let invoice_number = body.invoice_number;
    if (!invoice_number) {
      console.log('Generating invoice number...');
      invoice_number = await generateInvoiceNumber();
      console.log('Generated invoice number:', invoice_number);
    }

    // Calculate overage if weight provided
    let overage_lbs = null;
    if (weight_lbs && weight_included_lbs) {
      overage_lbs = Math.max(0, weight_lbs - weight_included_lbs);
    }

    const today = new Date().toISOString().split('T')[0];

    // Validate IDs - customer_id expects bigint, booking uses UUID via booking_uuid column
    const validCustomerId = customer_id && /^\d+$/.test(String(customer_id)) ? customer_id : null;
    // booking_id is now stored in booking_uuid column (UUID type)
    const bookingUuid = booking_id || null;

    if (customer_id && !validCustomerId) {
      console.warn('Invalid customer_id format (expected numeric, got UUID?):', customer_id);
    }

    const invoiceData = {
      invoice_number,
      purchase_order: purchase_order || null,
      customer_id: validCustomerId,
      booking_uuid: bookingUuid,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      service_address,
      service_description,
      dumpster_size,
      rental_duration,
      delivery_date,
      pickup_date,
      invoice_date: invoice_date || today,
      date_set: date_set || delivery_date || today,
      weight_lbs,
      weight_included_lbs,
      overage_lbs,
      // Store ONLY service line items (no tax/fees)
      line_items: JSON.stringify(cleanedLineItems),
      // Store calculated totals from backend
      subtotal_cents: totals.subtotal_cents,
      tax_cents: totals.tax_cents,
      cc_fee_cents: totals.cc_fee_cents,
      discount_cents: totals.discount_cents,
      total_cents: totals.total_cents,
      amount_paid_cents: 0,
      due_date,
      notes,
      status,
      sent_at,
    };

    console.log('Sending invoice data to Supabase...');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(invoiceData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Invoice creation error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        invoice_number
      });
      return NextResponse.json(
        {
          error: 'Failed to create invoice',
          details: errorText,
          invoice_number
        },
        { status: 500 }
      );
    }

    const [invoice] = await response.json();

    // Note: Booking linking is done via booking_uuid on the invoice
    // The invoice_id field on bookings has a type mismatch (expects UUID, invoice.id is integer)
    // So we skip setting invoice_id on the booking - use booking_uuid to find related invoices

    console.log(`✅ Invoice created: ${invoice_number} | Total: $${(totals.total_cents / 100).toFixed(2)}`);

    return NextResponse.json({
      success: true,
      invoice,
      invoice_number,
      totals, // Return calculated totals for verification
    });

  } catch (error) {
    console.error('Invoice API error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        type: error.name
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET INVOICES
// ============================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const invoiceNumber = searchParams.get('invoice_number');
  const customerId = searchParams.get('customer_id');
  const status = searchParams.get('status');

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  // Public access allowed for single invoice lookup by invoice_number (customer view)
  // All other queries require admin auth
  if (!invoiceNumber) {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
  }

  try {
    // Verify Supabase config
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    let query = 'order=created_at.desc';

    if (id) {
      query = `id=eq.${id}`;
    } else if (invoiceNumber) {
      query = `invoice_number=eq.${invoiceNumber}`;
    } else {
      if (customerId) {
        query += `&customer_id=eq.${customerId}`;
      }
      if (status) {
        query += `&status=eq.${status}`;
      }
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?${query}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      // Parse line_items JSON with error handling
      const invoices = data.map(inv => {
        let parsedLineItems = [];
        try {
          if (typeof inv.line_items === 'string') {
            parsedLineItems = JSON.parse(inv.line_items);
          } else if (Array.isArray(inv.line_items)) {
            parsedLineItems = inv.line_items;
          }
        } catch (e) {
          console.error(`Failed to parse line_items for invoice ${inv.invoice_number}:`, e);
          parsedLineItems = [];
        }

        // Calculate balance_due on the fly (don't rely on stored value)
        const balance_due_cents = Math.max(0, (inv.total_cents || 0) - (inv.amount_paid_cents || 0));

        return {
          ...inv,
          line_items: parsedLineItems,
          balance_due_cents, // Always calculated fresh
        };
      });
      return NextResponse.json(invoices);
    }

    const errorText = await response.text();
    console.error('Failed to fetch invoices:', response.status, errorText);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });

  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
