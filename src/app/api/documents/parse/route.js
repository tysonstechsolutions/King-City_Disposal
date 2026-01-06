// ============================================
// INVOICE PARSING API - Claude AI Vision
// ============================================
// Extracts structured data from invoice images

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

// Force dynamic rendering (not static)
export const dynamic = 'force-dynamic';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// POST - Parse an invoice document
// ============================================
export async function POST(request) {
  try {
    const { document_id } = await request.json();

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
      `${supabaseUrl}/rest/v1/documents?id=eq.${document_id}`,
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

    // Update document status to 'parsing'
    await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${document_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
        body: JSON.stringify({ parse_status: 'parsing' }),
      }
    );

    // 2. Fetch the image from Supabase Storage
    const imageUrl = `${supabaseUrl}/storage/v1/object/authenticated/documents/${document.storage_path}`;
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    });

    if (!imageResponse.ok) {
      await updateDocumentStatus(document_id, 'failed');
      return NextResponse.json(
        { error: 'Failed to fetch image from storage' },
        { status: 500 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mediaType = document.file_type || 'image/jpeg';

    // 3. Call Claude AI Vision API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `CAREFULLY analyze this invoice/receipt image and extract ALL information with high accuracy. Read every number, word, and detail precisely.

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
  "expense_category": "landfill" or "fuel" or "parts" or "repairs" or "supplies" or "dumpster_rental" or "other",
  "notes": "Any additional notes, weight tickets, reference numbers, or important info",
  "confidence": 0.95
}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- ACCURACY IS PARAMOUNT: Double-check all numbers, especially quantities, weights, and amounts
- READ NUMBERS EXACTLY: If it says "3 tons", extract 3 not 2. If it says "$156.75", that's 15675 cents
- WEIGHTS: Look for tonnage, pounds, cubic yards - include in line item descriptions AND notes
- If this is an invoice FROM "King City Disposal" to a customer, set invoice_type to "customer_record"
- If this is a bill TO "King City Disposal" from a vendor, set invoice_type to "vendor_expense"
- All monetary amounts must be in cents (multiply dollars by 100)
- For expense_category: landfill (dump fees/waste disposal), fuel (gas/diesel), parts, repairs, supplies, dumpster_rental, or other
- Include weight/tonnage info in the notes field even if it appears elsewhere
- Set confidence between 0 and 1 based on image clarity and your certainty
- If a field is not visible or unclear, use null

Return ONLY the JSON object, no other text.`
              }
            ],
          }
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', errorText);
      console.error('Claude API status:', claudeResponse.status);
      await updateDocumentStatus(document_id, 'failed');

      // Parse error for more detail
      let errorMessage = 'Failed to parse invoice with AI';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || 'Failed to parse invoice with AI';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const claudeResult = await claudeResponse.json();
    const aiText = claudeResult.content[0]?.text || '';

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
      console.error('Failed to parse AI response:', aiText);
      await updateDocumentStatus(document_id, 'failed');
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      );
    }

    // 5. Find or create customer based on invoice type
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
    } else {
      // For vendor expenses, the vendor is in the "from" field
      // We can optionally track vendors as "customers" too
      if (parsedData.from?.name) {
        customer = await findOrCreateCustomer({
          name: parsedData.from.name,
          phone: parsedData.from.phone,
          email: parsedData.from.email,
          address: parsedData.from.address,
        }, true); // Mark as vendor
      }
    }

    // 6. Store in parsed_invoices table
    const taxYear = parsedData.invoice_date
      ? new Date(parsedData.invoice_date).getFullYear()
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
      invoice_date: parsedData.invoice_date || null,
      due_date: parsedData.due_date || null,
      payment_terms: parsedData.payment_terms || null,
      line_items: JSON.stringify(parsedData.line_items || []),
      subtotal_cents: parsedData.subtotal_cents || null,
      tax_cents: parsedData.tax_cents || 0,
      fees_cents: parsedData.fees_cents || 0,
      discount_cents: parsedData.discount_cents || 0,
      total_cents: parsedData.total_cents || null,
      expense_category: parsedData.expense_category || 'other',
      tax_year: taxYear,
      status: 'pending_review',
      confidence_score: parsedData.confidence || 0.8,
      raw_text: parsedData.notes || null,
    };

    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/parsed_invoices`,
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
      console.error('Failed to insert parsed invoice:', errorText);
      await updateDocumentStatus(document_id, 'failed');
      return NextResponse.json(
        { error: 'Failed to save parsed data' },
        { status: 500 }
      );
    }

    const [parsedInvoice] = await insertResponse.json();

    // 7. Update document with parse status, link, and customer
    await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${document_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
        body: JSON.stringify({
          parse_status: 'parsed',
          parsed_invoice_id: parsedInvoice.id,
          customer_id: customer?.id || null,
        }),
      }
    );

    // 8. Update customer stats if we linked one
    if (customer?.id && parsedInvoiceData.total_cents) {
      // Update customer's total_spent if this is a customer invoice
      if (invoiceType === 'customer_record') {
        await fetch(
          `${supabaseUrl}/rest/v1/rpc/increment_customer_spent`,
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

    console.log(`Invoice parsed successfully: Document ${document_id} -> Parsed Invoice ${parsedInvoice.id}${customer ? ` -> Customer ${customer.id} (${customer.name})` : ''}`);

    return NextResponse.json({
      success: true,
      parsed_invoice: {
        ...parsedInvoice,
        line_items: parsedData.line_items || [],
      },
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        is_new: !customer.created_at || (Date.now() - new Date(customer.created_at).getTime()) < 5000,
      } : null,
    });

  } catch (error) {
    console.error('Parse invoice error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to update document parse status
async function updateDocumentStatus(documentId, status) {
  await fetch(
    `${supabaseUrl}/rest/v1/documents?id=eq.${documentId}`,
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
    `${supabaseUrl}/rest/v1/customers?or=(${query})&limit=1`,
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
      console.log(`Found existing customer: ${existing[0].name} (ID: ${existing[0].id})`);
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
    `${supabaseUrl}/rest/v1/customers`,
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
    console.log(`Created new customer: ${created.name} (ID: ${created.id})`);
    return created;
  }

  console.error('Failed to create customer');
  return null;
}

// ============================================
// GET - Fetch parsed invoice by document_id
// ============================================
export async function GET(request) {
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
      `${supabaseUrl}/rest/v1/parsed_invoices?${query}`,
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
    console.error('Get parsed invoices error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
