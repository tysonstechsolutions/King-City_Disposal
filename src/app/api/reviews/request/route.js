// ============================================
// REVIEW REQUEST API
// ============================================
// Sends SMS asking customers to leave a Google review
// after their service is complete.
//
// Can be triggered:
// - Manually from admin panel
// - Automatically when booking marked as picked_up
// - Via daily cron for completed bookings
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// SEND SMS HELPER
// ============================================
async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from || !to) {
    console.log('SMS not configured or no phone number');
    return false;
  }

  let cleanPhone = to.replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '1' + cleanPhone;
  if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({ To: cleanPhone, From: from, Body: message }),
      }
    );
    return response.ok;
  } catch (e) {
    console.error('SMS error:', e);
    return false;
  }
}

// ============================================
// GET GOOGLE REVIEW URL
// ============================================
function getReviewUrl() {
  // If Google Place ID is configured, use direct review link
  if (config.googlePlaceId) {
    return `https://search.google.com/local/writereview?placeid=${config.googlePlaceId}`;
  }
  // Fallback: search for business
  const businessSearch = encodeURIComponent(`${config.businessName} ${config.address?.city || ''} ${config.address?.state || ''}`);
  return `https://www.google.com/search?q=${businessSearch}`;
}

// ============================================
// POST - Send review request for a booking
// ============================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { booking_id, force } = body;

    if (!booking_id) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    // Get booking
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${booking_id}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const [booking] = await response.json();
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if already sent (unless forcing)
    if (booking.review_request_sent && !force) {
      return NextResponse.json({
        error: 'Review request already sent',
        sent_at: booking.review_request_sent
      }, { status: 400 });
    }

    // Check if phone number exists
    if (!booking.customer_phone) {
      return NextResponse.json({ error: 'No phone number for customer' }, { status: 400 });
    }

    const reviewUrl = getReviewUrl();
    const firstName = booking.customer_name?.split(' ')[0] || 'there';

    const message = `Hi ${firstName}! 👋

Thank you for choosing ${config.businessName}!

We'd love to hear about your experience. If you have a moment, please leave us a quick review:

⭐ ${reviewUrl}

Your feedback helps us serve you and others better!

Thanks again,
${config.businessName}`;

    const success = await sendSMS(booking.customer_phone, message);

    if (success) {
      // Mark as sent
      await fetch(
        `${supabaseUrl}/rest/v1/bookings?id=eq.${booking_id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
          body: JSON.stringify({
            review_request_sent: new Date().toISOString(),
          }),
        }
      );

      console.log(`⭐ Review request sent to ${booking.customer_name}`);
      return NextResponse.json({ success: true, message: 'Review request sent' });
    } else {
      return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
    }

  } catch (error) {
    console.error('Review request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// GET - Send review requests for recently completed bookings
// ============================================
// This can be called by cron job to auto-send review requests
// for bookings completed in the last 24 hours
export async function GET(request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get bookings marked as picked_up in the last 48 hours
    // that haven't had review request sent yet
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString();

    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?status=eq.picked_up&review_request_sent=is.null&updated_at=gte.${twoDaysAgoStr}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    const bookings = await response.json();
    const reviewUrl = getReviewUrl();
    let sent = 0;

    for (const booking of bookings) {
      if (!booking.customer_phone) continue;

      // Wait a day after pickup before asking for review
      const updatedAt = new Date(booking.updated_at);
      const now = new Date();
      const hoursAgo = (now - updatedAt) / (1000 * 60 * 60);

      // Only send if pickup was 12-48 hours ago
      if (hoursAgo < 12 || hoursAgo > 48) continue;

      const firstName = booking.customer_name?.split(' ')[0] || 'there';

      const message = `Hi ${firstName}! 👋

Thank you for choosing ${config.businessName}!

We hope everything went smoothly with your dumpster rental. If you have a moment, we'd really appreciate a quick review:

⭐ ${reviewUrl}

Your feedback helps other customers find us and helps us improve!

Thanks again,
${config.businessName}`;

      const success = await sendSMS(booking.customer_phone, message);

      if (success) {
        await fetch(
          `${supabaseUrl}/rest/v1/bookings?id=eq.${booking.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': getSupabaseKey(),
              'Authorization': `Bearer ${getSupabaseKey()}`,
            },
            body: JSON.stringify({
              review_request_sent: new Date().toISOString(),
            }),
          }
        );
        sent++;
      }
    }

    console.log(`⭐ Sent ${sent} review requests`);
    return NextResponse.json({
      success: true,
      review_requests_sent: sent,
      total_eligible: bookings.length
    });

  } catch (error) {
    console.error('Auto review request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
