// ============================================
// IMPORT REVIEWED INVOICES API - Save reviewed invoices to database
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { logger } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// Find or create customer
// ============================================
async function findOrCreateCustomer(invoice) {
  const key = getSupabaseKey();

  // Try to find by customer code
  if (invoice.customer_id_code) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers?customer_code=ilike.${encodeURIComponent(invoice.customer_id_code)}`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      }
    );
    if (response.ok) {
      const customers = await response.json();
      if (customers.length > 0) return customers[0];
    }
  }

  // Try to find by name
  if (invoice.customer_name) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers?name=ilike.${encodeURIComponent(invoice.customer_name)}`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      }
    );
    if (response.ok) {
      const customers = await response.json();
      if (customers.length > 0) return customers[0];
    }
  }

  // Create new customer
  if (invoice.customer_name && invoice.customer_name !== 'Unknown Customer') {
    const customerData = {
      name: invoice.customer_name,
      phone: invoice.customer_phone || null,
      email: invoice.customer_email || null,
      address: invoice.customer_address || null,
      customer_code: invoice.customer_id_code || null,
      notes: 'Auto-created from invoice import',
      created_at: new Date().toISOString(),
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(customerData),
      }
    );

    if (response.ok) {
      const [newCustomer] = await response.json();
      return { ...newCustomer, isNew: true };
    }
  }

  return null;
}

// ============================================
// Check if invoice exists
// ============================================
async function invoiceExists(invoiceNumber) {
  const key = getSupabaseKey();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/invoices?invoice_number=eq.${encodeURIComponent(invoiceNumber)}`,
    {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    }
  );
  if (response.ok) {
    const invoices = await response.json();
    return invoices.length > 0;
  }
  return false;
}

// ============================================
// POST - Save reviewed invoices
// ============================================
export async function POST(request) {
  try {
    const { invoices } = await request.json();

    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json({ error: 'No invoices provided' }, { status: 400 });
    }

    const key = getSupabaseKey();
    const results = {
      imported: 0,
      skipped: 0,
      duplicates: 0,
      customers_created: 0,
      customers_matched: 0,
      errors: [],
      invoices: [],
    };

    for (const invoice of invoices) {
      try {
        // Generate invoice number if missing
        if (!invoice.invoice_number) {
          invoice.invoice_number = `IMP-${Date.now()}-${results.imported}`;
        }

        // Check for duplicates
        const exists = await invoiceExists(invoice.invoice_number);
        if (exists) {
          results.duplicates++;
          results.errors.push({ invoice: invoice.invoice_number, error: 'Already exists' });
          continue;
        }

        // Find or create customer
        const customer = await findOrCreateCustomer(invoice);
        if (customer?.isNew) {
          results.customers_created++;
        } else if (customer) {
          results.customers_matched++;
        }

        // Determine status
        const isPaid = invoice.is_paid || invoice.status === 'paid';

        // Build invoice record
        const invoiceRecord = {
          invoice_number: invoice.invoice_number,
          customer_id: customer?.id || null,
          customer_name: invoice.customer_name || customer?.name || 'Unknown Customer',
          customer_phone: invoice.customer_phone || customer?.phone || null,
          customer_email: invoice.customer_email || customer?.email || null,
          customer_address: invoice.customer_address || customer?.address || null,
          service_address: invoice.service_address || invoice.customer_address || null,
          service_description: invoice.service_description || null,
          dumpster_size: invoice.dumpster_size || null,
          line_items: JSON.stringify(invoice.line_items || []),
          subtotal_cents: invoice.subtotal_cents || 0,
          tax_cents: invoice.tax_cents || 0,
          discount_cents: invoice.discount_cents || 0,
          total_cents: invoice.total_cents || 0,
          amount_paid_cents: isPaid ? invoice.total_cents : 0,
          balance_due_cents: isPaid ? 0 : invoice.total_cents,
          due_date: invoice.due_date || null,
          invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
          notes: invoice.notes || '',
          status: isPaid ? 'paid' : 'sent',
          paid_at: isPaid ? (invoice.date_paid || new Date().toISOString()) : null,
          check_number: invoice.check_number || null,
          created_at: invoice.invoice_date ? new Date(invoice.invoice_date).toISOString() : new Date().toISOString(),
        };

        // Insert invoice
        const response = await fetch(
          `${supabaseUrl}/rest/v1/invoices`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(invoiceRecord),
          }
        );

        if (response.ok) {
          const [created] = await response.json();
          results.imported++;
          results.invoices.push({
            id: created.id,
            invoice_number: invoice.invoice_number,
            customer: invoice.customer_name,
            total: invoice.total_cents / 100,
            status: isPaid ? 'paid' : 'unpaid',
          });
        } else {
          const errorText = await response.text();
          results.errors.push({ invoice: invoice.invoice_number, error: errorText });
          results.skipped++;
        }

      } catch (err) {
        results.errors.push({ invoice: invoice.invoice_number, error: err.message });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} of ${invoices.length} invoices`,
      ...results,
    });

  } catch (error) {
    logger.error('Import reviewed invoices error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
