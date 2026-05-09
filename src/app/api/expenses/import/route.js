// ============================================
// EXCEL & XML IMPORT API - Multi-Format Invoice Import
// ============================================
// Parse Excel (XLSX) and XML files containing invoices

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import * as XLSX from 'xlsx';
import { logger } from '../../../../lib/logger';
import { requireAdminAuth } from '../../../../lib/adminAuth';

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
    to_address: '',
    customer_name: '',
    customer_id: '',
    subtotal_cents: 0,
    tax_cents: 0,
    fees_cents: 0,
    total_cents: 0,
    expense_category: 'other',
    line_items: [],
    notes: `Imported from sheet: ${sheetName}`,
  };

  // Helper: Extract value after colon/equals from a cell
  const extractValueAfterDelimiter = (cellValue) => {
    const str = String(cellValue || '');
    // Match patterns like "Invoice No.: 4596" or "Date: 1/4/2026" or "Customer ID: MOOND"
    const match = str.match(/[:.]\s*(.+)$/);
    return match ? match[1].trim() : null;
  };

  // First pass: Scan ALL cells and extract any colon-delimited values
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

  // Extract invoice number - look for "Invoice No", "Invoice #", etc.
  for (const cell of allText) {
    if (!invoice.invoice_number) {
      if (cell.lower.includes('invoice no') || cell.lower.includes('invoice #') ||
          cell.lower.includes('invoice:') || cell.lower.match(/^invoice\s*[:#]/)) {
        const extracted = extractValueAfterDelimiter(cell.value);
        if (extracted) {
          invoice.invoice_number = extracted;
        } else {
          // Check next cell in same row
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) invoice.invoice_number = String(nextCell).trim();
        }
      }
    }
  }

  // Extract date - look for "Date:" pattern
  for (const cell of allText) {
    if (!invoice.invoice_date) {
      if (cell.lower.includes('date') && !cell.lower.includes('due date')) {
        const extracted = extractValueAfterDelimiter(cell.value);
        if (extracted) {
          const parsed = parseDate(extracted);
          if (parsed) invoice.invoice_date = parsed;
        } else {
          // Check next cell
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) {
            const parsed = parseDate(nextCell);
            if (parsed) invoice.invoice_date = parsed;
          }
        }
      }
    }
  }

  // Extract Customer ID
  for (const cell of allText) {
    if (!invoice.customer_id) {
      if (cell.lower.includes('customer id') || cell.lower.includes('customer #') || cell.lower.includes('cust id')) {
        const extracted = extractValueAfterDelimiter(cell.value);
        if (extracted) {
          invoice.customer_id = extracted;
        } else {
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) invoice.customer_id = String(nextCell).trim();
        }
      }
    }
  }

  // Extract customer/recipient name - Look for company names in first ~10 rows that aren't King City
  // Also look for "Job" field which often has customer info
  for (const cell of allText) {
    if (cell.row < 12) {
      // Check for Job field (common in this invoice format)
      if (cell.lower === 'job' || cell.lower.includes('job:')) {
        const nextCell = data[cell.row]?.[cell.col + 1];
        const belowCell = data[cell.row + 1]?.[cell.col];
        if (nextCell && String(nextCell).trim().length > 2) {
          invoice.customer_name = String(nextCell).trim();
        } else if (belowCell && String(belowCell).trim().length > 2) {
          invoice.customer_name = String(belowCell).trim();
        }
      }
      // Look for company patterns - names followed by addresses
      if (!invoice.from_name && cell.row >= 1 && cell.row <= 8) {
        // Check if this looks like a company name (has address below it)
        const belowCell = data[cell.row + 1]?.[cell.col];
        const belowStr = String(belowCell || '').toLowerCase();
        if (belowStr.match(/\d+\s+\w+|ave|street|st|rd|blvd|suite|ste/i)) {
          // This cell is likely a company name
          const companyName = cell.value;
          if (!companyName.toLowerCase().includes('king city') &&
              companyName.length > 3 &&
              !companyName.toLowerCase().match(/^(invoice|date|email|phone|fax)/)) {
            invoice.from_name = companyName;
            // Get address from below
            if (belowCell) invoice.from_address = String(belowCell).trim();
            // Check for more address lines
            const addr2 = data[cell.row + 2]?.[cell.col];
            if (addr2 && String(addr2).match(/[a-z]{2}\s*\d{5}/i)) {
              invoice.from_address += ', ' + String(addr2).trim();
            }
          }
        }
      }
    }
  }

  // Extract phone numbers - look for (XXX) XXX-XXXX or XXX-XXX-XXXX patterns anywhere
  for (const cell of allText) {
    if (!invoice.from_phone) {
      const phoneMatch = cell.value.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch) {
        // Don't grab King City's phone
        const isInKingCitySection = allText.some(c =>
          c.row === cell.row && c.lower.includes('king city')
        );
        if (!isInKingCitySection && cell.row < 10) {
          invoice.from_phone = phoneMatch[0].replace(/\D/g, '');
        }
      }
    }
  }

  // Extract TOTAL - Look for "TOTAL" keyword and grab the dollar amount
  // This format has TOTAL in one cell and $ amount in another
  for (let rowIdx = data.length - 1; rowIdx >= 0; rowIdx--) {
    const row = data[rowIdx];
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = String(row[colIdx] || '').toLowerCase().trim();

      // Look for "TOTAL" cell (not subtotal)
      if (cell === 'total' && !invoice.total_cents) {
        // Check cells to the right for dollar amount
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

  // Also scan for dollar amounts in "Line Total" column
  let lineTotalColIdx = -1;
  let unitPriceColIdx = -1;
  for (const cell of allText) {
    if (cell.lower.includes('line total')) lineTotalColIdx = cell.col;
    if (cell.lower.includes('unit price')) unitPriceColIdx = cell.col;
  }

  // Extract line items if we found the columns
  if (lineTotalColIdx >= 0) {
    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      const lineTotal = parseCurrency(row[lineTotalColIdx]);
      if (lineTotal > 0) {
        // Find description - usually in a column to the left
        let description = '';
        for (let c = 0; c < lineTotalColIdx; c++) {
          const cellVal = String(row[c] || '').trim();
          if (cellVal.length > 2 && !cellVal.match(/^\d+$/) && cellVal.toLowerCase() !== 'quantity') {
            description = cellVal;
          }
        }
        if (description && description.toLowerCase() !== 'description') {
          invoice.line_items.push({
            description,
            amount_cents: lineTotal,
            unit_price_cents: unitPriceColIdx >= 0 ? parseCurrency(row[unitPriceColIdx]) : lineTotal,
          });
        }
      }
    }
  }

  // If we still don't have a total, sum line items or use subtotal
  if (!invoice.total_cents) {
    if (invoice.line_items.length > 0) {
      invoice.total_cents = invoice.line_items.reduce((sum, item) => sum + item.amount_cents, 0);
    } else if (invoice.subtotal_cents) {
      invoice.total_cents = invoice.subtotal_cents;
    }
  }

  // If no subtotal, use total
  if (!invoice.subtotal_cents && invoice.total_cents) {
    invoice.subtotal_cents = invoice.total_cents;
  }

  // Try to detect category from vendor name or content
  invoice.expense_category = detectCategory(invoice.from_name, data);

  // If this looks like a King City outgoing invoice (to a customer), mark it differently
  const isOutgoingInvoice = allText.some(c =>
    c.lower.includes('king city disposal') && c.row < 5
  );
  if (isOutgoingInvoice) {
    invoice.notes = `Customer Invoice from sheet: ${sheetName}`;
    // Swap: the "from" is actually the customer being billed
    if (invoice.from_name && !invoice.from_name.toLowerCase().includes('king city')) {
      invoice.customer_name = invoice.from_name;
    }
    invoice.from_name = invoice.customer_name || invoice.customer_id || 'Customer';
  }

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
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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
