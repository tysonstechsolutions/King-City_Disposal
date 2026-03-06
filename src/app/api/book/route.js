import { NextResponse } from 'next/server';
import { config, isInServiceArea } from '../../../config';
import { notifyOwner } from '../../../lib/notifications';
import { bookingSchema, validateInput } from '../../../lib/validations';
import { logger } from '../../../lib/logger';
import { bookingRateLimit } from '../../../lib/rateLimit';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// FIND OR CREATE CUSTOMER
// ============================================
async function findOrCreateCustomer({ name, phone, email, address, city, zip }) {
  if (!name || !phone) return null;

  // Clean phone number for matching - only allow digits
  const cleanPhone = phone.replace(/\D/g, '');

  // Validate phone contains only digits after cleaning (SQL injection prevention)
  if (!/^\d+$/.test(cleanPhone)) {
    logger.warn('Invalid phone number format after cleaning');
    return null;
  }

  // Sanitize email for query (basic validation)
  const sanitizedEmail = email ? email.replace(/['"\\;]/g, '').trim() : null;

  // Try to find existing customer by phone or email
  const conditions = [];
  if (cleanPhone.length >= 10) {
    conditions.push(`phone.ilike.%${cleanPhone.slice(-10)}%`);
  }
  if (sanitizedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    conditions.push(`email.ilike.${encodeURIComponent(sanitizedEmail)}`);
  }

  if (conditions.length > 0) {
    const searchResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?or=(${conditions.join(',')})&limit=1`,
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

        // Update customer stats and city/zip if provided
        const updateData = {
          total_jobs: (existing[0].total_jobs || 0) + 1,
          last_job_date: new Date().toISOString().split('T')[0],
        };
        // Update city/zip if they were provided but customer doesn't have them
        if (city && !existing[0].city) updateData.city = city;
        if (zip && !existing[0].zip) updateData.zip = zip;

        await fetch(
          `${supabaseUrl}/rest/v1/customers?id=eq.${existing[0].id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
            },
            body: JSON.stringify(updateData),
          }
        );

        return existing[0];
      }
    }
  }

  // Use explicit city/zip if provided, otherwise parse from address
  let customerCity = city || null;
  let customerZip = zip || null;
  let state = 'IL';

  // Only parse address if city/zip not explicitly provided
  if (!customerCity && !customerZip && address) {
    const stateZipMatch = address.match(/([A-Za-z\s]+),?\s*([A-Z]{2})\s*(\d{5})?/);
    if (stateZipMatch) {
      customerCity = stateZipMatch[1]?.trim();
      state = stateZipMatch[2] || 'IL';
      customerZip = stateZipMatch[3] || null;
    }
  }

  // Create new customer
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
      body: JSON.stringify({
        name,
        phone,
        email: email || null,
        address: address || null,
        city: customerCity,
        state,
        zip: customerZip,
        total_jobs: 1,
        last_job_date: new Date().toISOString().split('T')[0],
        notes: 'Auto-created from online booking',
      }),
    }
  );

  if (createResponse.ok) {
    const [created] = await createResponse.json();
    logger.info('Created new customer', { name: created.name, id: created.id });
    return created;
  }

  // Enhanced error logging for debugging
  const errorText = await createResponse.text();
  logger.error('Failed to create customer', null, {
    status: createResponse.status,
    error: errorText,
    customerData: { name, phone, email, address, city, zip }
  });
  console.error('Customer creation failed:', {
    status: createResponse.status,
    error: errorText,
    name,
    phone
  });
  return null;
}

