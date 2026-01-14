// ============================================
// EXCEL & XML IMPORT API - Multi-Format Invoice Import
// ============================================
// Parse Excel (XLSX) and XML files containing invoices

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import * as XLSX from 'xlsx';
import { logger } from '../../../../lib/logger';

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
    logger.error('Error fetching vendor corrections', e);
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

  // Maintenance/Repairs (tires, oil changes, tune-ups, etc.)
  if (text.includes('repair') || text.includes('service') || text.includes('maint') ||
      text.includes('auto') || text.includes('truck') || text.includes('tire') ||
      text.includes('parts') || text.includes('mechanic') || text.includes('oil change') ||
      text.includes('lube') || text.includes('brake') || text.includes('transmission') ||
      text.includes('alignment') || text.includes('inspection') || text.includes('tune')) {
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
// XML Parsing Functions
// ============================================

// Simple XML parser without external dependencies
function parseXML(xmlString) {
  const result = {};

  // Remove XML declaration and comments
  const cleanXml = xmlString
    .replace(/<\?xml[^?]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  // Parse recursively
  return parseXMLNode(cleanXml);
}

function parseXMLNode(xml) {
  const result = {};

  // Match all tags
  const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^>]*)\/>/g;
  let match;

  while ((match = tagRegex.exec(xml)) !== null) {
    const tagName = match[1] || match[4];
    const content = match[3] || '';

    // Check if content contains more XML tags
    if (/<\w+/.test(content)) {
      // Recursive parse
      const parsed = parseXMLNode(content);
      if (result[tagName]) {
        // Convert to array if multiple same-named elements
        if (!Array.isArray(result[tagName])) {
          result[tagName] = [result[tagName]];
        }
        result[tagName].push(parsed);
      } else {
        result[tagName] = parsed;
      }
    } else {
      // Leaf node - store value
      const value = content.trim();
      if (result[tagName]) {
        if (!Array.isArray(result[tagName])) {
          result[tagName] = [result[tagName]];
        }
        result[tagName].push(value);
      } else {
        result[tagName] = value;
      }
    }
  }

  return result;
}

// Parse XML invoice data into standard format
function parseXMLInvoice(xmlData, filename) {
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
    notes: `Imported from XML: ${filename}`,
  };

  // Common XML field names to look for (case-insensitive search)
  const findValue = (obj, ...keys) => {
    if (!obj || typeof obj !== 'object') return null;

    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      for (const searchKey of keys) {
        if (lowerKey.includes(searchKey.toLowerCase())) {
          const val = obj[key];
          return typeof val === 'object' ? findValue(val, ...keys) : val;
        }
      }
      // Recurse into nested objects
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const found = findValue(obj[key], ...keys);
        if (found) return found;
      }
    }
    return null;
  };

  // Extract invoice number
  invoice.invoice_number = findValue(xmlData, 'invoicenumber', 'invoice_number', 'invoiceno', 'invoice_no', 'billnumber', 'bill_number', 'documentnumber', 'id') || '';

  // Extract date
  const dateStr = findValue(xmlData, 'invoicedate', 'invoice_date', 'date', 'billdate', 'documentdate', 'issuedate');
  if (dateStr) {
    invoice.invoice_date = parseDate(dateStr);
  }

  // Extract vendor info
  invoice.from_name = findValue(xmlData, 'vendorname', 'vendor_name', 'vendor', 'suppliername', 'supplier', 'company', 'from', 'sellername', 'seller') || '';
  invoice.from_phone = findValue(xmlData, 'vendorphone', 'phone', 'telephone', 'tel', 'contact') || '';
  invoice.from_address = findValue(xmlData, 'vendoraddress', 'address', 'street', 'location') || '';

  // Extract amounts
  const totalStr = findValue(xmlData, 'total', 'grandtotal', 'grand_total', 'amount', 'amountdue', 'balance', 'invoiceamount');
  if (totalStr) {
    invoice.total_cents = parseCurrency(totalStr);
  }

  const subtotalStr = findValue(xmlData, 'subtotal', 'sub_total', 'pretax', 'netamount');
  if (subtotalStr) {
    invoice.subtotal_cents = parseCurrency(subtotalStr);
  }

  const taxStr = findValue(xmlData, 'tax', 'salestax', 'vat', 'taxamount');
  if (taxStr) {
    invoice.tax_cents = parseCurrency(taxStr);
  }

  // If no subtotal, derive from total and tax
  if (!invoice.subtotal_cents && invoice.total_cents) {
    invoice.subtotal_cents = invoice.total_cents - invoice.tax_cents;
  }

  // Detect category
  invoice.expense_category = detectCategory(invoice.from_name, JSON.stringify(xmlData));

  // Try to extract line items
  const items = findValue(xmlData, 'items', 'lineitems', 'line_items', 'details');
  if (items && Array.isArray(items)) {
    invoice.line_items = items.map(item => ({
      description: findValue(item, 'description', 'desc', 'name', 'item') || '',
      quantity: parseFloat(findValue(item, 'quantity', 'qty', 'count') || '1'),
      unit_price: parseCurrency(findValue(item, 'price', 'unitprice', 'rate', 'cost') || '0'),
      amount: parseCurrency(findValue(item, 'amount', 'total', 'linetotal', 'extended') || '0'),
    }));
  }

  return invoice;
}

