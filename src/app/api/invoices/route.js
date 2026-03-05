// ============================================
// INVOICE API ROUTES
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../config';
import { invoiceCreateSchema, validateInput } from '../../../lib/validations';
import { requireAdminAuth } from '../../../lib/adminAuth';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// GENERATE INVOICE NUMBER
// ============================================
async function generateInvoiceNumber() {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/generate_invoice_number`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
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

  try {
    // Verify Supabase config
    if (!supabaseUrl || !getSupabaseKey()) {
      console.error('Supabase configuration missing for invoice creation');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Creating invoice with data:', {
      customer_name: body.customer_name,
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
      subtotal_cents,
      tax_cents = 0,
      cc_fee_cents = 0,
      discount_cents = 0,
      total_cents,
      due_date,
      notes,
      status = 'draft',
      sent_at,
    } = body;

    if (!customer_name || !line_items || line_items.length === 0) {
      return NextResponse.json(
        { error: 'Customer name and line items are required' },
        { status: 400 }
      );
    }

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

    const invoiceData = {
      invoice_number,
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
      invoice_date: invoice_date || today,
      date_set: date_set || delivery_date || today,
      weight_lbs,
      weight_included_lbs,
      overage_lbs,
      line_items: JSON.stringify(line_items),
      subtotal_cents,
      tax_cents,
      cc_fee_cents,
      discount_cents,
      total_cents: total_cents || subtotal_cents,
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
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
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

    // If linked to a booking, update the booking
    if (booking_id) {
      await fetch(
        `${supabaseUrl}/rest/v1/bookings?id=eq.${booking_id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
          body: JSON.stringify({
            invoice_id: invoice.id,
            invoiced_at: new Date().toISOString(),
          }),
        }
      );
    }

    console.log(`✅ Invoice created: ${invoice_number}`);

    return NextResponse.json({
      success: true,
      invoice,
      invoice_number,
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
    if (!supabaseUrl || !getSupabaseKey()) {
      console.error('Supabase configuration missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!getSupabaseKey()
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
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
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
        return {
          ...inv,
          line_items: parsedLineItems
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
