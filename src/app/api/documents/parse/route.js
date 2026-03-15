// ============================================
// INVOICE PARSING API - Claude AI Vision
// ============================================
// Extracts structured data from invoice images and Excel files

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { logger } from '../../../../lib/logger';
import { requireAdminAuth } from '../../../../lib/adminAuth';
import { callClaudeWithFallback } from '../../../../lib/claudeModels';
import * as XLSX from 'xlsx';

// Force dynamic rendering (not static)
export const dynamic = 'force-dynamic';

// Get Supabase credentials at runtime (not module init) for serverless compatibility
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// Vendor Corrections - AI Learning System
// ============================================
async function getVendorCorrections() {
  try {
    const response = await fetch(
      `${getSupabaseUrl()}/rest/v1/vendor_corrections?select=*`,
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
function applyVendorCorrections(parsedData, corrections) {
  if (!parsedData.from?.name || corrections.length === 0) {
    return parsedData;
  }

  const vendorName = parsedData.from.name.toLowerCase();

  for (const correction of corrections) {
    const correctionVendor = (correction.vendor_name || '').toLowerCase();

    // Match by partial vendor name (either contains the other)
    if (vendorName.includes(correctionVendor) || correctionVendor.includes(vendorName)) {
      logger.debug('Applying vendor correction', { from: parsedData.from.name, to: correction.corrected_name });

      // Apply corrections
      if (correction.corrected_name) {
        parsedData.from.name = correction.corrected_name;
      }
      if (correction.corrected_phone) {
        parsedData.from.phone = correction.corrected_phone;
      }
      if (correction.corrected_address) {
        parsedData.from.address = correction.corrected_address;
      }
      if (correction.default_category) {
        parsedData.expense_category = correction.default_category;
      }

      break; // Use first matching correction
    }
  }

  return parsedData;
}

// Parsing prompts for different document types
function getParsingPrompt(docCategory = 'invoice') {
  if (docCategory === 'weight_ticket') {
    return getWeightTicketPrompt();
  } else if (docCategory === 'fuel_receipt') {
    return getFuelReceiptPrompt();
  }
  return getInvoicePrompt();
}

function getWeightTicketPrompt() {
  return `Analyze this weight ticket/landfill receipt and extract the information. Return a JSON object:

{
  "invoice_type": "vendor_expense",
  "from": {
    "name": "Landfill/dump name",
    "address": "Address if visible",
    "phone": "Phone if visible"
  },
  "to": {
    "name": "Company name (truck owner)",
    "address": null
  },
  "invoice_number": "Ticket number",
  "invoice_date": "YYYY-MM-DD format",
  "line_items": [
    {
      "description": "Waste disposal - X.XX tons",
      "quantity": 1,
      "unit": "tons",
      "weight_tons": 2.5,
      "total_cents": 10000
    }
  ],
  "subtotal_cents": 10000,
  "tax_cents": 0,
  "total_cents": 10000,
  "expense_category": "landfill",
  "notes": "Gross weight: X lbs, Tare weight: X lbs, Net weight: X lbs (X.XX tons)",
  "confidence": 0.95
}

CRITICAL:
- Extract GROSS, TARE, and NET weights - these are crucial!
- Convert net weight to tons (divide lbs by 2000)
- Include all weight info in notes
- All amounts in cents (multiply dollars by 100)
- Date format: YYYY-MM-DD
- Set confidence 0-1 based on readability

Return ONLY JSON.`;
}

function getFuelReceiptPrompt() {
  return `Analyze this fuel receipt and extract the information. Return a JSON object:

{
  "invoice_type": "vendor_expense",
  "from": {
    "name": "Gas station name",
    "address": "Address if visible",
    "phone": null
  },
  "to": {
    "name": "King City Disposal",
    "address": null
  },
  "invoice_number": "Receipt/transaction number",
  "invoice_date": "YYYY-MM-DD format",
  "line_items": [
    {
      "description": "Diesel fuel - XX.XX gallons @ $X.XX/gal",
      "quantity": 25.5,
      "unit": "gallons",
      "unit_price_cents": 350,
      "total_cents": 8925
    }
  ],
  "subtotal_cents": 8925,
  "tax_cents": 0,
  "total_cents": 8925,
  "expense_category": "fuel",
  "notes": "Vehicle: [if visible], Odometer: [if visible], Pump #: [if visible]",
  "confidence": 0.95
}

CRITICAL:
- Extract gallons purchased and price per gallon
- Note fuel type (diesel, regular, premium)
- Include vehicle info if visible
- All amounts in cents
- Date format: YYYY-MM-DD

Return ONLY JSON.`;
}

function getInvoicePrompt() {
  return `CAREFULLY analyze this invoice/receipt data and extract ALL information with high accuracy. Read every number, word, and detail precisely.

Return a JSON object with this exact structure:

{
  "invoice_type": "vendor_expense" or "customer_record",
  "from": {
    "name": "Company/person sending the invoice",
    "address": "Full address if visible",
    "phone": "Phone number if visible",
    "email": "Email if visible"
  },
  "to": {
    "name": "Company/person receiving the invoice (being billed)",
    "address": "Full address if visible",
    "phone": "Phone number if visible",
    "email": "Email if visible"
  },
  "invoice_number": "Invoice number/ID",
  "invoice_date": "YYYY-MM-DD format",
  "due_date": "Due date as shown on invoice",
  "payment_terms": "Payment terms (Net 30, Due on Receipt, etc.)",
  "line_items": [
    {
      "description": "Full item/service description including weight, quantity, units (e.g. '3 tons debris disposal')",
      "quantity": 1,
      "unit": "tons/lbs/yards/each/gallons",
      "unit_price_cents": 10000,
      "total_cents": 10000
    }
  ],
  "subtotal_cents": 10000,
  "tax_cents": 0,
  "fees_cents": 0,
  "discount_cents": 0,
  "total_cents": 10000,
  "expense_category": "landfill/fuel/maintenance/parts/repairs/supplies/dumpster_rental/meals/travel/phone/utilities/insurance/office/software/advertising/professional_services/equipment/uniforms/subscriptions/other - use the most specific category that fits",
  "notes": "Any additional notes, weight tickets, reference numbers, or important info",
  "confidence": 0.95
}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- ACCURACY IS PARAMOUNT: Double-check ALL numbers including phone numbers, quantities, weights, and dollar amounts
- READ EVERY DIGIT EXACTLY: Do not confuse similar digits (1/7, 4/8, 5/6, 3/8). Read each digit carefully!
- PHONE NUMBERS: Read each digit precisely. (618)231-8481 is NOT (618)231-4481 - verify every digit
- READ DOLLAR AMOUNTS EXACTLY: $525.00 = 52500 cents, $83.36 = 8336 cents. NEVER drop digits!
- VERIFY TOTALS: The total should match what's shown on the invoice. If it says TOTAL $525.00, use 52500 cents
- WEIGHTS: Look for tonnage, pounds, cubic yards - include in line item descriptions AND notes
- INVOICE TYPE DETECTION:
  * If "King City Disposal" appears in the FROM/sender section at the top, this is a "customer_record" (invoice TO a customer)
  * If "King City Disposal" appears in the TO/recipient/billing section, this is a "vendor_expense" (bill FROM a vendor)
- All monetary amounts must be in cents (multiply dollars by 100). Example: $525.00 = 52500 cents
- DATE FORMAT: Convert dates to YYYY-MM-DD. Example: 1/4/2026 becomes 2026-01-04
- For expense_category: Choose the most specific category that fits:
  * landfill - dump fees, waste disposal
  * fuel - gas, diesel
  * maintenance - oil changes, tires, tune-ups, inspections
  * parts - vehicle/equipment parts
  * repairs - repair services
  * supplies - office supplies, cleaning supplies
  * dumpster_rental - rental fees for dumpsters
  * meals - food, restaurants, coffee
  * travel - hotels, flights, parking, tolls
  * phone - cell phone, phone service
  * utilities - electric, water, gas, internet
  * insurance - vehicle, business, liability insurance
  * office - office supplies, printing, postage
  * software - software subscriptions, apps
  * advertising - marketing, ads, promotional items
  * professional_services - legal, accounting, consulting
  * equipment - tools, machinery purchases
  * uniforms - work clothing, safety gear
  * subscriptions - recurring services
  * other - if nothing else fits
- Include weight/tonnage info in the notes field even if it appears elsewhere
- Set confidence between 0 and 1 based on data clarity and your certainty
- If a field is not visible or unclear, use null

Return ONLY the JSON object, no other text.`;
}

// ============================================
// POST - Parse an invoice document
// ============================================
export async function POST(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { document_id, category } = await request.json();

    if (!document_id) {
      return NextResponse.json(
        { error: 'document_id is required' },
        { status: 400 }
      );
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // 1. Fetch the document record
    const docResponse = await fetch(
      `${getSupabaseUrl()}/rest/v1/documents?id=eq.${document_id}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!docResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 500 }
      );
    }

    const documents = await docResponse.json();
    if (!documents.length) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documents[0];
    const docCategory = category || document.category || 'invoice';

    // Delete any existing parsed_invoice for this document (for re-parsing)
    if (document.parsed_invoice_id) {
      await fetch(
        `${getSupabaseUrl()}/rest/v1/parsed_invoices?document_id=eq.${document_id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );
      logger.info('Deleted existing parsed invoice for re-parsing', { document_id });
    }

    // Update document status to 'parsing'
    await fetch(
      `${getSupabaseUrl()}/rest/v1/documents?id=eq.${document_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
        body: JSON.stringify({ parse_status: 'parsing', parsed_invoice_id: null }),
      }
    );

    // 2. Fetch the file from Supabase Storage
    const fileUrl = `${getSupabaseUrl()}/storage/v1/object/authenticated/documents/${document.storage_path}`;
    const fileResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    });

    if (!fileResponse.ok) {
      await updateDocumentStatus(document_id, 'failed');
      return NextResponse.json(
        { error: 'Failed to fetch file from storage' },
        { status: 500 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const mediaType = document.file_type || 'image/jpeg';

    // Check if this is an Excel or CSV file
    const isSpreadsheet = mediaType.includes('spreadsheet') ||
                          mediaType.includes('excel') ||
                          mediaType === 'text/csv' ||
                          document.file_name?.endsWith('.xlsx') ||
                          document.file_name?.endsWith('.xls') ||
                          document.file_name?.endsWith('.csv');

    let messageContent;

    if (isSpreadsheet) {
      // Parse Excel/CSV file and convert to text
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      let extractedText = '';

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        extractedText += `=== Sheet: ${sheetName} ===\n`;
        extractedText += XLSX.utils.sheet_to_csv(sheet);
        extractedText += '\n\n';
      }

      messageContent = [
        {
          type: 'text',
          text: `The following is data extracted from a spreadsheet file. Analyze this invoice/expense data and extract the information.\n\n--- SPREADSHEET DATA ---\n${extractedText}\n--- END DATA ---\n\n` + getParsingPrompt(docCategory)
        }
      ];
    } else {
      // Image or PDF - use vision
      const base64Data = Buffer.from(fileBuffer).toString('base64');
      const isPdf = mediaType === 'application/pdf' || document.file_name?.toLowerCase().endsWith('.pdf');

      messageContent = [
        {
          type: isPdf ? 'document' : 'image',
          source: {
            type: 'base64',
            media_type: isPdf ? 'application/pdf' : mediaType,
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: getParsingPrompt(docCategory)
        }
      ];
    }

    // 3. Call Claude AI API with automatic fallback to older models
    const claudeResult = await callClaudeWithFallback({
      apiKey: anthropicKey,
      messages: [
        {
          role: 'user',
          content: messageContent,
        }
      ],
      maxTokens: 4000,
    });

    // Check if call failed (all models failed)
    if (!claudeResult.success) {
      logger.error('Claude API error - all models failed', null, { error: claudeResult.error });
      await updateDocumentStatus(document_id, 'failed');

      return NextResponse.json(
        { error: `Failed to parse document with AI: ${claudeResult.error}` },
        { status: 500 }
      );
    }

    logger.info('Document parsed successfully', { model: claudeResult.model, document_id });
    const claudeData = claudeResult.data;
    const aiText = claudeData.content[0]?.text || '';

    // 4. Parse the JSON response
    let parsedData;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      let jsonStr = aiText;
      if (aiText.includes('```json')) {
        jsonStr = aiText.split('```json')[1].split('```')[0];
      } else if (aiText.includes('```')) {
        jsonStr = aiText.split('```')[1].split('```')[0];
      }
      parsedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      logger.error('Failed to parse AI response', parseError, { response: aiText?.substring(0, 500) });
      await updateDocumentStatus(document_id, 'failed');
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      );
    }

    // 4b. Apply vendor corrections from learning system
    const vendorCorrections = await getVendorCorrections();
    if (vendorCorrections.length > 0 && parsedData.invoice_type === 'vendor_expense') {
      parsedData = applyVendorCorrections(parsedData, vendorCorrections);
    }

    // 5. Find or create customer based on invoice type
    // IMPORTANT: Only create customers for customer_record invoices (invoices TO customers)
    // Vendor expenses (fuel, landfill fees, etc.) should NOT create customers
    let customer = null;
    const invoiceType = parsedData.invoice_type || 'vendor_expense';

    if (invoiceType === 'customer_record') {
      // For invoices TO customers, the customer is in the "to" field
      if (parsedData.to?.name) {
        customer = await findOrCreateCustomer({
          name: parsedData.to.name,
          phone: parsedData.to.phone,
          email: parsedData.to.email,
          address: parsedData.to.address,
        }, false);
      }
    }
    // Note: Vendor expenses do NOT create customers - gas stations, landfills, etc. are vendors, not customers

    // 6. Store in parsed_invoices table

    // Validate and format dates - handle invalid formats from AI
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      // Try to parse the date
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        logger.warn('Invalid date format from AI', { dateStr });
        return null;
      }
      // Return in YYYY-MM-DD format
      return parsed.toISOString().split('T')[0];
    };

    const formattedInvoiceDate = formatDate(parsedData.invoice_date);
    const formattedDueDate = formatDate(parsedData.due_date);

    const taxYear = formattedInvoiceDate
      ? new Date(formattedInvoiceDate).getFullYear()
      : new Date().getFullYear();

    const parsedInvoiceData = {
      document_id: parseInt(document_id),
      customer_id: customer?.id || null,
      invoice_type: invoiceType,
      from_name: parsedData.from?.name || null,
      from_address: parsedData.from?.address || null,
      from_phone: parsedData.from?.phone || null,
      from_email: parsedData.from?.email || null,
      to_name: parsedData.to?.name || null,
      to_address: parsedData.to?.address || null,
      to_phone: parsedData.to?.phone || null,
      to_email: parsedData.to?.email || null,
      invoice_number: parsedData.invoice_number || null,
      invoice_date: formattedInvoiceDate,
      due_date: formattedDueDate,
      payment_terms: parsedData.payment_terms || null,
      line_items: JSON.stringify(parsedData.line_items || []),
      subtotal_cents: parsedData.subtotal_cents || null,
      tax_cents: parsedData.tax_cents || 0,
      fees_cents: parsedData.fees_cents || 0,
      discount_cents: parsedData.discount_cents || 0,
      total_cents: parsedData.total_cents || null,
      expense_category: parsedData.expense_category || 'other',
      tax_year: taxYear,
      // Auto-confirm if confidence >= 95%
      status: (parsedData.confidence >= 0.95) ? 'confirmed' : 'pending_review',
      confidence_score: parsedData.confidence || 0.8,
      raw_text: parsedData.notes || null,
      confirmed_at: (parsedData.confidence >= 0.95) ? new Date().toISOString() : null,
    };

    const insertResponse = await fetch(
      `${getSupabaseUrl()}/rest/v1/parsed_invoices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(parsedInvoiceData),
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      logger.error('Failed to insert parsed invoice', null, {
        error: errorText,
        document_id,
        parsedInvoiceData,
      });
      await updateDocumentStatus(document_id, 'failed');

      // Try to parse the error for better feedback
      let errorMsg = 'Failed to save parsed data';
      try {
        const errorObj = JSON.parse(errorText);
        if (errorObj.message) {
          errorMsg = `Failed to save: ${errorObj.message}`;
        } else if (errorObj.details) {
          errorMsg = `Failed to save: ${errorObj.details}`;
        }
      } catch (e) {
        // Keep generic error if can't parse
        if (errorText && errorText.length < 200) {
          errorMsg = `Failed to save: ${errorText}`;
        }
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

    const [parsedInvoice] = await insertResponse.json();

    // 7. Update document with ALL parsed info
    // This makes the document searchable/filterable without joining parsed_invoices

    // Extract weight (for any document with weight info)
    let weightLbs = null;
    if (parsedData.line_items?.length > 0) {
      const weightItem = parsedData.line_items.find(item => item.weight_tons);
      if (weightItem?.weight_tons) {
        weightLbs = Math.round(weightItem.weight_tons * 2000);
      }
    }

    // Extract amount (total from any parsed document)
    const amountCents = parsedData.total_cents || null;

    // Use the expense_category directly from AI - it's already specific enough
    // This allows dynamic categories like meals, phone, travel, etc.
    let finalCategory = parsedData.expense_category || docCategory || 'other';

    // Build document update with all parsed info
    const documentUpdate = {
      parse_status: 'parsed',
      parsed_invoice_id: parsedInvoice.id,
      customer_id: customer?.id || null,
      // Category from AI
      category: finalCategory,
      // Vendor/company name
      vendor: parsedData.from?.name || null,
      // Service date from the invoice (when the service occurred)
      service_date: parsedData.invoice_date || null,
      // Amount (for all document types)
      amount_cents: amountCents,
      // Weight (for weight tickets)
      weight_lbs: weightLbs,
      // Generate smart title from parsed data (always overwrite the filename)
      title: parsedData.invoice_number
        ? `${parsedData.from?.name || 'Invoice'} #${parsedData.invoice_number}`
        : parsedData.from?.name && parsedData.invoice_date
          ? `${parsedData.from.name} - ${parsedData.invoice_date}`
          : parsedData.from?.name
            ? `${parsedData.from.name} - ${finalCategory}`
            : document.title,
      // Description with summary
      description: parsedData.notes || (parsedData.line_items?.[0]?.description) || null,
    };

    // Remove null values to avoid overwriting existing data
    Object.keys(documentUpdate).forEach(key => {
      if (documentUpdate[key] === null || documentUpdate[key] === undefined) {
        delete documentUpdate[key];
      }
    });

    await fetch(
      `${getSupabaseUrl()}/rest/v1/documents?id=eq.${document_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
        body: JSON.stringify(documentUpdate),
      }
    );

    // 8. Update customer stats if we linked one
    if (customer?.id && parsedInvoiceData.total_cents) {
      // Update customer's total_spent if this is a customer invoice
      if (invoiceType === 'customer_record') {
        await fetch(
          `${getSupabaseUrl()}/rest/v1/rpc/increment_customer_spent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
            },
            body: JSON.stringify({
              p_customer_id: customer.id,
              p_amount: parsedInvoiceData.total_cents,
            }),
          }
        ).catch(() => {}); // Ignore if function doesn't exist
      }
    }

    const autoConfirmed = parsedData.confidence >= 0.95;
    logger.info('Document parsed successfully', {
      document_id,
      parsed_invoice_id: parsedInvoice.id,
      category: finalCategory,
      vendor: parsedData.from?.name,
      amount_cents: amountCents,
      weight_lbs: weightLbs,
      auto_confirmed: autoConfirmed,
      customer_id: customer?.id,
    });

    return NextResponse.json({
      success: true,
      auto_confirmed: autoConfirmed,
      parsed_invoice: {
        ...parsedInvoice,
        line_items: parsedData.line_items || [],
      },
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        is_new: !customer.created_at || (Date.now() - new Date(customer.created_at).getTime()) < 5000,
      } : null,
      extracted: {
        weight_lbs: weightLbs,
        amount_cents: amountCents,
      },
    });

  } catch (error) {
    logger.error('Parse invoice error', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to update document parse status
async function updateDocumentStatus(documentId, status) {
  await fetch(
    `${getSupabaseUrl()}/rest/v1/documents?id=eq.${documentId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
      body: JSON.stringify({ parse_status: status }),
    }
  );
}

// Helper function to find or create a customer
async function findOrCreateCustomer(customerData, isVendor = false) {
  const { name, phone, email, address } = customerData;

  if (!name) return null;

  // Clean phone number for matching
  const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

  // Try to find existing customer by phone, email, or exact name match
  let query = '';
  const conditions = [];

  if (cleanPhone && cleanPhone.length >= 10) {
    conditions.push(`phone.ilike.%${cleanPhone.slice(-10)}%`);
  }
  if (email) {
    conditions.push(`email.ilike.${email}`);
  }
  // Also try name match (case insensitive)
  conditions.push(`name.ilike.${encodeURIComponent(name)}`);

  if (conditions.length > 0) {
    query = conditions.join(',');
  }

  // Search for existing customer
  const searchResponse = await fetch(
    `${getSupabaseUrl()}/rest/v1/customers?or=(${query})&limit=1`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  if (searchResponse.ok) {
    const existing = await searchResponse.json();
    if (existing.length > 0) {
      logger.debug('Found existing customer', { name: existing[0].name, id: existing[0].id });
      return existing[0];
    }
  }

  // Parse address into components if possible
  let city = null;
  let state = 'IL';
  let zip = null;

  if (address) {
    // Try to extract city, state, zip from address
    const stateZipMatch = address.match(/([A-Za-z\s]+),?\s*([A-Z]{2})\s*(\d{5})?/);
    if (stateZipMatch) {
      city = stateZipMatch[1]?.trim();
      state = stateZipMatch[2] || 'IL';
      zip = stateZipMatch[3] || null;
    }
  }

  // Create new customer
  const newCustomer = {
    name: name,
    phone: phone || null,
    email: email || null,
    address: address || null,
    city: city,
    state: state,
    zip: zip,
    is_business: true, // Invoices typically involve businesses
    notes: isVendor ? 'Vendor - auto-created from invoice parsing' : 'Auto-created from invoice parsing',
  };

  const createResponse = await fetch(
    `${getSupabaseUrl()}/rest/v1/customers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(newCustomer),
    }
  );

  if (createResponse.ok) {
    const [created] = await createResponse.json();
    logger.info('Created new customer', { name: created.name, id: created.id });
    return created;
  }

  logger.error('Failed to create customer');
  return null;
}

// ============================================
// GET - Fetch parsed invoice by document_id
// ============================================
export async function GET(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('document_id');
  const id = searchParams.get('id');
  const status = searchParams.get('status');

  try {
    let query = 'order=parsed_at.desc';

    if (id) {
      query = `id=eq.${id}`;
    } else if (documentId) {
      query = `document_id=eq.${documentId}`;
    } else if (status) {
      query += `&status=eq.${status}`;
    }

    const response = await fetch(
      `${getSupabaseUrl()}/rest/v1/parsed_invoices?${query}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (response.ok) {
      const parsedInvoices = await response.json();

      // Parse line_items JSON for each record
      const processed = parsedInvoices.map(inv => ({
        ...inv,
        line_items: typeof inv.line_items === 'string'
          ? JSON.parse(inv.line_items)
          : inv.line_items,
      }));

      return NextResponse.json(processed);
    }

    return NextResponse.json(
      { error: 'Failed to fetch parsed invoices' },
      { status: 500 }
    );

  } catch (error) {
    logger.error('Get parsed invoices error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
