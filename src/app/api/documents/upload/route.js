// ============================================
// DOCUMENT UPLOAD API
// ============================================
// Uploads documents to Supabase Storage

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { logger } from '../../../../lib/logger';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/xml', 'application/xml', // xml
  'text/csv',
];

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const category = formData.get('category') || 'other';
    const title = formData.get('title') || file?.name;
    const bookingId = formData.get('booking_id');
    const customerId = formData.get('customer_id');
    const invoiceId = formData.get('invoice_id');
    const weightLbs = formData.get('weight_lbs');
    const amountCents = formData.get('amount_cents');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      logger.warn('File upload rejected - too large', { size: file.size, max: MAX_FILE_SIZE });
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type (allow common document types)
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      // Also allow by extension for files without proper MIME type
      const ext = file.name?.toLowerCase().split('.').pop();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'pdf', 'xlsx', 'xls', 'xml', 'csv'];
      if (!allowedExtensions.includes(ext)) {
        logger.warn('File upload rejected - invalid type', { type: file.type, name: file.name });
        return NextResponse.json(
          { error: 'Invalid file type. Allowed: images, PDF, Excel, XML, CSV' },
          { status: 400 }
        );
      }
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${category}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/documents/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getSupabaseKey()}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      logger.error('Storage upload error', null, { error: errorText, status: uploadResponse.status });

      // Check if bucket doesn't exist
      if (errorText.includes('Bucket not found')) {
        return NextResponse.json(
          { error: 'Storage not configured. Please create a "documents" bucket in Supabase.' },
          { status: 500 }
        );
      }

      // Parse error for more detail
      let errorMessage = 'Failed to upload file';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText || 'Failed to upload file';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: uploadResponse.status }
      );
    }

    // Create document record
    const documentData = {
      booking_id: bookingId ? parseInt(bookingId) : null,
      customer_id: customerId ? parseInt(customerId) : null,
      invoice_id: invoiceId ? parseInt(invoiceId) : null,
      category,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      title,
      weight_lbs: weightLbs ? parseInt(weightLbs) : null,
      amount_cents: amountCents ? parseInt(amountCents) : null,
      document_date: new Date().toISOString().split('T')[0],
    };

    const dbResponse = await fetch(
      `${supabaseUrl}/rest/v1/documents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(documentData),
      }
    );

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      logger.error('Document record error', null, { error: errorText });
      return NextResponse.json(
        { error: 'Failed to save document record' },
        { status: 500 }
      );
    }

    const [document] = await dbResponse.json();

    // If this is a weight ticket attached to a booking, update the booking
    if (category === 'weight_ticket' && bookingId && weightLbs) {
      await fetch(
        `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
          body: JSON.stringify({
            actual_weight_lbs: parseInt(weightLbs),
            weight_recorded_at: new Date().toISOString(),
          }),
        }
      );
    }

    // Auto-parse documents with AI based on category
    const shouldParse = ['invoice', 'weight_ticket', 'fuel_receipt'].includes(category);
    if (shouldParse && process.env.ANTHROPIC_API_KEY) {
      try {
        // Trigger async parsing (don't wait for it)
        const parseUrl = new URL('/api/documents/parse', request.url);
        fetch(parseUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: document.id, category }),
        }).catch(err => logger.error('Background parse error', err));

        logger.info('Document parsing triggered', { category, document_id: document.id });
      } catch (parseError) {
        logger.error('Failed to trigger document parsing', parseError);
      }
    }

    logger.info('Document uploaded', { path: storagePath, id: document.id });

    return NextResponse.json({
      success: true,
      document,
      storage_path: storagePath,
      parsing: category === 'invoice' && process.env.ANTHROPIC_API_KEY ? true : false,
    });

  } catch (error) {
    logger.error('Document upload error', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// GET DOCUMENTS
// ============================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('booking_id');
  const customerId = searchParams.get('customer_id');
  const category = searchParams.get('category');

  try {
    let query = 'order=created_at.desc';
    
    if (bookingId) {
      query += `&booking_id=eq.${bookingId}`;
    }
    if (customerId) {
      query += `&customer_id=eq.${customerId}`;
    }
    if (category) {
      query += `&category=eq.${category}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/documents?${query}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (response.ok) {
      const documents = await response.json();
      
      // Add public URLs for each document
      const docsWithUrls = documents.map(doc => ({
        ...doc,
        url: `${supabaseUrl}/storage/v1/object/public/documents/${doc.storage_path}`,
      }));
      
      return NextResponse.json(docsWithUrls);
    }

    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });

  } catch (error) {
    logger.error('Get documents error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