// Parse "Mon, Jan 6" format to "2025-01-06" for database
// Handles year rollover (e.g., booking in December for January)
function parseDeliveryDate(dateStr) {
  try {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    // Try parsing with current year
    let parsed = new Date(`${dateStr} ${currentYear}`);

    if (isNaN(parsed.getTime())) {
      // Fallback: return tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Year rollover fix: if parsed date is more than 7 days in the past,
    // it's likely meant for next year (e.g., "Jan 6" in December)
    const daysDiff = Math.floor((parsed - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < -7) {
      parsed = new Date(`${dateStr} ${currentYear + 1}`);
    }

    return parsed.toISOString().split('T')[0]; // Returns "2025-01-06" format
  } catch {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
}

// ============================================
// BOOKING API ENDPOINT
// ============================================
// This handles new bookings from the chatbot
// 
// Currently:
// ✅ Saves to Supabase database
// ✅ Returns success/error
//
// 🔌 PLUG IN LATER:
// - Twilio SMS notification (when enabled in config)
// - Stripe payment (when enabled in config)
// - Email notification (when Resend is added)
// ============================================

export async function POST(request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const rateLimitResult = bookingRateLimit(ip);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for booking', { ip });
      return NextResponse.json(
        { error: 'Too many booking attempts. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = validateInput(bookingSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, errors: validation.errors },
        { status: 400 }
      );
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      address,
      placementLat,
      placementLng,
      placementNotes,
      dumpsterSize,
      rentalDuration,
      deliveryDate,
      priceCents,
      projectType,
    } = validation.data;

    // Extract city and zip (not in Zod schema, just pass through)
    const city = body.city || null;
    const zip = body.zip || null;

    // ============================================
    // SERVICE AREA VALIDATION
    // ============================================
    // Check if placement coordinates are within service area
    if (placementLat && placementLng) {
      if (!isInServiceArea(placementLat, placementLng)) {
        logger.warn('Booking attempted outside service area', {
          lat: placementLat,
          lng: placementLng,
          address,
        });
        return NextResponse.json(
          {
            error: 'This location is outside our service area. Please call us to discuss options.',
            outsideServiceArea: true,
          },
          { status: 400 }
        );
      }
    }

    // ============================================
    // 1. FIND OR CREATE CUSTOMER
    // ============================================
    const customer = await findOrCreateCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: address,
      city: city,
      zip: zip,
    });

    // ============================================
    // 2. SAVE BOOKING TO DATABASE
    // ============================================
    const bookingData = {
      customer_id: customer?.id || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      address: address,
      placement_lat: placementLat || null,
      placement_lng: placementLng || null,
      placement_notes: placementNotes || null,
      dumpster_size: dumpsterSize,
      rental_duration: rentalDuration,
      delivery_date: parseDeliveryDate(deliveryDate),
      price_cents: priceCents || 0,
      project_type: projectType || null,
      status: 'pending',
      paid: false,
    };

    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(bookingData),
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      logger.error('Supabase booking save error', null, { error: errorText });
      console.error('Supabase booking error:', errorText);
      return NextResponse.json(
        { error: `Failed to save booking: ${errorText}` },
        { status: 500 }
      );
    }

    const savedBooking = await dbResponse.json();
    logger.info('Booking saved', {
      booking_id: savedBooking[0]?.id,
      customer: customerName,
      size: dumpsterSize,
      date: deliveryDate,
    });

    // ============================================
    // 3. NOTIFY TEAM (PENDING PAYMENT)
    // ============================================
    // Customer confirmation is sent AFTER payment via webhook

    const dumpster = config.dumpsters.find(d => d.id === dumpsterSize);
    const priceDisplay = priceCents ? `$${(priceCents / 100).toFixed(2)}` : 'TBD';

    // Add warning if customer creation failed
    const customerWarning = !customer ? '\n\n⚠️ WARNING: Customer record not created - please add manually!' : '';

    try {
      await notifyOwner(
        `🚛 NEW BOOKING (PENDING PAYMENT)\n\n${customerName}\n📞 ${customerPhone}\n📍 ${address}\n📌 Placement: ${placementNotes || 'Not specified'}\n\n📦 ${dumpster?.name || dumpsterSize}\n📅 ${deliveryDate}\n⏱️ ${rentalDuration}\n💰 ${priceDisplay}\n\n⏳ Awaiting online payment...${customerWarning}`
      );
      logger.notification('sms', 'team', true, { booking_id: savedBooking[0]?.id });
    } catch (notifyError) {
      logger.error('Team notification failed', notifyError, { booking_id: savedBooking[0]?.id });
    }

    // ============================================
    // 4. CREATE STRIPE CHECKOUT SESSION
    // ============================================
    // ============================================
    // ONLINE BOOKINGS REQUIRE IMMEDIATE PAYMENT
    // ============================================
    // Online bookings must be paid at time of booking
    // Admin-created invoices can be sent for later payment
    let checkoutUrl = null;

    if (priceCents > 0) {
      // Verify Stripe is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        logger.error('Stripe not configured for online booking payment');
        return NextResponse.json(
          { error: 'Online payment is currently unavailable. Please call us to book: ' + config.phone },
          { status: 503 }
        );
      }

      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kingcitydisposal.com';
        const bookingId = savedBooking[0]?.id;
        const durationMatch = rentalDuration.match(/(\d+)-day/);
        const durationLabel = durationMatch ? `${durationMatch[1]}-Day` : '10-Day';

        // Calculate fees
        const taxRate = config.payments.salesTaxRate || 0;
        const stripeRate = config.payments.stripeProcessingRate || 0;
        const stripeFlat = config.payments.stripeProcessingFlat || 0;

        const taxCents = Math.round(priceCents * taxRate);
        // Stripe fee is calculated on the total after tax
        const subtotalWithTax = priceCents + taxCents;
        // To pass Stripe fee to customer: fee = (subtotal + flat) / (1 - rate) - subtotal
        const stripeFee = Math.round((subtotalWithTax + stripeFlat) / (1 - stripeRate) - subtotalWithTax);

        const requestBody = new URLSearchParams({
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][product_data][name]': `${dumpster?.name || dumpsterSize} - ${durationLabel} Rental`,
          'line_items[0][price_data][product_data][description]': `Dumpster rental at ${address}. Includes ${dumpster?.weightIncluded || '2 tons'}.`,
          'line_items[0][price_data][unit_amount]': priceCents.toString(),
          'line_items[0][quantity]': '1',
          'line_items[1][price_data][currency]': 'usd',
          'line_items[1][price_data][product_data][name]': 'IL Rental Tax (9.5%)',
          'line_items[1][price_data][unit_amount]': taxCents.toString(),
          'line_items[1][quantity]': '1',
          'line_items[2][price_data][currency]': 'usd',
          'line_items[2][price_data][product_data][name]': 'Card Processing Fee',
          'line_items[2][price_data][unit_amount]': stripeFee.toString(),
          'line_items[2][quantity]': '1',
          'mode': 'payment',
          'success_url': `${siteUrl}/payment-success?booking=${bookingId || ''}&session_id={CHECKOUT_SESSION_ID}`,
          'cancel_url': `${siteUrl}/book?canceled=true`,
          'metadata[type]': 'booking',
          'metadata[booking_id]': bookingId?.toString() || '',
          'metadata[source]': 'king-city-disposal',
          'metadata[customer_name]': customerName,
          'metadata[customer_phone]': customerPhone,
          'metadata[dumpster_size]': dumpsterSize,
          'metadata[address]': address,
          'metadata[base_price_cents]': priceCents.toString(),
          'metadata[tax_cents]': taxCents.toString(),
          'metadata[stripe_fee_cents]': stripeFee.toString(),
        });

        if (customerEmail) {
          requestBody.append('customer_email', customerEmail);
        }

        const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: requestBody,
        });

        const stripeData = await stripeResponse.json();

        if (stripeData.url) {
          checkoutUrl = stripeData.url;
          logger.info('Stripe checkout created', { booking_id: bookingId, url: stripeData.url, base: priceCents, tax: taxCents, stripeFee });
        } else {
          logger.error('Stripe checkout creation failed', null, { error: stripeData.error });
          // FAIL the booking if payment checkout can't be created
          return NextResponse.json(
            { error: 'Unable to create payment checkout. Please try again or call us: ' + config.phone },
            { status: 500 }
          );
        }
      } catch (stripeError) {
        logger.error('Stripe checkout error', stripeError);
        // FAIL the booking if payment checkout errors
        return NextResponse.json(
          { error: 'Payment system error. Please call us to book: ' + config.phone },
          { status: 500 }
        );
      }

      // REQUIRE checkout URL for online bookings
      if (!checkoutUrl) {
        logger.error('No checkout URL generated for online booking');
        return NextResponse.json(
          { error: 'Payment checkout failed. Please call us to book: ' + config.phone },
          { status: 500 }
        );
      }
    }

    // ============================================
    // 5. RETURN SUCCESS WITH PAYMENT CHECKOUT
    // ============================================
    // At this point, checkoutUrl is guaranteed to exist
    // Online bookings always require immediate payment
    return NextResponse.json({
      success: true,
      bookingId: savedBooking[0]?.id,
      customerId: customer?.id || null,
      checkoutUrl,
      message: 'Booking created! Redirecting to secure payment...',
    });

  } catch (error) {
    logger.error('Booking API error', error);
    console.error('Booking API catch:', error?.message, error?.stack);
    return NextResponse.json(
      { error: error?.message || 'Something went wrong. Please call us directly.' },
      { status: 500 }
    );
  }
}

