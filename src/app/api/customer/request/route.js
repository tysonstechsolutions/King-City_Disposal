import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { notifyOwner } from '../../../../lib/notifications';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

export async function POST(request) {
  try {
    const { bookingId, phone, requestType, notes } = await request.json();

    if (!bookingId || !phone || !requestType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['pickup', 'extension', 'issue'].includes(requestType)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      );
    }

    // Clean phone for verification
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // Verify booking belongs to this phone
    const bookingResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&customer_phone=ilike.%${cleanPhone}%&limit=1`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!bookingResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to verify booking' },
        { status: 500 }
      );
    }

    const bookings = await bookingResponse.json();
    if (bookings.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found or phone does not match' },
        { status: 404 }
      );
    }

    const booking = bookings[0];

    // Format request message
    const requestLabels = {
      pickup: 'PICKUP REQUEST',
      extension: 'EXTENSION REQUEST',
      issue: 'ISSUE REPORTED',
    };

    const message = `
${requestLabels[requestType]}

Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Address: ${booking.address}
Dumpster: ${booking.dumpster_size}
Status: ${booking.status}

${notes ? `Notes: ${notes}` : ''}

Submitted via Customer Portal
`.trim();

    // Notify owner
    await notifyOwner(message);

    // Add note to booking
    const existingNotes = booking.notes || '';
    const newNote = `[${new Date().toLocaleDateString()}] Customer ${requestType} request: ${notes || 'No additional notes'}`;

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
          notes: existingNotes ? `${existingNotes}\n${newNote}` : newNote,
        }),
      }
    );

    return NextResponse.json({
      success: true,
      message: `Your ${requestType} request has been submitted. We'll contact you shortly.`,
    });

  } catch (error) {
    console.error('Customer request error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
