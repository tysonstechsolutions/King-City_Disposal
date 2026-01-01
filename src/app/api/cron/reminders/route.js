// ============================================
// AUTOMATED REMINDERS CRON JOB
// ============================================
// 
// Run this daily via Vercel Cron or external service
// Sends:
// - Day-before delivery reminders
// - Day-before pickup reminders  
// - Post-rental review requests (2 days after completion)
//
// SETUP (Vercel Cron):
// Add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/reminders",
//     "schedule": "0 14 * * *"  // 2pm UTC = 8am CST
//   }]
// }
//
// Or use external: cron-job.org, easycron.com, etc.
// 
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

// Verify cron secret (optional security)
function verifyCronSecret(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If no secret configured, allow (for easier testing)
  if (!cronSecret) return true;
  
  return authHeader === `Bearer ${cronSecret}`;
}

// Send SMS via Twilio
async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log('Twilio not configured, skipping SMS');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({ To: to, From: from, Body: message }),
      }
    );

    const data = await response.json();
    if (data.error_code) {
      console.error(`SMS error to ${to}:`, data.error_message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('SMS send error:', e);
    return null;
  }
}

// Query Supabase
async function queryBookings(filter) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.anonKey;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/bookings?${filter}`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  if (response.ok) {
    return response.json();
  }
  return [];
}

// Update booking
async function updateBooking(id, updates) {
  const supabaseUrl = config.supabase.url;
  const supabaseKey = config.supabase.anonKey;

  await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(updates),
  });
}

// Format phone for Twilio (+1XXXXXXXXXX)
function formatPhoneForTwilio(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}

// ============================================
// MAIN CRON HANDLER
// ============================================
export async function GET(request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    deliveryReminders: 0,
    pickupReminders: 0,
    reviewRequests: 0,
    errors: [],
  };

  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    // ========================================
    // 1. DELIVERY REMINDERS (day before)
    // ========================================
    const deliveryBookings = await queryBookings(
      `delivery_date=eq.${tomorrowStr}&status=eq.confirmed&delivery_reminder_sent=is.null`
    );

    for (const booking of deliveryBookings) {
      try {
        const phone = formatPhoneForTwilio(booking.customer_phone);
        const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);

        const message = `Hi ${booking.customer_name.split(' ')[0]}! 🚛

Your ${dumpster?.name || 'dumpster'} arrives TOMORROW between 8am-12pm.

📍 ${booking.address}
${booking.placement_notes ? `📌 Placement: ${booking.placement_notes}` : ''}

Please make sure the area is clear and accessible.

Questions? Reply to this text or call ${config.phone}

- ${config.businessName}`;

        const sent = await sendSMS(phone, message);
        if (sent) {
          await updateBooking(booking.id, { delivery_reminder_sent: new Date().toISOString() });
          results.deliveryReminders++;
          console.log(`✅ Delivery reminder sent to ${booking.customer_name}`);
        }
      } catch (e) {
        results.errors.push(`Delivery reminder failed for ${booking.id}: ${e.message}`);
      }
    }

    // ========================================
    // 2. PICKUP REMINDERS (day before rental ends)
    // ========================================
    // Calculate pickup dates: delivery_date + rental_duration
    const pickupBookings = await queryBookings(
      `status=eq.delivered&pickup_reminder_sent=is.null`
    );

    for (const booking of pickupBookings) {
      try {
        // Calculate when rental ends
        const deliveryDate = new Date(booking.delivery_date);
        const durationMatch = booking.rental_duration?.match(/(\d+)-day/);
        const rentalDays = durationMatch ? parseInt(durationMatch[1]) : 10;
        const pickupDate = new Date(deliveryDate);
        pickupDate.setDate(pickupDate.getDate() + rentalDays);

        // Check if pickup is tomorrow
        const pickupDateStr = pickupDate.toISOString().split('T')[0];
        if (pickupDateStr !== tomorrowStr) continue;

        const phone = formatPhoneForTwilio(booking.customer_phone);
        const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
        const dailyRate = dumpster?.dailyExtension || 20;

        const message = `Hi ${booking.customer_name.split(' ')[0]}! ⏰

Your rental ends TOMORROW. We'll pick up your ${dumpster?.name || 'dumpster'} between 8am-5pm.

📍 ${booking.address}

Need more time? Reply EXTEND for $${dailyRate}/day
All done? Make sure nothing is blocking the dumpster!

- ${config.businessName}`;

        const sent = await sendSMS(phone, message);
        if (sent) {
          await updateBooking(booking.id, { pickup_reminder_sent: new Date().toISOString() });
          results.pickupReminders++;
          console.log(`✅ Pickup reminder sent to ${booking.customer_name}`);
        }
      } catch (e) {
        results.errors.push(`Pickup reminder failed for ${booking.id}: ${e.message}`);
      }
    }

    // ========================================
    // 3. REVIEW REQUESTS (2 days after completion)
    // ========================================
    const completedBookings = await queryBookings(
      `status=eq.completed&review_request_sent=is.null`
    );

    for (const booking of completedBookings) {
      try {
        // Check if completed 2+ days ago
        const completedDate = new Date(booking.completed_at || booking.updated_at);
        const daysSinceCompletion = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceCompletion < 2) continue;

        const phone = formatPhoneForTwilio(booking.customer_phone);
        const firstName = booking.customer_name.split(' ')[0];

        // Use Google Business Profile link if available
        const reviewLink = config.social?.google || 
          `https://search.google.com/local/writereview?placeid=${config.googlePlaceId || ''}`;

        const message = `Hi ${firstName}! Thanks for choosing ${config.businessName}! 🙏

How did we do? We'd really appreciate a quick Google review - it helps other folks find us!

⭐ Leave a review: ${reviewLink}

Thanks again!
- The ${config.businessName} Team`;

        const sent = await sendSMS(phone, message);
        if (sent) {
          await updateBooking(booking.id, { review_request_sent: new Date().toISOString() });
          results.reviewRequests++;
          console.log(`✅ Review request sent to ${booking.customer_name}`);
        }
      } catch (e) {
        results.errors.push(`Review request failed for ${booking.id}: ${e.message}`);
      }
    }

    console.log('📊 Reminder cron complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ 
      error: error.message,
      ...results,
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request) {
  return GET(request);
}