// Parse Excel XML format (SpreadsheetML)
function parseExcelXML(xmlData, filename) {
  const invoices = [];

  // Look for Worksheet elements
  const worksheets = xmlData.Worksheet || xmlData.ss_Worksheet || [];
  const sheets = Array.isArray(worksheets) ? worksheets : [worksheets];

  for (const sheet of sheets) {
    if (!sheet) continue;

    // Get sheet name
    const sheetName = sheet['ss:Name'] || sheet.Name || 'Sheet';

    // Get rows from Table
    const table = sheet.Table || sheet.ss_Table || {};
    const rows = table.Row || table.ss_Row || [];
    const rowArray = Array.isArray(rows) ? rows : [rows];

    // Convert to 2D array for existing parseSheet function
    const data = [];
    for (const row of rowArray) {
      if (!row) continue;
      const cells = row.Cell || row.ss_Cell || [];
      const cellArray = Array.isArray(cells) ? cells : [cells];
      const rowData = cellArray.map(cell => {
        const dataNode = cell.Data || cell.ss_Data || {};
        return typeof dataNode === 'string' ? dataNode : dataNode['#text'] || '';
      });
      data.push(rowData);
    }

    // Use existing parseSheet logic with converted data
    if (data.length >= 2) {
      // Create a mock sheet object
      const mockSheet = {};
      XLSX.utils.sheet_add_aoa(mockSheet, data);
      const invoice = parseSheet(mockSheet, sheetName);
      if (invoice) {
        invoices.push(invoice);
      }
    }
  }

  return invoices;
}

// ============================================
// POST - Import Excel or XML file
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

    // Get file extension
    const fileName = file.name || 'unknown';
    const ext = fileName.toLowerCase().split('.').pop();

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();

    // Get vendor corrections for learning
    const vendorCorrections = await getVendorCorrections();

    const results = {
      total_sheets: 0,
      imported: 0,
      skipped: 0,
      errors: [],
      invoices: [],
      format: ext,
    };

    let invoicesToProcess = [];

    // Handle XML files
    if (ext === 'xml') {
      try {
        const xmlString = new TextDecoder().decode(arrayBuffer);
        const xmlData = parseXML(xmlString);

        // Check if it's Excel XML format (SpreadsheetML)
        if (xmlData.Workbook || xmlData.ss_Workbook) {
          const workbookData = xmlData.Workbook || xmlData.ss_Workbook;
          invoicesToProcess = parseExcelXML(workbookData, fileName);
          results.total_sheets = invoicesToProcess.length;
        } else {
          // Standard XML invoice format
          const invoice = parseXMLInvoice(xmlData, fileName);
          if (invoice && (invoice.from_name || invoice.total_cents || invoice.invoice_number)) {
            invoicesToProcess = [invoice];
            results.total_sheets = 1;
          }
        }

        if (invoicesToProcess.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Could not parse XML file. Ensure it contains invoice data.',
          }, { status: 400 });
        }
      } catch (xmlError) {
        logger.error('XML parsing error', xmlError);
        return NextResponse.json({
          success: false,
          error: `Failed to parse XML: ${xmlError.message}`,
        }, { status: 400 });
      }
    }
    // Handle Excel files (xlsx, xls)
    else if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      results.total_sheets = workbook.SheetNames.length;

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        try {
          const sheet = workbook.Sheets[sheetName];
          const invoiceData = parseSheet(sheet, sheetName);

          if (invoiceData) {
            invoicesToProcess.push(invoiceData);
          } else {
            results.skipped++;
            results.errors.push({ sheet: sheetName, error: 'Could not parse invoice data' });
          }
        } catch (sheetError) {
          results.errors.push({ sheet: sheetName, error: sheetError.message });
          results.skipped++;
        }
      }
    } else {
      return NextResponse.json({
        success: false,
        error: `Unsupported file format: .${ext}. Supported formats: .xlsx, .xls, .xml`,
      }, { status: 400 });
    }

    // Process all parsed invoices
    for (const invoiceData of invoicesToProcess) {
      try {
        // Apply vendor corrections
        const correctedData = applyVendorCorrections(invoiceData, vendorCorrections);

        // Determine tax year
        let taxYear = new Date().getFullYear();
        if (correctedData.invoice_date) {
          const date = new Date(correctedData.invoice_date);
          if (!isNaN(date.getTime())) {
            taxYear = date.getFullYear();
          }
        }

        // Generate a unique identifier for the import
        const importId = `IMPORT-${Date.now()}-${results.imported}`;

        // Create parsed_invoice record
        const insertData = {
          invoice_type: 'vendor_expense',
          status: 'pending', // Requires review before confirmed
          from_name: correctedData.from_name || 'Unknown Vendor',
          from_phone: correctedData.from_phone || null,
          from_address: correctedData.from_address || null,
          to_name: correctedData.to_name,
          invoice_number: correctedData.invoice_number || importId,
          invoice_date: correctedData.invoice_date,
          subtotal_cents: correctedData.subtotal_cents,
          tax_cents: correctedData.tax_cents,
          fees_cents: correctedData.fees_cents,
          total_cents: correctedData.total_cents,
          expense_category: correctedData.expense_category,
          is_tax_deductible: true,
          tax_year: taxYear,
          line_items: JSON.stringify(correctedData.line_items),
          notes: correctedData.notes,
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
            source: correctedData.notes || fileName,
            vendor: correctedData.from_name,
            date: correctedData.invoice_date,
            total: correctedData.total_cents / 100,
            category: correctedData.expense_category,
          });
        } else {
          const errorText = await response.text();
          results.errors.push({ source: correctedData.notes || 'unknown', error: errorText });
          results.skipped++;
        }

      } catch (itemError) {
        results.errors.push({ source: invoiceData.notes || 'unknown', error: itemError.message });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} of ${results.total_sheets} ${ext === 'xml' ? 'invoice(s)' : 'sheet(s)'}`,
      ...results,
    });

  } catch (error) {
    logger.error('File import error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
