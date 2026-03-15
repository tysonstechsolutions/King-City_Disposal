// ============================================
// DOCUMENT UPLOAD API
// ============================================
// Uploads documents to Supabase Storage

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { logger } from '../../../../lib/logger';

// Get Supabase credentials at runtime (not module init) for serverless compatibility
const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'image/bmp', 'image/tiff', 'image/svg+xml',
  // PDF
  'application/pdf',
  // Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  // Word
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  // Text
  'text/plain', 'text/csv', 'text/xml', 'application/xml',
  // Other common types
  'application/octet-stream', // Generic binary - allow and check extension
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
    const serviceDate = formData.get('service_date'); // Date on the receipt (when service occurred)

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
      const allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff', 'svg',
        'pdf',
        'xlsx', 'xls',
        'docx', 'doc',
        'txt', 'csv', 'xml'
      ];
      if (!allowedExtensions.includes(ext)) {
        logger.warn('File upload rejected - invalid type', { type: file.type, name: file.name, ext });
        return NextResponse.json(
          { error: 'Invalid file type. Allowed: images (JPG, PNG, HEIC, etc), PDF, Excel, Word, CSV, XML' },
          { status: 400 }
        );
      }
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${category}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseKey();

    // Debug logging
    logger.info('Upload attempt', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPrefix: supabaseUrl?.substring(0, 30),
      category,
      fileName: file.name
    });

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing Supabase credentials', null, { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/documents/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
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

      // Check for JWT/auth errors (Invalid Compact JWS = bad or missing service role key)
      if (errorText.includes('Invalid Compact JWS') || errorText.includes('invalid JWT') || errorText.includes('Invalid token')) {
        logger.error('Supabase auth error - check SUPABASE_SERVICE_ROLE_KEY env var');
        return NextResponse.json(
          { error: 'Authentication error. Please check that SUPABASE_SERVICE_ROLE_KEY is set correctly in your environment variables.' },
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
    // service_date = date on the receipt (when service occurred)
    // created_at = automatically set by DB (when uploaded to system)
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
      service_date: serviceDate || null, // Date on the receipt (when service occurred)
    };

    const dbResponse = await fetch(
      `${supabaseUrl}/rest/v1/documents`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
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
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
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
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseKey();

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
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
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
