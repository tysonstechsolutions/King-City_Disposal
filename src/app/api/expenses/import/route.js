// ============================================
// EXCEL IMPORT API - Multi-Sheet Invoice Import
// ============================================
// Parse Excel files with multiple sheets containing invoices

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// Vendor Corrections - Learn from past edits
// ============================================
async function getVendorCorrections() {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/vendor_corrections?select=*`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Error fetching vendor corrections:', e);
  }
  return [];
}

// Apply vendor corrections to parsed data
function applyVendorCorrections(data, corrections) {
  const corrected = { ...data };

  for (const correction of corrections) {
    // Match by vendor name (case insensitive partial match)
    const vendorName = (data.from_name || '').toLowerCase();
    const correctionVendor = (correction.vendor_name || '').toLowerCase();

    if (vendorName.includes(correctionVendor) || correctionVendor.includes(vendorName)) {
      // Apply corrections
      if (correction.corrected_name) {
        corrected.from_name = correction.corrected_name;
      }
      if (correction.corrected_phone) {
        corrected.from_phone = correction.corrected_phone;
      }
      if (correction.corrected_address) {
        corrected.from_address = correction.corrected_address;
      }
      if (correction.default_category) {
        corrected.expense_category = correction.default_category;
      }
      break; // Use first matching correction
    }
  }

  return corrected;
}

// ============================================
// Parse a single Excel sheet into invoice data
// ============================================
function parseSheet(sheet, sheetName) {
  // Convert sheet to JSON array
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (data.length < 2) {
    return null; // Empty or header-only sheet
  }

  // Initialize invoice data
  const invoice = {
    invoice_number: '',
    invoice_date: null,
    from_name: '',
    from_phone: '',
    from_address: '',
    to_name: 'King City Disposal',
    subtotal_cents: 0,
    tax_cents: 0,
    fees_cents: 0,
    total_cents: 0,
    expense_category: 'other',
    line_items: [],
    notes: `Imported from sheet: ${sheetName}`,
  };

  // Common keywords to look for
  const dateKeywords = ['date', 'invoice date', 'dated', 'bill date'];
  const invoiceNumKeywords = ['invoice', 'invoice #', 'invoice no', 'inv #', 'bill #', 'receipt #', 'ticket'];
  const vendorKeywords = ['from', 'vendor', 'company', 'sold by', 'billed from'];
  const phoneKeywords = ['phone', 'tel', 'telephone', 'contact'];
  const totalKeywords = ['total', 'amount due', 'balance due', 'grand total', 'amount', 'balance'];
  const subtotalKeywords = ['subtotal', 'sub-total', 'sub total'];
  const taxKeywords = ['tax', 'sales tax', 'vat'];
  const descKeywords = ['description', 'item', 'service', 'product', 'material'];
  const qtyKeywords = ['qty', 'quantity', 'units', 'count'];
  const priceKeywords = ['price', 'rate', 'unit price', 'cost', 'each'];
  const amountKeywords = ['amount', 'ext', 'extended', 'line total'];

  // Scan through all cells
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = String(row[colIdx] || '').toLowerCase().trim();
      const nextCell = colIdx + 1 < row.length ? row[colIdx + 1] : null;
      const nextRow = rowIdx + 1 < data.length ? data[rowIdx + 1] : null;

      // Look for invoice number
      if (invoiceNumKeywords.some(k => cell.includes(k)) && !invoice.invoice_number) {
        if (nextCell) {
          invoice.invoice_number = String(nextCell).trim();
        } else if (nextRow && nextRow[colIdx]) {
          invoice.invoice_number = String(nextRow[colIdx]).trim();
        }
        // Also check same cell after colon
        const colonMatch = String(row[colIdx]).match(/[:#]\s*(.+)/);
        if (colonMatch) {
          invoice.invoice_number = colonMatch[1].trim();
        }
      }

      // Look for date
      if (dateKeywords.some(k => cell.includes(k)) && !invoice.invoice_date) {
        let dateValue = nextCell || (nextRow && nextRow[colIdx]);
        if (dateValue) {
          const parsed = parseDate(dateValue);
          if (parsed) {
            invoice.invoice_date = parsed;
          }
        }
        // Check same cell after colon
        const colonMatch = String(row[colIdx]).match(/[:#]\s*(.+)/);
        if (colonMatch) {
          const parsed = parseDate(colonMatch[1]);
          if (parsed) {
            invoice.invoice_date = parsed;
          }
        }
      }

      // Look for vendor name
      if (vendorKeywords.some(k => cell.includes(k)) && !invoice.from_name) {
        if (nextCell && typeof nextCell === 'string' && nextCell.length > 2) {
          invoice.from_name = nextCell.trim();
        } else if (nextRow && nextRow[colIdx]) {
          invoice.from_name = String(nextRow[colIdx]).trim();
        }
      }

      // Look for phone
      if (phoneKeywords.some(k => cell.includes(k)) && !invoice.from_phone) {
        let phoneValue = nextCell || (nextRow && nextRow[colIdx]);
        if (phoneValue) {
          const phoneStr = String(phoneValue).replace(/\D/g, '');
          if (phoneStr.length >= 10) {
            invoice.from_phone = phoneStr;
          }
        }
      }

      // Look for total
      if (totalKeywords.some(k => cell === k || cell.endsWith(k))) {
        let totalValue = nextCell || (nextRow && nextRow[colIdx]);
        if (totalValue) {
          const amount = parseCurrency(totalValue);
          if (amount > 0) {
            invoice.total_cents = amount;
          }
        }
      }

      // Look for subtotal
      if (subtotalKeywords.some(k => cell.includes(k))) {
        let subtotalValue = nextCell || (nextRow && nextRow[colIdx]);
        if (subtotalValue) {
          const amount = parseCurrency(subtotalValue);
          if (amount > 0) {
            invoice.subtotal_cents = amount;
          }
        }
      }

      // Look for tax
      if (taxKeywords.some(k => cell.includes(k)) && !cell.includes('total')) {
        let taxValue = nextCell || (nextRow && nextRow[colIdx]);
        if (taxValue) {
          const amount = parseCurrency(taxValue);
          if (amount > 0) {
            invoice.tax_cents = amount;
          }
        }
      }
    }
  }

  // If no vendor found, try to get from first non-empty cell
  if (!invoice.from_name) {
    for (let rowIdx = 0; rowIdx < Math.min(10, data.length); rowIdx++) {
      for (let colIdx = 0; colIdx < data[rowIdx].length; colIdx++) {
        const cell = String(data[rowIdx][colIdx] || '').trim();
        if (cell.length > 3 && !cell.match(/^(date|invoice|total|amount|qty)/i)) {
          invoice.from_name = cell;
          break;
        }
      }
      if (invoice.from_name) break;
    }
  }

  // If no total, use subtotal
  if (!invoice.total_cents && invoice.subtotal_cents) {
    invoice.total_cents = invoice.subtotal_cents + invoice.tax_cents;
  }

  // If no subtotal, derive from total
  if (!invoice.subtotal_cents && invoice.total_cents) {
    invoice.subtotal_cents = invoice.total_cents - invoice.tax_cents;
  }

  // Try to detect category from vendor name or content
  invoice.expense_category = detectCategory(invoice.from_name, data);

  // Only return if we have at least some useful data
  if (!invoice.from_name && !invoice.total_cents && !invoice.invoice_number) {
    return null;
  }

  return invoice;
}

// ============================================
// Helper: Parse date from various formats
// ============================================
function parseDate(value) {
  if (!value) return null;

  // If it's already a Date object (Excel date)
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  // Try parsing string
  const str = String(value).trim();

  // Common date formats
  const formats = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // MM/DD/YYYY or MM-DD-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY-MM-DD
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,          // Month DD, YYYY
  ];

  // Try MM/DD/YYYY
  let match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD
  match = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try JS Date parsing
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
    return Math.round(value * 100);
  }

  const str = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(str);

  return isNaN(num) ? 0 : Math.round(num * 100);
}

// ============================================
// Helper: Detect expense category
// ============================================
function detectCategory(vendorName, data) {
  const text = vendorName.toLowerCase();
  const allText = JSON.stringify(data).toLowerCase();

  // Fuel
  if (text.includes('fuel') || text.includes('gas') || text.includes('diesel') ||
      text.includes('shell') || text.includes('bp') || text.includes('marathon') ||
      allText.includes('gallons') || allText.includes('fuel')) {
    return 'fuel';
  }

  // Landfill/Dump
  if (text.includes('landfill') || text.includes('dump') || text.includes('disposal') ||
      text.includes('waste') || text.includes('transfer') || allText.includes('tonnage') ||
      allText.includes('tons')) {
    return 'landfill';
  }

  // Maintenance/Repairs
  if (text.includes('repair') || text.includes('service') || text.includes('maint') ||
      text.includes('auto') || text.includes('truck') || text.includes('tire') ||
      text.includes('parts') || text.includes('mechanic')) {
    return 'maintenance';
  }

  // Insurance
  if (text.includes('insurance') || text.includes('insur') || text.includes('policy')) {
    return 'insurance';
  }

  // Office
  if (text.includes('office') || text.includes('supply') || text.includes('staples') ||
      text.includes('amazon')) {
    return 'office';
  }

  return 'other';
}

// ============================================
// POST - Import Excel file with multiple sheets
// ============================================
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    // Get vendor corrections for learning
    const vendorCorrections = await getVendorCorrections();

    const results = {
      total_sheets: workbook.SheetNames.length,
      imported: 0,
      skipped: 0,
      errors: [],
      invoices: [],
    };

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      try {
        const sheet = workbook.Sheets[sheetName];
        let invoiceData = parseSheet(sheet, sheetName);

        if (!invoiceData) {
          results.skipped++;
          results.errors.push({ sheet: sheetName, error: 'Could not parse invoice data' });
          continue;
        }

        // Apply vendor corrections
        invoiceData = applyVendorCorrections(invoiceData, vendorCorrections);

        // Determine tax year
        let taxYear = new Date().getFullYear();
        if (invoiceData.invoice_date) {
          const date = new Date(invoiceData.invoice_date);
          if (!isNaN(date.getTime())) {
            taxYear = date.getFullYear();
          }
        }

        // Create parsed_invoice record
        const insertData = {
          invoice_type: 'vendor_expense',
          status: 'pending', // Requires review before confirmed
          from_name: invoiceData.from_name || 'Unknown Vendor',
          from_phone: invoiceData.from_phone || null,
          from_address: invoiceData.from_address || null,
          to_name: invoiceData.to_name,
          invoice_number: invoiceData.invoice_number || `IMPORT-${sheetName}`,
          invoice_date: invoiceData.invoice_date,
          subtotal_cents: invoiceData.subtotal_cents,
          tax_cents: invoiceData.tax_cents,
          fees_cents: invoiceData.fees_cents,
          total_cents: invoiceData.total_cents,
          expense_category: invoiceData.expense_category,
          is_tax_deductible: true,
          tax_year: taxYear,
          line_items: JSON.stringify(invoiceData.line_items),
          notes: invoiceData.notes,
          parsed_at: new Date().toISOString(),
        };

        const response = await fetch(
          `${supabaseUrl}/rest/v1/parsed_invoices`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(insertData),
          }
        );

        if (response.ok) {
          const [created] = await response.json();
          results.imported++;
          results.invoices.push({
            id: created.id,
            sheet: sheetName,
            vendor: invoiceData.from_name,
            date: invoiceData.invoice_date,
            total: invoiceData.total_cents / 100,
            category: invoiceData.expense_category,
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
      message: `Imported ${results.imported} of ${results.total_sheets} sheets`,
      ...results,
    });

  } catch (error) {
    console.error('Excel import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
