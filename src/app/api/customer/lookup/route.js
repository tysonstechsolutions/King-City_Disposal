import { NextResponse } from 'next/server';
import { config } from '../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// Rate limiting - simple in-memory store (use Redis in production)
const lookupAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes
let lastCleanup = Date.now();

// Clean up expired entries to prevent memory leaks
function cleanupExpiredEntries() {
  const now = Date.now();

  // Only run cleanup periodically
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }

  lastCleanup = now;

  for (const [key, attempts] of lookupAttempts.entries()) {
    const recentAttempts = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (recentAttempts.length === 0) {
      lookupAttempts.delete(key);
    } else {
      lookupAttempts.set(key, recentAttempts);
    }
  }
}

function checkRateLimit(phone) {
  const now = Date.now();
  const key = phone.replace(/\D/g, '').slice(-10);
  const attempts = lookupAttempts.get(key) || [];

  // Clean old attempts for this key
  const recentAttempts = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return false;
  }

  recentAttempts.push(now);
  lookupAttempts.set(key, recentAttempts);

  // Periodically clean up all expired entries
  cleanupExpiredEntries();

  return true;
}

export async function POST(request) {
  try {
    const { phone, name, address } = await request.json();

    // At least one search parameter required
    if (!phone && !name && !address) {
      return NextResponse.json(
        { error: 'Phone, name, or address is required' },
        { status: 400 }
      );
    }

    let cleanPhone = null;
    let last10 = null;

    if (phone) {
      // Clean phone number
      cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return NextResponse.json(
          { error: 'Invalid phone number' },
          { status: 400 }
        );
      }

      // Rate limit check (only for phone lookups)
      if (!checkRateLimit(cleanPhone)) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again in a minute.' },
          { status: 429 }
        );
      }

      last10 = cleanPhone.slice(-10);
    }

    let customer = null;

    // Strategy 1: Find customer by phone (most reliable)
    if (last10) {
      const customerResponse = await fetch(
        `${supabaseUrl}/rest/v1/customers?phone=ilike.%${last10}%&limit=1`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );

      if (customerResponse.ok) {
        const customers = await customerResponse.json();
        customer = customers[0] || null;
      }
    }

    // Strategy 2: Find customer by name AND address (for repeat customers)
    if (!customer && name && address) {
      // Extract the street part of the address for matching
      const streetPart = address.split(',')[0].trim();
      const customerResponse = await fetch(
        `${supabaseUrl}/rest/v1/customers?name=ilike.%${encodeURIComponent(name)}%&address=ilike.%${encodeURIComponent(streetPart)}%&limit=1`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );

      if (customerResponse.ok) {
        const customers = await customerResponse.json();
        customer = customers[0] || null;
      }
    }

    // Strategy 3: Find customer by name only (less reliable, but useful)
    if (!customer && name && !address) {
      const customerResponse = await fetch(
        `${supabaseUrl}/rest/v1/customers?name=ilike.%${encodeURIComponent(name)}%&limit=5`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );

      if (customerResponse.ok) {
        const customers = await customerResponse.json();
        // Only use if there's exactly one match to avoid confusion
        if (customers.length === 1) {
          customer = customers[0];
        }
      }
    }

    // Find bookings - by phone if available, or by customer_id
    let bookings = [];
    if (last10) {
      const bookingsResponse = await fetch(
        `${supabaseUrl}/rest/v1/bookings?customer_phone=ilike.%${last10}%&order=created_at.desc`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );

      if (bookingsResponse.ok) {
        bookings = await bookingsResponse.json();
      }
    } else if (customer?.id) {
      // No phone, but we found customer by name/address - find their bookings
      const bookingsResponse = await fetch(
        `${supabaseUrl}/rest/v1/bookings?customer_id=eq.${customer.id}&order=created_at.desc`,
        {
          headers: {
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
        }
      );

      if (bookingsResponse.ok) {
        bookings = await bookingsResponse.json();
      }
    }

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
        id: customer.id, // Include ID so booking can link to existing customer
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
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
