// ============================================
// PARSE INVOICES API - Parse Excel without saving to database
// ============================================
// Specifically designed for King City Disposal invoice format

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { logger } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

// ============================================
// Parse Invoice Tracker sheet for payment info
// ============================================
function parseInvoiceTracker(workbook) {
  const trackerSheet = workbook.Sheets['Invoice Tracker'];
  if (!trackerSheet) return {};

  const data = XLSX.utils.sheet_to_json(trackerSheet, { header: 1, defval: '' });
  const paymentInfo = {};

  // Skip header row (row 0)
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

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  // If it's a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // If it's a string, try to parse it
  const str = String(value).trim();

  // MM/DD/YYYY format
  let match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY-MM-DD format
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

  // Get cell value helper
  const getCell = (row, col) => {
    if (row < 0 || row >= data.length) return '';
    if (!data[row] || col < 0 || col >= data[row].length) return '';
    return String(data[row][col] || '').trim();
  };

  const invoice = {
    invoice_number: sheetName, // Use sheet name as invoice number (it's the invoice #)
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
  // Format: C2="Invoice No :" C3="4621"
  const invoiceNoLabel = getCell(2, 2).toLowerCase();
  if (invoiceNoLabel.includes('invoice no')) {
    const invoiceNo = getCell(2, 3);
    if (invoiceNo && /^\d+$/.test(invoiceNo)) {
      invoice.invoice_number = invoiceNo;
    }
  }

  // Row 3: Date
  // Format: C2="Date :" C3=46041 (Excel serial)
  const dateLabel = getCell(3, 2).toLowerCase();
  if (dateLabel.includes('date')) {
    const dateVal = data[3]?.[3];
    invoice.invoice_date = parseExcelDate(dateVal);
  }

  // Row 4: Customer ID
  // Format: C2="Customer ID :" C3="WOODLAWN"
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

  // Row 11: Customer Phone (C0) - NOT C3 which is King City's billing number!
  const phoneVal = getCell(11, 0);
  if (phoneVal && /^\d{10}$/.test(phoneVal.replace(/\D/g, ''))) {
    const digits = phoneVal.replace(/\D/g, '');
    // Make sure it's not King City's phone
    if (!['6182318481', '6182318380'].includes(digits)) {
      invoice.customer_phone = digits;
    }
  }

  // Row 12-15: Job info
  // R12 is header row: "Purchase Order" | "Job" | "Payment Terms" | "Due Date"
  // R13 C1 has job description
  const jobDesc = getCell(13, 1);
  if (jobDesc && !jobDesc.toLowerCase().includes('due upon') && !jobDesc.toLowerCase().includes('payment')) {
    invoice.service_description = jobDesc;
  }

  // R15 C1 might have service address or contact info
  const r15c1 = getCell(15, 1);
  if (r15c1) {
    if (r15c1.toLowerCase().startsWith('contact')) {
      // It's contact info, store in notes
      invoice.notes = r15c1;
    } else if (r15c1.match(/\d+.*(?:st|rd|ave|blvd|dr|ln|way|ct|circle)/i) || r15c1.match(/[A-Z][a-z]+,?\s+[A-Z]{2}/)) {
      // Looks like an address
      invoice.service_address = r15c1;
    }
  }

  // Find line items - look for "Quantity" header row
  let lineItemsStartRow = -1;
  for (let row = 15; row < Math.min(25, data.length); row++) {
    if (getCell(row, 0).toLowerCase() === 'quantity' && getCell(row, 1).toLowerCase() === 'description') {
      lineItemsStartRow = row + 1;
      break;
    }
  }

  // Parse line items
  if (lineItemsStartRow > 0) {
    for (let row = lineItemsStartRow; row < data.length; row++) {
      const qty = parseFloat(getCell(row, 0)) || 0;
      const desc = getCell(row, 1);
      const unitPrice = parseFloat(getCell(row, 2)) || 0;
      const lineTotal = parseFloat(getCell(row, 3)) || 0;

      // Stop if we hit subtotal/total section
      if (getCell(row, 2).toLowerCase().includes('subtotal') ||
          getCell(row, 0).toLowerCase().includes('total') ||
          getCell(row, 0).toLowerCase().includes('payment')) {
        break;
      }

      // Skip rows without description or with 0 total
      if (!desc || lineTotal <= 0) continue;

      // Skip informational rows
      if (desc.toLowerCase().includes('includes') ||
          desc.toLowerCase().includes('overages may be') ||
          desc.toLowerCase().includes('overage per ton')) {
        continue;
      }

      // Extract dumpster size from description
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

  // Find total - look for "TOTAL" in column 0 or "Subtotal" in column 2
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

  // If no total found, sum line items
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

    // Extract check number from payment method (e.g., "Ck# 5144")
    if (trackerInfo.payment_method) {
      const ckMatch = trackerInfo.payment_method.match(/[Cc]k?#?\s*(\d+)/);
      if (ckMatch) {
        invoice.check_number = ckMatch[1];
        invoice.payment_method = 'check';
      } else if (trackerInfo.payment_method.toLowerCase().includes('ach')) {
        invoice.payment_method = 'ach';
      } else if (trackerInfo.payment_method.toLowerCase() === 'sq') {
        invoice.payment_method = 'card'; // Square = card
      }
    }

    // Use tracker total if our parsing didn't get it right
    if (trackerInfo.total > 0 && (!invoice.total_cents || invoice.total_cents === 0)) {
      invoice.total_cents = Math.round(trackerInfo.total * 100);
      invoice.subtotal_cents = invoice.total_cents;
    }
  }

  // Skip if no meaningful data
  if (!invoice.customer_name && !invoice.total_cents) {
    return null;
  }

  // Default customer name if empty
  if (!invoice.customer_name) {
    invoice.customer_name = trackerInfo?.customer || 'Unknown Customer';
  }

  return invoice;
}

// ============================================
// POST - Parse Excel file and return data for review
// ============================================
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

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

    // First, parse Invoice Tracker for payment info
    const paymentInfo = parseInvoiceTracker(workbook);
    console.log('Payment info loaded for', Object.keys(paymentInfo).length, 'invoices');

    const invoices = [];
    const skipped = [];

    // Only process sheets that are invoice numbers (4-digit numbers)
    const invoiceSheets = workbook.SheetNames.filter(name => /^\d{4}$/.test(name));
    console.log('Found', invoiceSheets.length, 'invoice sheets');

    for (const sheetName of invoiceSheets) {
      try {
        const sheet = workbook.Sheets[sheetName];
        const invoiceData = parseInvoiceSheet(sheet, sheetName, paymentInfo);

        if (!invoiceData) {
          skipped.push({ sheet: sheetName, reason: 'Could not parse invoice data' });
          continue;
        }

        invoices.push({
          ...invoiceData,
          _sheetName: sheetName,
        });

      } catch (sheetError) {
        console.error(`Error parsing sheet ${sheetName}:`, sheetError);
        skipped.push({ sheet: sheetName, reason: sheetError.message });
      }
    }

    // Also note which sheets were intentionally skipped
    const nonInvoiceSheets = workbook.SheetNames.filter(name => !/^\d{4}$/.test(name));
    for (const name of nonInvoiceSheets) {
      skipped.push({ sheet: name, reason: 'Not an invoice sheet (tracking/template)' });
    }

    return NextResponse.json({
      success: true,
      total_sheets: workbook.SheetNames.length,
      invoice_sheets: invoiceSheets.length,
      parsed_count: invoices.length,
      skipped_count: skipped.length,
      skipped_sheets: skipped,
      invoices,
    });

  } catch (error) {
    console.error('Invoice parse error:', error);
    logger.error('Invoice parse error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
