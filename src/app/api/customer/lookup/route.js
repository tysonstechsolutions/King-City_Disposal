import { NextResponse } from 'next/server';
import { config } from '../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// Rate limiting - simple in-memory store (use Redis in production)
const lookupAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS = 5;

function checkRateLimit(phone) {
  const now = Date.now();
  const key = phone.replace(/\D/g, '').slice(-10);
  const attempts = lookupAttempts.get(key) || [];

  // Clean old attempts
  const recentAttempts = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return false;
  }

  recentAttempts.push(now);
  lookupAttempts.set(key, recentAttempts);
  return true;
}

export async function POST(request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Rate limit check
    if (!checkRateLimit(cleanPhone)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const last10 = cleanPhone.slice(-10);

    // Find customer
    const customerResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?phone=ilike.%${last10}%&limit=1`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    let customer = null;
    if (customerResponse.ok) {
      const customers = await customerResponse.json();
      customer = customers[0] || null;
    }

    // Find bookings by phone
    const bookingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?customer_phone=ilike.%${last10}%&order=created_at.desc`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!bookingsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to lookup bookings' },
        { status: 500 }
      );
    }

    const bookings = await bookingsResponse.json();

    // Find invoices for this customer
    let invoices = [];
    if (customer?.id) {
      const invoicesResponse = await fetch(
        `${supabaseUrl}/rest/v1/invoices?customer_id=eq.${customer.id}&order=created_at.desc`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );
      if (invoicesResponse.ok) {
        invoices = await invoicesResponse.json();
      }
    }

    // Return sanitized data (no internal IDs exposed directly)
    return NextResponse.json({
      success: true,
      customer: customer ? {
        name: customer.name,
        email: customer.email,
        totalJobs: customer.total_jobs || bookings.length,
      } : null,
      bookings: bookings.map(b => ({
        id: b.id,
        status: b.status,
        address: b.address,
        dumpsterSize: b.dumpster_size,
        deliveryDate: b.delivery_date,
        rentalDuration: b.rental_duration,
        priceCents: b.price_cents,
        createdAt: b.created_at,
        paid: b.paid,
      })),
      invoices: invoices.map(i => ({
        id: i.id,
        status: i.status,
        totalCents: i.total_cents,
        dueDate: i.due_date,
        paymentLink: i.payment_link,
      })),
    });

  } catch (error) {
    console.error('Customer lookup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
