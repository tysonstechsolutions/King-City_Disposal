// ============================================
// IMPORT INVOICES API - Parse and import Excel directly to database
// ============================================
// Specifically designed for King City Disposal invoice format

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { config } from '../../../../config';
import { logger } from '../../../../lib/logger';
import { requireAdminAuth } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// Parse Invoice Tracker sheet for payment info
// ============================================
function parseInvoiceTracker(workbook) {
  const trackerSheet = workbook.Sheets['Invoice Tracker'];
  if (!trackerSheet) return {};

  const data = XLSX.utils.sheet_to_json(trackerSheet, { header: 1, defval: '' });
  const paymentInfo = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const invoiceNum = String(row[0] || '').trim();
    if (!invoiceNum || !/^\d+$/.test(invoiceNum)) continue;

    paymentInfo[invoiceNum] = {
      customer: row[1] || '',
      total: parseFloat(row[2]) || 0,
      is_paid: String(row[4] || '').toLowerCase() === 'x',
      date_paid: row[5] ? parseExcelDate(row[5]) : null,
      payment_method: row[6] || '',
      late_fees: parseFloat(row[7]) || 0,
      cc_fees: parseFloat(row[8]) || 0,
      payment_amount: parseFloat(row[9]) || 0,
    };
  }

  return paymentInfo;
}

