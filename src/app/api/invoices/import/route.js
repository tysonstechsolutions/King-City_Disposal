// ============================================
// CUSTOMER INVOICE IMPORT API - Import historical invoices from Excel
// ============================================
// Parse Excel (XLSX) files containing customer invoices (revenue)

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import * as XLSX from 'xlsx';
import { logger } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// Parse a single Excel sheet into customer invoice data
// ============================================
function parseCustomerInvoiceSheet(sheet, sheetName) {
  // Convert sheet to JSON array
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (data.length < 2) {
    return null; // Empty or header-only sheet
  }

  // Initialize invoice data
  const invoice = {
    invoice_number: '',
    invoice_date: null,
    due_date: null,
    customer_id_code: '', // Customer ID like "MOOND"
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
    notes: `Imported from sheet: ${sheetName}`,
    status: 'paid', // Historical invoices are likely paid
  };

  // Helper: Extract value after colon/equals from a cell
  const extractValueAfterDelimiter = (cellValue) => {
    const str = String(cellValue || '');
    const match = str.match(/[:.]\s*(.+)$/);
    return match ? match[1].trim() : null;
  };

  // Scan ALL cells and build index
  const allText = [];
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cellStr = String(row[colIdx] || '').trim();
      if (cellStr) {
        allText.push({ row: rowIdx, col: colIdx, value: cellStr, lower: cellStr.toLowerCase() });
      }
    }
  }

  // Extract invoice number - "Invoice No.: 4596"
  for (const cell of allText) {
    if (!invoice.invoice_number) {
      if (cell.lower.includes('invoice no') || cell.lower.includes('invoice #') ||
          cell.lower.includes('invoice:') || cell.lower.match(/^invoice\s*[:#]/)) {
        const extracted = extractValueAfterDelimiter(cell.value);
        if (extracted) {
          invoice.invoice_number = extracted;
        } else {
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) invoice.invoice_number = String(nextCell).trim();
        }
      }
    }
  }

  // Extract date - "Date: 1/4/2026"
  for (const cell of allText) {
    if (!invoice.invoice_date) {
      if ((cell.lower.includes('date') && !cell.lower.includes('due date')) ||
          cell.lower.match(/^date\s*[:#]/)) {
        const extracted = extractValueAfterDelimiter(cell.value);
        if (extracted) {
          const parsed = parseDate(extracted);
          if (parsed) invoice.invoice_date = parsed;
        } else {
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) {
            const parsed = parseDate(nextCell);
            if (parsed) invoice.invoice_date = parsed;
          }
        }
      }
    }
  }

  // Extract due date
  for (const cell of allText) {
    if (!invoice.due_date) {
      if (cell.lower.includes('due date')) {
        const extracted = extractValueAfterDelimiter(cell.value);
        if (extracted) {
          const parsed = parseDate(extracted);
          if (parsed) invoice.due_date = parsed;
        } else {
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) {
            const parsed = parseDate(nextCell);
            if (parsed) invoice.due_date = parsed;
          }
        }
      }
    }
  }

  // Extract Customer ID - "Customer ID: MOOND"
  for (const cell of allText) {
    if (!invoice.customer_id_code) {
      if (cell.lower.includes('customer id') || cell.lower.includes('customer #') || cell.lower.includes('cust id')) {
        const extracted = extractValueAfterDelimiter(cell.value);
        if (extracted) {
          invoice.customer_id_code = extracted;
        } else {
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) invoice.customer_id_code = String(nextCell).trim();
        }
      }
    }
  }

  // Extract customer name - Look for company names that aren't King City
  // Usually after a row containing address info, or in "Job" field
  for (const cell of allText) {
    if (cell.row < 12) {
      // Check for "Job" field
      if (cell.lower === 'job' || cell.lower.includes('job:')) {
        const nextCell = data[cell.row]?.[cell.col + 1];
        const belowCell = data[cell.row + 1]?.[cell.col];
        if (nextCell && String(nextCell).trim().length > 2) {
          if (!invoice.customer_name) invoice.customer_name = String(nextCell).trim();
          // Check below for address
          if (belowCell) invoice.service_address = String(belowCell).trim();
        } else if (belowCell && String(belowCell).trim().length > 2) {
          if (!invoice.customer_name) invoice.customer_name = String(belowCell).trim();
        }
      }

      // Look for company names with addresses below (not King City)
      if (!invoice.customer_name && cell.row >= 1 && cell.row <= 10) {
        const belowCell = data[cell.row + 1]?.[cell.col];
        const belowStr = String(belowCell || '').toLowerCase();
        if (belowStr.match(/\d+\s+\w+|ave|street|st\b|rd\b|blvd|suite|ste\b/i)) {
          const companyName = cell.value;
          if (!companyName.toLowerCase().includes('king city') &&
              companyName.length > 3 &&
              !companyName.toLowerCase().match(/^(invoice|date|email|phone|fax|billing|purchase)/)) {
            invoice.customer_name = companyName;
            invoice.customer_address = String(belowCell).trim();
            // Check for city/state/zip line
            const addr2 = data[cell.row + 2]?.[cell.col];
            if (addr2 && String(addr2).match(/[a-z]{2}\s*\d{5}/i)) {
              invoice.customer_address += ', ' + String(addr2).trim();
            }
          }
        }
      }
    }
  }

  // Extract billing phone - look for phone patterns near "billing" or "phone" labels
  for (const cell of allText) {
    if (!invoice.customer_phone) {
      // Check for phone number patterns
      const phoneMatch = cell.value.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch) {
        // Make sure it's actually a phone field, not a currency field
        const isCurrencyField = cell.lower.includes('total') || cell.lower.includes('amount') ||
                                cell.lower.includes('price') || cell.lower.includes('subtotal') ||
                                cell.lower.includes('$') || cell.value.includes('$');

        // Check if it's near a phone/billing label
        const isPhoneField = cell.lower.includes('phone') || cell.lower.includes('tel') ||
                            cell.lower.includes('mobile') || cell.lower.includes('cell');

        // Also check adjacent cells for phone labels
        const prevCell = allText.find(c => c.row === cell.row && c.col === cell.col - 1);
        const prevCellIsPhoneLabel = prevCell && (prevCell.lower.includes('phone') || prevCell.lower.includes('billing'));

        if ((isPhoneField || prevCellIsPhoneLabel) && !isCurrencyField) {
          invoice.customer_phone = phoneMatch[0].replace(/\D/g, '');
        }
      }
    }
  }

  // Fallback: Look for standalone phone patterns in customer info area (rows 1-15)
  if (!invoice.customer_phone) {
    for (const cell of allText) {
      if (cell.row <= 15 && cell.row >= 1) {
        const phoneMatch = cell.value.match(/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/);
        if (phoneMatch && !cell.value.includes('$')) {
          invoice.customer_phone = phoneMatch[0].replace(/\D/g, '');
          break;
        }
      }
    }
  }

  // Extract email
  for (const cell of allText) {
    if (cell.lower.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)) {
      const emailMatch = cell.value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch && !emailMatch[0].includes('kingcitydisposal')) {
        invoice.customer_email = emailMatch[0];
      }
    }
  }

  // Find line items columns
  let lineTotalColIdx = -1;
  let unitPriceColIdx = -1;
  let descriptionColIdx = -1;
  let quantityColIdx = -1;

  for (const cell of allText) {
    if (cell.lower === 'line total' || cell.lower.includes('line total')) lineTotalColIdx = cell.col;
    if (cell.lower === 'unit price' || cell.lower.includes('unit price')) unitPriceColIdx = cell.col;
    if (cell.lower === 'description') descriptionColIdx = cell.col;
    if (cell.lower === 'quantity' || cell.lower === 'qty') quantityColIdx = cell.col;
  }

  // Extract line items
  if (lineTotalColIdx >= 0) {
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      const lineTotalRaw = row[lineTotalColIdx];
      const lineTotal = parseCurrency(lineTotalRaw);

      // Skip if line total is 0 or looks like a phone number (10 digits)
      const lineTotalStr = String(lineTotalRaw || '').replace(/\D/g, '');
      const looksLikePhone = lineTotalStr.length === 10 && /^\d{10}$/.test(lineTotalStr);

      if (lineTotal > 0 && !looksLikePhone) {
        // Find description
        let description = '';
        if (descriptionColIdx >= 0 && row[descriptionColIdx]) {
          description = String(row[descriptionColIdx]).trim();
        } else {
          // Look for text in earlier columns
          for (let c = 0; c < lineTotalColIdx; c++) {
            const cellVal = String(row[c] || '').trim();
            if (cellVal.length > 2 && !cellVal.match(/^\d+$/) &&
                !cellVal.match(/^\$/) && cellVal.toLowerCase() !== 'quantity') {
              description = cellVal;
            }
          }
        }

        // Skip non-service descriptions (billing info, phone labels, header rows, etc.)
        const skipDescriptions = [
          'description', 'billing', 'phone', 'fax', 'email', 'address', 'contact',
          'total', 'subtotal', 'tax', 'quantity', 'unit price', 'line total',
          'purchase order', 'job', 'payment terms', 'due date', 'customer id',
          'invoice no', 'date', 'make all checks', 'thank you', 'payments over',
          'credit card fee', 'family owned', 'king city'
        ];
        const descLower = description.toLowerCase();
        const isSkippedDescription = skipDescriptions.some(skip =>
          descLower === skip ||
          descLower.startsWith(skip + ':') ||
          descLower.startsWith(skip + ' ')
        );

        // Also skip if description contains a phone number pattern
        const hasPhoneNumber = /\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4}/.test(description);

        if (description && !isSkippedDescription && !hasPhoneNumber) {
          const qty = quantityColIdx >= 0 ? parseFloat(row[quantityColIdx]) || 1 : 1;
          const unitPrice = unitPriceColIdx >= 0 ? parseCurrency(row[unitPriceColIdx]) : lineTotal;

          invoice.line_items.push({
            description,
            quantity: qty,
            unit_price_cents: unitPrice,
            amount_cents: lineTotal,
          });

          // Check for dumpster size in description
          const sizeMatch = description.match(/(\d+)\s*(?:yard|yd|cu)/i);
          if (sizeMatch && !invoice.dumpster_size) {
            invoice.dumpster_size = sizeMatch[1];
          }

          // Check for delivery/rental description
          if (description.toLowerCase().includes('delivery') ||
              description.toLowerCase().includes('rental')) {
            invoice.service_description = description;
          }
        }
      }
    }
  }

  // Extract TOTAL
  for (let rowIdx = data.length - 1; rowIdx >= 0; rowIdx--) {
    const row = data[rowIdx];
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = String(row[colIdx] || '').toLowerCase().trim();

      // Look for "TOTAL" cell
      if (cell === 'total' && !invoice.total_cents) {
        for (let i = colIdx + 1; i < row.length; i++) {
          const val = row[i];
          if (val) {
            const amount = parseCurrency(val);
            if (amount > 0) {
              invoice.total_cents = amount;
              break;
            }
          }
        }
      }

      // Look for Subtotal
      if (cell === 'subtotal' && !invoice.subtotal_cents) {
        for (let i = colIdx + 1; i < row.length; i++) {
          const val = row[i];
          if (val) {
            const amount = parseCurrency(val);
            if (amount > 0) {
              invoice.subtotal_cents = amount;
              break;
            }
          }
        }
      }
    }
  }

  // If no total found, sum line items
  if (!invoice.total_cents && invoice.line_items.length > 0) {
    invoice.total_cents = invoice.line_items.reduce((sum, item) => sum + item.amount_cents, 0);
  }

  // If no subtotal, use total
  if (!invoice.subtotal_cents) {
    invoice.subtotal_cents = invoice.total_cents;
  }

  // Only return if we have essential data
  if (!invoice.total_cents && !invoice.invoice_number) {
    return null;
  }

  // Use customer ID code as name fallback
  if (!invoice.customer_name && invoice.customer_id_code) {
    invoice.customer_name = invoice.customer_id_code;
  }

  return invoice;
}

