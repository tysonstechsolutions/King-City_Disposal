// ============================================
// PARSE INVOICES API - Parse Excel without saving to database
// ============================================
// Returns parsed invoice data for review before import

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { logger } from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

// ============================================
// Parse a single Excel sheet into customer invoice data
// ============================================
function parseCustomerInvoiceSheet(sheet, sheetName) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (data.length < 2) {
    return null;
  }

  const invoice = {
    invoice_number: '',
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
    notes: `Imported from sheet: ${sheetName}`,
    // Auto-detect paid status
    is_paid: false,
    date_paid: null,
    check_number: null,
    payment_method: null,
  };

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

  // Extract invoice number
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

  // Extract date
  for (const cell of allText) {
    if (!invoice.invoice_date) {
      if ((cell.lower.includes('date') && !cell.lower.includes('due date') && !cell.lower.includes('paid')) ||
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

  // Extract Customer ID
  for (const cell of allText) {
    if (!invoice.customer_id_code) {
      if (cell.lower.includes('customer id') || cell.lower.includes('customer #') || cell.lower.includes('cust id')) {
        const extracted = extractValueAfterDelimiter(cell.value);
        if (extracted) {
          invoice.customer_id_code = extracted;
        } else {
          const nextCell = data[cell.row]?.[cell.col + 1];
          if (nextCell) {
            invoice.customer_id_code = String(nextCell).trim();
          }
        }
      }
    }
  }

  // ============================================
  // AUTO-DETECT PAID STATUS
  // ============================================
  // Look for payment indicators in the sheet
  for (const cell of allText) {
    const lower = cell.lower;

    // Check for "PAID" stamp/label
    if (lower === 'paid' || lower.includes('paid in full') || lower.includes('payment received')) {
      invoice.is_paid = true;
    }

    // Check for balance due = $0 or 0.00
    if (lower.includes('balance due') || lower.includes('amount due') || lower.includes('balance:')) {
      const nextCell = data[cell.row]?.[cell.col + 1];
      if (nextCell) {
        const amount = parseCurrency(nextCell);
        if (amount === 0) {
          invoice.is_paid = true;
        }
      }
      // Also check if value is in same cell after colon
      const extracted = extractValueAfterDelimiter(cell.value);
      if (extracted) {
        const amount = parseCurrency(extracted);
        if (amount === 0) {
          invoice.is_paid = true;
        }
      }
    }

    // Check for payment date
    if (lower.includes('date paid') || lower.includes('payment date') || lower.includes('paid on')) {
      invoice.is_paid = true;
      const extracted = extractValueAfterDelimiter(cell.value);
      if (extracted) {
        const parsed = parseDate(extracted);
        if (parsed) invoice.date_paid = parsed;
      } else {
        const nextCell = data[cell.row]?.[cell.col + 1];
        if (nextCell) {
          const parsed = parseDate(nextCell);
          if (parsed) invoice.date_paid = parsed;
        }
      }
    }

    // Check for check number
    if (lower.includes('check #') || lower.includes('check no') || lower.includes('chk #') || lower.includes('ck #')) {
      invoice.is_paid = true;
      invoice.payment_method = 'check';
      const extracted = extractValueAfterDelimiter(cell.value);
      if (extracted) {
        invoice.check_number = extracted;
      } else {
        const nextCell = data[cell.row]?.[cell.col + 1];
        if (nextCell) {
          invoice.check_number = String(nextCell).trim();
        }
      }
    }

    // Check for payment method indicators
    if (lower.includes('paid by check') || lower.includes('paid via check')) {
      invoice.is_paid = true;
      invoice.payment_method = 'check';
    }
    if (lower.includes('paid by card') || lower.includes('paid via card') || lower.includes('credit card payment')) {
      invoice.is_paid = true;
      invoice.payment_method = 'card';
    }
    if (lower.includes('paid by cash') || lower.includes('paid via cash') || lower.includes('cash payment')) {
      invoice.is_paid = true;
      invoice.payment_method = 'cash';
    }
  }

  // Extract customer name and address
  // Customer info is typically in the left section, starting around row 6
  // Format: Customer Name, then Address Line 1, then City/State/ZIP on subsequent rows
  for (const cell of allText) {
    if (cell.row < 15) {
      if (cell.lower === 'bill to' || cell.lower.includes('bill to:')) {
        const belowCell = data[cell.row + 1]?.[cell.col];
        if (belowCell && String(belowCell).trim().length > 2) {
          const candidateName = String(belowCell).trim();
          if (!candidateName.toLowerCase().includes('king city') &&
              !candidateName.toLowerCase().match(/^(invoice|date|email|phone|fax|billing|purchase|family|address)/)) {
            if (!invoice.customer_name) {
              invoice.customer_name = candidateName;
            }
            // Get address lines (could be 1-2 lines below customer name)
            const addrLine1 = data[cell.row + 2]?.[cell.col];
            const addrLine2 = data[cell.row + 3]?.[cell.col];
            let fullAddr = '';
            if (addrLine1 && String(addrLine1).trim().length > 2) {
              fullAddr = String(addrLine1).trim();
            }
            if (addrLine2 && String(addrLine2).trim().length > 2) {
              fullAddr += (fullAddr ? ', ' : '') + String(addrLine2).trim();
            }
            if (fullAddr) {
              invoice.customer_address = fullAddr;
            }
          }
        }
      }

      if (cell.lower === 'job' || cell.lower.includes('job:')) {
        // Job section format:
        // Row 1: "Job" | "Description (e.g. Remodel, Mobile Home Park - 2 demos)" | "Payment Terms" | "Due Date"
        // Row 2:       | "Street Address or Contact info"                          | "Due upon receipt" | "Due upon receipt"
        // Row 3:       | "City, State ZIP"
        const nextCell = data[cell.row]?.[cell.col + 1]; // Job description (same row, next col)
        const addrRow1 = data[cell.row + 1]?.[cell.col + 1]; // Address line 1 or Contact (below description)
        const addrRow2 = data[cell.row + 2]?.[cell.col + 1]; // Address line 2 (city/state/zip)

        // Skip values that are clearly from other columns (Payment Terms, Due Date, etc.)
        const skipValues = ['payment terms', 'due upon receipt', 'due date', 'net 30', 'net 15', 'upon receipt'];

        // Store job description for service_description
        if (nextCell && String(nextCell).trim().length > 2) {
          const jobDesc = String(nextCell).trim();
          if (!skipValues.some(sv => jobDesc.toLowerCase().includes(sv))) {
            invoice.service_description = jobDesc;
          }
        }

        // Build service address from the lines below the job description
        // Skip "Contact:" lines and payment terms
        let serviceAddr = '';
        if (addrRow1 && String(addrRow1).trim().length > 2) {
          const addr1 = String(addrRow1).trim();
          // Skip if it's a contact line or payment terms
          if (!addr1.toLowerCase().startsWith('contact') &&
              !skipValues.some(sv => addr1.toLowerCase().includes(sv))) {
            serviceAddr = addr1;
          }
        }
        if (addrRow2 && String(addrRow2).trim().length > 2) {
          const addr2 = String(addrRow2).trim();
          if (!addr2.toLowerCase().startsWith('contact') &&
              !skipValues.some(sv => addr2.toLowerCase().includes(sv))) {
            serviceAddr += (serviceAddr ? ', ' : '') + addr2;
          }
        }
        if (serviceAddr) {
          invoice.service_address = serviceAddr;
        }
      }

      if (!invoice.customer_name && cell.row >= 1 && cell.row <= 10) {
        const belowCell = data[cell.row + 1]?.[cell.col];
        const belowStr = String(belowCell || '').toLowerCase();
        if (belowStr.match(/\d+\s+\w+|ave|street|st\b|rd\b|blvd|suite|ste\b|lane|ln\b|drive|dr\b|center/i)) {
          const companyName = cell.value;
          const isNumericOnly = /^\d+$/.test(companyName);
          const isDateLike = /^\d{1,2}\/\d{1,2}\/\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(companyName);
          const isEmail = /@/.test(companyName);
          const isPhoneNumber = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(companyName);
          if (!isNumericOnly && !isDateLike && !isEmail && !isPhoneNumber &&
              !companyName.toLowerCase().includes('king city') &&
              companyName.length > 3 &&
              !companyName.toLowerCase().match(/^(invoice|date|email|phone|fax|billing|purchase|family)/)) {
            invoice.customer_name = companyName;
            invoice.customer_address = String(belowCell).trim();
            const addr2 = data[cell.row + 2]?.[cell.col];
            if (addr2 && String(addr2).match(/[a-z]{2}[\s.,]+\d{5}/i)) {
              invoice.customer_address += ', ' + String(addr2).trim();
            }
          }
        }
      }

      if (!invoice.customer_name && cell.row >= 1 && cell.row <= 12) {
        if (cell.value.match(/\b(LLC|Inc\.?|Corp\.?|Company|Co\.?|Properties|Construction|Contracting|Services|Rentals|Roofing|Plumbing|Electric|Excavating|Hauling|Landscaping|Dumpsters?)\b/i)) {
          const candidateName = cell.value;
          if (!candidateName.toLowerCase().includes('king city') && candidateName.length > 3) {
            invoice.customer_name = candidateName;
          }
        }
      }

      if (!invoice.customer_name && cell.row === 6 && cell.col === 0) {
        const candidateName = cell.value;
        if (!candidateName.toLowerCase().includes('king city') &&
            !candidateName.toLowerCase().match(/^(invoice|date|email|phone|fax|billing|purchase|family|address|kingcity)/) &&
            candidateName.length > 2) {
          invoice.customer_name = candidateName;
        }
      }
    }
  }

  if (!invoice.customer_name && invoice.customer_id_code) {
    invoice.customer_name = invoice.customer_id_code;
  }

  // ============================================
  // PHONE NUMBER EXTRACTION - Skip King City's numbers
  // ============================================
  // King City Disposal phone numbers to skip
  const kingCityPhones = ['6182318481', '6182318380', '618231848', '618231838'];

  // Helper to check if a phone is King City's
  const isKingCityPhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    return kingCityPhones.some(kcp => digits.includes(kcp) || kcp.includes(digits));
  };

  // Look for customer phone - only in customer section (after Bill To or in specific rows)
  // The customer info is typically in the left section, rows 6-12, NOT in the King City header area (rows 1-5)
  let billToRow = -1;
  for (const cell of allText) {
    if (cell.lower === 'bill to' || cell.lower.includes('bill to:')) {
      billToRow = cell.row;
      break;
    }
  }

  // Only look for phone numbers in the customer section (after Bill To, or rows 6+)
  // Skip any phone that matches King City's numbers
  for (const cell of allText) {
    if (!invoice.customer_phone) {
      // Only check rows after Bill To or in customer area (rows 6-15)
      const isInCustomerArea = (billToRow > 0 && cell.row >= billToRow && cell.row <= billToRow + 6) ||
                               (billToRow < 0 && cell.row >= 6 && cell.row <= 15);

      if (!isInCustomerArea) continue;

      const phoneMatch = cell.value.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch) {
        const phoneDigits = phoneMatch[0].replace(/\D/g, '');

        // Skip if it's King City's phone number
        if (isKingCityPhone(phoneDigits)) continue;

        // Skip currency fields
        const isCurrencyField = cell.lower.includes('total') || cell.lower.includes('amount') ||
                                cell.lower.includes('price') || cell.lower.includes('subtotal') ||
                                cell.lower.includes('$') || cell.value.includes('$');
        if (isCurrencyField) continue;

        invoice.customer_phone = phoneDigits;
      }
    }
  }

  // DON'T do a fallback phone search - if we didn't find a customer phone, leave it empty
  // The admin can add it during review if needed

  // Extract email - skip King City's email
  for (const cell of allText) {
    if (cell.lower.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)) {
      const emailMatch = cell.value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch && !emailMatch[0].toLowerCase().includes('kingcitydisposal')) {
        invoice.customer_email = emailMatch[0];
      }
    }
  }

  // Find line items columns and the header row
  let lineTotalColIdx = -1;
  let unitPriceColIdx = -1;
  let descriptionColIdx = -1;
  let quantityColIdx = -1;
  let headerRowIdx = -1;

  for (const cell of allText) {
    if (cell.lower === 'line total' || cell.lower.includes('line total')) {
      lineTotalColIdx = cell.col;
      headerRowIdx = cell.row;
    }
    if (cell.lower === 'unit price' || cell.lower.includes('unit price')) unitPriceColIdx = cell.col;
    if (cell.lower === 'description') descriptionColIdx = cell.col;
    if (cell.lower === 'quantity' || cell.lower === 'qty') quantityColIdx = cell.col;
  }

  // Extract line items
  if (lineTotalColIdx >= 0 && headerRowIdx >= 0) {
    for (let rowIdx = headerRowIdx + 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      const lineTotalRaw = row[lineTotalColIdx];
      const lineTotal = parseCurrency(lineTotalRaw);

      const lineTotalStr = String(lineTotalRaw || '').replace(/\D/g, '');
      const looksLikePhone = lineTotalStr.length === 10 && /^\d{10}$/.test(lineTotalStr);
      const unrealisticallyLarge = lineTotal > 100000000;

      if (lineTotal > 0 && !looksLikePhone && !unrealisticallyLarge) {
        let description = '';
        if (descriptionColIdx >= 0 && row[descriptionColIdx]) {
          description = String(row[descriptionColIdx]).trim();
        } else {
          for (let c = 0; c < lineTotalColIdx; c++) {
            const cellVal = String(row[c] || '').trim();
            if (cellVal.length > 2 && !cellVal.match(/^\d+$/) &&
                !cellVal.match(/^\$/) && cellVal.toLowerCase() !== 'quantity') {
              description = cellVal;
            }
          }
        }

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

          const sizeMatch = description.match(/(\d+)\s*(?:yard|yd|cu)/i);
          if (sizeMatch && !invoice.dumpster_size) {
            invoice.dumpster_size = sizeMatch[1];
          }

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

      if ((cell === 'total' || cell.startsWith('total ') || cell.startsWith('total:')) && !invoice.total_cents) {
        const cellFull = String(row[colIdx] || '');
        const inCellAmount = parseCurrency(cellFull);
        if (inCellAmount > 0) {
          invoice.total_cents = inCellAmount;
        } else {
          for (let i = colIdx + 1; i < row.length; i++) {
            const val = row[i];
            if (val !== '' && val !== null && val !== undefined) {
              const amount = parseCurrency(val);
              if (amount > 0) {
                invoice.total_cents = amount;
                break;
              }
            }
          }
        }
      }

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

  if (!invoice.total_cents && invoice.line_items.length > 0) {
    invoice.total_cents = invoice.line_items.reduce((sum, item) => sum + item.amount_cents, 0);
  }

  if (!invoice.subtotal_cents) {
    invoice.subtotal_cents = invoice.total_cents;
  }

  if (!invoice.total_cents && !invoice.invoice_number) {
    return null;
  }

  if (!invoice.customer_name && invoice.customer_id_code) {
    invoice.customer_name = invoice.customer_id_code;
  }

  if (!invoice.customer_name) {
    invoice.customer_name = 'Unknown Customer';
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
    if (value >= 1000000000 && value <= 9999999999 && Number.isInteger(value)) {
      return 0;
    }
    return Math.round(value * 100);
  }

  const str = String(value).replace(/[$,\s]/g, '');

  if (/^\d{10}$/.test(str)) {
    return 0;
  }

  const num = parseFloat(str);

  return isNaN(num) ? 0 : Math.round(num * 100);
}

// ============================================
// POST - Parse Excel file and return data for review
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

    const invoices = [];
    const skipped = [];

    for (const sheetName of workbook.SheetNames) {
      try {
        const sheet = workbook.Sheets[sheetName];
        const invoiceData = parseCustomerInvoiceSheet(sheet, sheetName);

        if (!invoiceData) {
          skipped.push({ sheet: sheetName, reason: 'Could not parse invoice data' });
          continue;
        }

        // Generate invoice number if not found
        if (!invoiceData.invoice_number) {
          invoiceData.invoice_number = `IMP-${Date.now()}-${invoices.length}`;
        }

        invoices.push({
          ...invoiceData,
          _sheetName: sheetName,
        });

      } catch (sheetError) {
        skipped.push({ sheet: sheetName, reason: sheetError.message });
      }
    }

    return NextResponse.json({
      success: true,
      total_sheets: workbook.SheetNames.length,
      parsed_count: invoices.length,
      skipped_count: skipped.length,
      skipped_sheets: skipped,
      invoices,
    });

  } catch (error) {
    logger.error('Invoice parse error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