// ============================================
// Parse Excel date (serial number or string)
// ============================================
function parseExcelDate(value) {
  if (!value) return null;

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  const str = String(value).trim();
  let match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  match = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

// ============================================
// Parse a single invoice sheet
// ============================================
function parseInvoiceSheet(sheet, sheetName, paymentInfo) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (data.length < 10) return null;

  const getCell = (row, col) => {
    if (row < 0 || row >= data.length) return '';
    if (!data[row] || col < 0 || col >= data[row].length) return '';
    return String(data[row][col] || '').trim();
  };

  const invoice = {
    invoice_number: sheetName,
    invoice_date: null,
    due_date: null,
    customer_id_code: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    service_address: '',
    service_description: '',
    dumpster_size: null,
    line_items: [],
    subtotal_cents: 0,
    tax_cents: 0,
    discount_cents: 0,
    total_cents: 0,
    notes: '',
    is_paid: false,
    date_paid: null,
    check_number: null,
    payment_method: null,
  };

  // Row 2: Invoice No
  const invoiceNoLabel = getCell(2, 2).toLowerCase();
  if (invoiceNoLabel.includes('invoice no')) {
    const invoiceNo = getCell(2, 3);
    if (invoiceNo && /^\d+$/.test(invoiceNo)) {
      invoice.invoice_number = invoiceNo;
    }
  }

  // Row 3: Date
  const dateLabel = getCell(3, 2).toLowerCase();
  if (dateLabel.includes('date')) {
    const dateVal = data[3]?.[3];
    invoice.invoice_date = parseExcelDate(dateVal);

    // Set due date to invoice date + 30 days (Due Upon Receipt with 30 day grace period)
    if (invoice.invoice_date) {
      const dueDate = new Date(invoice.invoice_date);
      dueDate.setDate(dueDate.getDate() + 30);
      invoice.due_date = dueDate.toISOString().split('T')[0];
    }
  }

  // Row 4: Customer ID
  const custIdLabel = getCell(4, 2).toLowerCase();
  if (custIdLabel.includes('customer id')) {
    invoice.customer_id_code = getCell(4, 3);
  }

  // Row 6: Customer Name
  invoice.customer_name = getCell(6, 0);

  // Row 7-8: Customer Address
  const addrLine1 = getCell(7, 0);
  const addrLine2 = getCell(8, 0);
  if (addrLine1 || addrLine2) {
    invoice.customer_address = [addrLine1, addrLine2].filter(Boolean).join(', ');
  }

  // Row 11: Customer Phone (C0)
  const phoneVal = getCell(11, 0);
  if (phoneVal && /^\d{10}$/.test(phoneVal.replace(/\D/g, ''))) {
    const digits = phoneVal.replace(/\D/g, '');
    if (!['6182318481', '6182318380'].includes(digits)) {
      invoice.customer_phone = digits;
    }
  }

  // Row 13: Job description
  const jobDesc = getCell(13, 1);
  if (jobDesc && !jobDesc.toLowerCase().includes('due upon') && !jobDesc.toLowerCase().includes('payment')) {
    invoice.service_description = jobDesc;
  }

  // Row 15: Service address or contact
  const r15c1 = getCell(15, 1);
  if (r15c1) {
    if (r15c1.toLowerCase().startsWith('contact')) {
      invoice.notes = r15c1;
    } else if (r15c1.match(/\d+.*(?:st|rd|ave|blvd|dr|ln|way|ct|circle)/i) || r15c1.match(/[A-Z][a-z]+,?\s+[A-Z]{2}/)) {
      invoice.service_address = r15c1;
    }
  }

  // Find line items
  let lineItemsStartRow = -1;
  for (let row = 15; row < Math.min(25, data.length); row++) {
    if (getCell(row, 0).toLowerCase() === 'quantity' && getCell(row, 1).toLowerCase() === 'description') {
      lineItemsStartRow = row + 1;
      break;
    }
  }

  if (lineItemsStartRow > 0) {
    for (let row = lineItemsStartRow; row < data.length; row++) {
      const qty = parseFloat(getCell(row, 0)) || 0;
      const desc = getCell(row, 1);
      const unitPrice = parseFloat(getCell(row, 2)) || 0;
      const lineTotal = parseFloat(getCell(row, 3)) || 0;

      if (getCell(row, 2).toLowerCase().includes('subtotal') ||
          getCell(row, 0).toLowerCase().includes('total') ||
          getCell(row, 0).toLowerCase().includes('payment')) {
        break;
      }

      if (!desc || lineTotal <= 0) continue;

      if (desc.toLowerCase().includes('includes') ||
          desc.toLowerCase().includes('overages may be') ||
          desc.toLowerCase().includes('overage per ton')) {
        continue;
      }

      const sizeMatch = desc.match(/(\d+)\s*[Yy](?:ar)?d/);
      if (sizeMatch && !invoice.dumpster_size) {
        invoice.dumpster_size = sizeMatch[1];
      }

      invoice.line_items.push({
        description: desc,
        quantity: qty || 1,
        unit_price_cents: Math.round(unitPrice * 100),
        amount_cents: Math.round(lineTotal * 100),
      });
    }
  }

  // Find total
  for (let row = data.length - 1; row >= 20; row--) {
    const c0 = getCell(row, 0).toLowerCase();
    const c2 = getCell(row, 2).toLowerCase();
    const c3val = parseFloat(getCell(row, 3)) || 0;

    if (c0 === 'total' && c3val > 0) {
      invoice.total_cents = Math.round(c3val * 100);
      break;
    }
    if (c2 === 'subtotal' && c3val > 0 && !invoice.subtotal_cents) {
      invoice.subtotal_cents = Math.round(c3val * 100);
    }
  }

  if (!invoice.total_cents && invoice.line_items.length > 0) {
    invoice.total_cents = invoice.line_items.reduce((sum, item) => sum + item.amount_cents, 0);
  }

  if (!invoice.subtotal_cents) {
    invoice.subtotal_cents = invoice.total_cents;
  }

  // Get payment info from Invoice Tracker
  const trackerInfo = paymentInfo[invoice.invoice_number];
  if (trackerInfo) {
    invoice.is_paid = trackerInfo.is_paid;
    invoice.date_paid = trackerInfo.date_paid;
    invoice.payment_method = trackerInfo.payment_method;

    if (trackerInfo.payment_method) {
      const ckMatch = trackerInfo.payment_method.match(/[Cc]k?#?\s*(\d+)/);
      if (ckMatch) {
        invoice.check_number = ckMatch[1];
        invoice.payment_method = 'check';
      } else if (trackerInfo.payment_method.toLowerCase().includes('ach')) {
        invoice.payment_method = 'ach';
      } else if (trackerInfo.payment_method.toLowerCase() === 'sq') {
        invoice.payment_method = 'card';
      }
    }

    if (trackerInfo.total > 0 && (!invoice.total_cents || invoice.total_cents === 0)) {
      invoice.total_cents = Math.round(trackerInfo.total * 100);
      invoice.subtotal_cents = invoice.total_cents;
    }
  }

  if (!invoice.customer_name && !invoice.total_cents) {
    return null;
  }

  if (!invoice.customer_name) {
    invoice.customer_name = trackerInfo?.customer || 'Unknown Customer';
  }

  return invoice;
}

// ============================================
// Normalize customer name for comparison
// ============================================
function normalizeCustomerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[,.\-'"]/g, '') // Remove punctuation
    .replace(/\s+(inc|llc|ltd|corp|co|company)\.?\s*$/i, '') // Remove common suffixes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// ============================================
// Find or create customer
// ============================================
async function findOrCreateCustomer(invoice) {
  const key = getSupabaseKey();

  // Try to find by customer code first (most reliable)
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

  // Try to find by exact name match
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

  // Try fuzzy matching - fetch all customers and compare normalized names
  if (invoice.customer_name) {
    const normalizedInvoiceName = normalizeCustomerName(invoice.customer_name);
    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers?select=id,name,phone,email,address,customer_code`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      }
    );
    if (response.ok) {
      const customers = await response.json();
      // Find customer with matching normalized name
      const match = customers.find(c => normalizeCustomerName(c.name) === normalizedInvoiceName);
      if (match) {
        console.log(`Fuzzy matched "${invoice.customer_name}" to existing customer "${match.name}"`);
        return match;
      }
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
// POST - Import Excel invoices directly
// ============================================
export async function POST(request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const markAsPaidParam = formData.get('mark_as_paid');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name || 'unknown';
    const ext = fileName.toLowerCase().split('.').pop();

    if (ext !== 'xlsx' && ext !== 'xls') {
      return NextResponse.json({
        success: false,
        error: `Unsupported file format: .${ext}. Please upload an Excel file (.xlsx or .xls)`,
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });

    // Parse Invoice Tracker for payment info
    const paymentInfo = parseInvoiceTracker(workbook);

    const key = getSupabaseKey();
    const results = {
      total_sheets: workbook.SheetNames.length,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      customers_created: 0,
      customers_matched: 0,
      errors: [],
      invoices: [],
    };

    // Only process sheets that are invoice numbers
    const invoiceSheets = workbook.SheetNames.filter(name => /^\d{4}$/.test(name));

    for (const sheetName of invoiceSheets) {
      try {
        const sheet = workbook.Sheets[sheetName];
        const invoice = parseInvoiceSheet(sheet, sheetName, paymentInfo);

        if (!invoice) {
          results.skipped++;
          continue;
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
        const isPaid = markAsPaidParam === 'true' || invoice.is_paid;

        // Build invoice record
        const invoiceRecord = {
          invoice_number: invoice.invoice_number,
          customer_id: customer?.id || null,
          customer_name: invoice.customer_name || customer?.name || 'Unknown Customer',
          customer_phone: invoice.customer_phone || customer?.phone || null,
          customer_email: invoice.customer_email || customer?.email || null,
          customer_address: invoice.customer_address || customer?.address || null,
          service_address: invoice.service_address || null,
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
            date: invoice.invoice_date,
            status: isPaid ? 'paid' : 'unpaid',
          });
        } else {
          const errorText = await response.text();
          results.errors.push({ invoice: invoice.invoice_number, error: errorText });
          results.skipped++;
        }

      } catch (err) {
        results.errors.push({ invoice: sheetName, error: err.message });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} of ${invoiceSheets.length} invoices`,
      ...results,
    });

  } catch (error) {
    console.error('Import error:', error);
    logger.error('Import invoices error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