// ============================================
// Helper: Parse date from various formats
// ============================================
function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  const str = String(value).trim();

  // MM/DD/YYYY
  let match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  match = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// ============================================
// Helper: Parse currency value to cents
// ============================================
function parseCurrency(value) {
  if (!value) return 0;

  if (typeof value === 'number') {
    // Skip if it looks like a phone number (10 digits, large number with no cents)
    if (value >= 1000000000 && value <= 9999999999 && Number.isInteger(value)) {
      return 0; // Likely a phone number
    }
    return Math.round(value * 100);
  }

  const str = String(value).replace(/[$,\s]/g, '');

  // Skip if it looks like a phone number (10 consecutive digits)
  if (/^\d{10}$/.test(str)) {
    return 0; // Likely a phone number
  }

  const num = parseFloat(str);

  return isNaN(num) ? 0 : Math.round(num * 100);
}

// ============================================
// Try to find matching customer in database
// Checks: customer_code, name+address, phone, name alone
// ============================================
async function findCustomer(invoice) {
  try {
    // Try to match by customer ID code first
    if (invoice.customer_id_code) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/customers?customer_code=ilike.${encodeURIComponent(invoice.customer_id_code)}`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );
      if (response.ok) {
        const customers = await response.json();
        if (customers.length > 0) return customers[0];
      }
    }

    // Try to match by name AND address (most reliable for repeat customers)
    if (invoice.customer_name && invoice.customer_address) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/customers?name=ilike.%${encodeURIComponent(invoice.customer_name)}%&address=ilike.%${encodeURIComponent(invoice.customer_address.split(',')[0])}%`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );
      if (response.ok) {
        const customers = await response.json();
        if (customers.length > 0) return customers[0];
      }
    }

    // Try to match by phone
    if (invoice.customer_phone) {
      const phone = invoice.customer_phone.replace(/\D/g, '');
      const response = await fetch(
        `${supabaseUrl}/rest/v1/customers?phone=like.%${phone}%`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );
      if (response.ok) {
        const customers = await response.json();
        if (customers.length > 0) return customers[0];
      }
    }

    // Try to match by name alone (less reliable but useful)
    if (invoice.customer_name) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/customers?name=ilike.%${encodeURIComponent(invoice.customer_name)}%`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );
      if (response.ok) {
        const customers = await response.json();
        if (customers.length > 0) return customers[0];
      }
    }
  } catch (e) {
    logger.error('Error finding customer', e);
  }

  return null;
}

// ============================================
// Create a new customer from invoice data
// ============================================
async function createCustomer(invoice) {
  try {
    // Don't create if no name
    if (!invoice.customer_name || invoice.customer_name === 'Unknown Customer') {
      return null;
    }

    const customerData = {
      name: invoice.customer_name,
      phone: invoice.customer_phone || null,
      email: invoice.customer_email || null,
      address: invoice.customer_address || null,
      customer_code: invoice.customer_id_code || null,
      notes: `Auto-created from invoice import`,
      created_at: new Date().toISOString(),
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(customerData),
      }
    );

    if (response.ok) {
      const [newCustomer] = await response.json();
      logger.info(`Created new customer: ${newCustomer.name} (ID: ${newCustomer.id})`);
      return newCustomer;
    } else {
      const errorText = await response.text();
      logger.error('Failed to create customer:', errorText);
    }
  } catch (e) {
    logger.error('Error creating customer', e);
  }

  return null;
}

// ============================================
// Check if invoice already exists
// ============================================
async function invoiceExists(invoiceNumber) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/invoices?invoice_number=eq.${encodeURIComponent(invoiceNumber)}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );
    if (response.ok) {
      const invoices = await response.json();
      return invoices.length > 0;
    }
  } catch (e) {
    logger.error('Error checking invoice existence', e);
  }
  return false;
}

// ============================================
// POST - Import Excel file with customer invoices
// ============================================
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const markAsPaid = formData.get('mark_as_paid') !== 'false'; // Default true for historical

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
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
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

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

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      try {
        const sheet = workbook.Sheets[sheetName];
        const invoiceData = parseCustomerInvoiceSheet(sheet, sheetName);

        if (!invoiceData) {
          results.skipped++;
          results.errors.push({ sheet: sheetName, error: 'Could not parse invoice data' });
          continue;
        }

        // Generate invoice number if not found
        if (!invoiceData.invoice_number) {
          invoiceData.invoice_number = `IMP-${Date.now()}-${results.imported}`;
        }

        // Check for duplicates
        const exists = await invoiceExists(invoiceData.invoice_number);
        if (exists) {
          results.duplicates++;
          results.errors.push({ sheet: sheetName, error: `Invoice ${invoiceData.invoice_number} already exists` });
          continue;
        }

        // Try to find matching customer, or create a new one
        let customer = await findCustomer(invoiceData);
        let customerCreated = false;

        if (customer) {
          results.customers_matched++;
        } else {
          // No existing customer found - create a new one
          customer = await createCustomer(invoiceData);
          if (customer) {
            customerCreated = true;
            results.customers_created++;
          }
        }

        // Build invoice record
        const invoiceRecord = {
          invoice_number: invoiceData.invoice_number,
          customer_id: customer?.id || null,
          customer_name: invoiceData.customer_name || customer?.name || 'Unknown Customer',
          customer_phone: invoiceData.customer_phone || customer?.phone || null,
          customer_email: invoiceData.customer_email || customer?.email || null,
          customer_address: invoiceData.customer_address || customer?.address || null,
          service_address: invoiceData.service_address || invoiceData.customer_address || null,
          service_description: invoiceData.service_description || null,
          dumpster_size: invoiceData.dumpster_size || null,
          line_items: JSON.stringify(invoiceData.line_items),
          subtotal_cents: invoiceData.subtotal_cents,
          tax_cents: invoiceData.tax_cents,
          discount_cents: invoiceData.discount_cents,
          total_cents: invoiceData.total_cents,
          amount_paid_cents: markAsPaid ? invoiceData.total_cents : 0,
          balance_due_cents: markAsPaid ? 0 : invoiceData.total_cents,
          // Due date: use parsed due date, or null for "Due Upon Receipt"
          // Late fees don't apply until 30 days after invoice date (handled by late fee cron)
          due_date: invoiceData.due_date || null,
          invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
          notes: invoiceData.notes,
          status: markAsPaid ? 'paid' : 'sent',
          paid_at: markAsPaid ? new Date().toISOString() : null,
          created_at: invoiceData.invoice_date ? new Date(invoiceData.invoice_date).toISOString() : new Date().toISOString(),
        };

        // Insert invoice
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
            body: JSON.stringify(invoiceRecord),
          }
        );

        if (response.ok) {
          const [created] = await response.json();
          results.imported++;
          results.invoices.push({
            id: created.id,
            invoice_number: invoiceData.invoice_number,
            customer: invoiceData.customer_name,
            customer_id: customer?.id || null,
            customer_created: customerCreated,
            date: invoiceData.invoice_date,
            total: invoiceData.total_cents / 100,
            matched_customer: customer && !customerCreated,
          });
        } else {
          const errorText = await response.text();
          results.errors.push({ sheet: sheetName, error: errorText });
          results.skipped++;
        }

      } catch (sheetError) {
        results.errors.push({ sheet: sheetName, error: sheetError.message });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} of ${results.total_sheets} invoices`,
      ...results,
    });

  } catch (error) {
    logger.error('Invoice import error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
