// ============================================
// TRANSACTION BACKFILL API
// ============================================
// Creates transaction records for historical paid invoices
// that don't already have associated transactions
//
// POST - Backfill transactions from paid invoices
// GET - Preview what would be backfilled (dry run)
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { requireAdminAuth } from '../../../../lib/adminAuth';

// Get Supabase credentials at runtime for serverless
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// Generate receipt number (same logic as transactions/route.js)
async function generateReceiptNumber() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/generate_receipt_number`,
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

  // Fallback
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `KCD-${year}-${random}`;
}

// ============================================
// GET - Preview backfill (dry run)
// ============================================
export async function GET(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  try {
    // Get paid invoices
    const invoicesRes = await fetch(
      `${supabaseUrl}/rest/v1/invoices?status=eq.paid&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!invoicesRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    const paidInvoices = await invoicesRes.json();

    // Get existing transactions - check both invoice_id and description for Invoice matches
    // This handles cases where invoice_id column may not exist yet
    const txRes = await fetch(
      `${supabaseUrl}/rest/v1/transactions?select=invoice_id,description,type`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const existingTx = txRes.ok ? await txRes.json() : [];
    const existingInvoiceIds = new Set(existingTx.filter(t => t.invoice_id).map(t => t.invoice_id));
    // Also track invoices by description pattern (e.g., "Invoice INV-2026-0001")
    const existingInvoiceNumbers = new Set(
      existingTx
        .filter(t => t.type === 'invoice' && t.description)
        .map(t => t.description.replace(/^Invoice\s+/, ''))
    );

    // Filter to invoices that don't have transactions (by ID or invoice number)
    const invoicesNeedingBackfill = paidInvoices.filter(inv =>
      !existingInvoiceIds.has(inv.id) && !existingInvoiceNumbers.has(inv.invoice_number)
    );

    // Also get paid bookings without transactions
    const bookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?status=in.(paid,completed)&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const paidBookings = bookingsRes.ok ? await bookingsRes.json() : [];

    // Get existing transactions linked to bookings
    const txBookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/transactions?booking_id=not.is.null&select=booking_id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const existingBookingTx = txBookingsRes.ok ? await txBookingsRes.json() : [];
    const existingBookingIds = new Set(existingBookingTx.map(t => t.booking_id));

    // Filter to bookings that don't have transactions and don't have invoices (to avoid double-counting)
    const bookingsNeedingBackfill = paidBookings.filter(b =>
      !existingBookingIds.has(b.id) && !b.invoice_id
    );

    const totalAmount = invoicesNeedingBackfill.reduce((sum, inv) => sum + (inv.total_cents || 0), 0) +
      bookingsNeedingBackfill.reduce((sum, b) => sum + (b.total_cents || 0), 0);

    return NextResponse.json({
      preview: true,
      invoices: {
        total_paid: paidInvoices.length,
        already_have_transactions: paidInvoices.length - invoicesNeedingBackfill.length,
        need_backfill: invoicesNeedingBackfill.length,
        items: invoicesNeedingBackfill.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          customer_name: inv.customer_name,
          total_cents: inv.total_cents,
          paid_at: inv.paid_at || inv.updated_at,
        })),
      },
      bookings: {
        total_paid: paidBookings.length,
        already_have_transactions: paidBookings.length - bookingsNeedingBackfill.length,
        need_backfill: bookingsNeedingBackfill.length,
        items: bookingsNeedingBackfill.map(b => ({
          id: b.id,
          customer_name: b.customer_name,
          total_cents: b.total_cents,
          dumpster_size: b.dumpster_size,
        })),
      },
      total_to_backfill: invoicesNeedingBackfill.length + bookingsNeedingBackfill.length,
      total_amount_cents: totalAmount,
    });

  } catch (error) {
    console.error('Backfill preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// POST - Execute backfill
// ============================================
export async function POST(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  try {
    // Get paid invoices without transactions
    const invoicesRes = await fetch(
      `${supabaseUrl}/rest/v1/invoices?status=eq.paid&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!invoicesRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    const paidInvoices = await invoicesRes.json();

    // Get existing transactions - check both invoice_id and description
    const txRes = await fetch(
      `${supabaseUrl}/rest/v1/transactions?select=invoice_id,description,type`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const existingTx = txRes.ok ? await txRes.json() : [];
    const existingInvoiceIds = new Set(existingTx.filter(t => t.invoice_id).map(t => t.invoice_id));
    const existingInvoiceNumbers = new Set(
      existingTx
        .filter(t => t.type === 'invoice' && t.description)
        .map(t => t.description.replace(/^Invoice\s+/, ''))
    );

    const invoicesToBackfill = paidInvoices.filter(inv =>
      !existingInvoiceIds.has(inv.id) && !existingInvoiceNumbers.has(inv.invoice_number)
    );

    // Also get paid bookings without transactions or invoices
    const bookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?status=in.(paid,completed)&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const paidBookings = bookingsRes.ok ? await bookingsRes.json() : [];

    const txBookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/transactions?booking_id=not.is.null&select=booking_id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const existingBookingTx = txBookingsRes.ok ? await txBookingsRes.json() : [];
    const existingBookingIds = new Set(existingBookingTx.map(t => t.booking_id));

    const bookingsToBackfill = paidBookings.filter(b =>
      !existingBookingIds.has(b.id) && !b.invoice_id
    );

    const results = {
      invoices: { created: 0, failed: 0, errors: [] },
      bookings: { created: 0, failed: 0, errors: [] },
    };

    // Check if invoice_id column exists in transactions table
    let hasInvoiceIdColumn = true;
    const testRes = await fetch(
      `${supabaseUrl}/rest/v1/transactions?select=invoice_id&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    if (!testRes.ok) {
      const errText = await testRes.text();
      if (errText.includes('invoice_id') && errText.includes('does not exist')) {
        hasInvoiceIdColumn = false;
        console.log('Note: invoice_id column not found in transactions table. Skipping invoice_id links.');
      }
    }

    // Backfill invoices
    for (const inv of invoicesToBackfill) {
      try {
        const receipt_number = await generateReceiptNumber();

        const transactionData = {
          receipt_number,
          booking_id: inv.booking_id || null,
          customer_name: inv.customer_name || 'Customer',
          customer_phone: inv.customer_phone || null,
          customer_email: inv.customer_email || null,
          amount_cents: inv.total_cents || 0,
          description: `Invoice ${inv.invoice_number}`,
          type: 'invoice',
          service_address: inv.service_address || null,
          dumpster_size: inv.dumpster_size || null,
          rental_duration: inv.rental_duration || null,
          delivery_date: inv.delivery_date || null,
          payment_method: 'card', // Assume card for historical
          status: 'completed',
          paid_at: inv.paid_at || inv.updated_at || new Date().toISOString(),
          created_at: inv.paid_at || inv.updated_at || new Date().toISOString(),
        };

        // Only include invoice_id if the column exists
        if (hasInvoiceIdColumn) {
          transactionData.invoice_id = inv.id;
        }

        const createRes = await fetch(
          `${supabaseUrl}/rest/v1/transactions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify(transactionData),
          }
        );

        if (createRes.ok) {
          results.invoices.created++;
          console.log(`Backfilled transaction for invoice ${inv.invoice_number}`);
        } else {
          results.invoices.failed++;
          const errorText = await createRes.text();
          results.invoices.errors.push({ invoice: inv.invoice_number, error: errorText });
        }
      } catch (err) {
        results.invoices.failed++;
        results.invoices.errors.push({ invoice: inv.invoice_number, error: err.message });
      }
    }

    // Backfill bookings (only those without invoices)
    for (const booking of bookingsToBackfill) {
      try {
        const receipt_number = await generateReceiptNumber();

        const transactionData = {
          receipt_number,
          booking_id: booking.id,
          customer_name: booking.customer_name || 'Customer',
          customer_phone: booking.customer_phone || null,
          customer_email: booking.customer_email || null,
          amount_cents: booking.total_cents || 0,
          description: `${booking.dumpster_size} Dumpster Rental`,
          type: 'booking',
          service_address: booking.service_address || null,
          dumpster_size: booking.dumpster_size || null,
          rental_duration: booking.rental_duration || null,
          delivery_date: booking.delivery_date || null,
          payment_method: 'card',
          status: 'completed',
          paid_at: booking.paid_at || booking.updated_at || new Date().toISOString(),
          created_at: booking.paid_at || booking.updated_at || new Date().toISOString(),
        };

        const createRes = await fetch(
          `${supabaseUrl}/rest/v1/transactions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify(transactionData),
          }
        );

        if (createRes.ok) {
          results.bookings.created++;
          console.log(`Backfilled transaction for booking ${booking.id}`);
        } else {
          results.bookings.failed++;
          const errorText = await createRes.text();
          results.bookings.errors.push({ booking_id: booking.id, error: errorText });
        }
      } catch (err) {
        results.bookings.failed++;
        results.bookings.errors.push({ booking_id: booking.id, error: err.message });
      }
    }

    const totalCreated = results.invoices.created + results.bookings.created;
    const totalFailed = results.invoices.failed + results.bookings.failed;

    console.log(`Backfill complete: ${totalCreated} created, ${totalFailed} failed`);

    return NextResponse.json({
      success: true,
      message: `Backfilled ${totalCreated} transactions`,
      results,
      total_created: totalCreated,
      total_failed: totalFailed,
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
