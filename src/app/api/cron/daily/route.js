// ============================================
// COMBINED DAILY CRON JOB
// ============================================
//
// Runs at 6am CST (12:00 UTC), handles:
// 1. Daily route text to owner with optimized stops
// 2. Day-before delivery reminders to customers
// 3. Day-before pickup reminders to customers
// 4. Post-rental review requests (2 days after completion)
//
// SETUP:
// Add to vercel.json:
// { "path": "/api/cron/daily", "schedule": "0 12 * * *" }
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Verify cron secret (optional security)
function verifyCronSecret(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
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
  const response = await fetch(
    `${config.supabase.url}/rest/v1/bookings?${filter}`,
    {
      headers: {
        'apikey': config.supabase.anonKey,
        'Authorization': `Bearer ${config.supabase.anonKey}`,
      },
    }
  );
  return response.ok ? response.json() : [];
}

// Update booking
async function updateBooking(id, updates) {
  await fetch(`${config.supabase.url}/rest/v1/bookings?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.supabase.anonKey,
      'Authorization': `Bearer ${config.supabase.anonKey}`,
    },
    body: JSON.stringify(updates),
  });
}

// Format phone for Twilio (+1XXXXXXXXXX)
function formatPhoneForTwilio(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  return `+${cleaned}`;
}

// Simple distance calculation for route optimization
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Nearest neighbor algorithm for route optimization
function optimizeRoute(stops, startLat, startLng) {
  if (stops.length <= 1) return stops;

  const optimized = [];
  const remaining = [...stops];
  let currentLat = startLat;
  let currentLng = startLng;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      if (stop.placement_lat && stop.placement_lng) {
        const dist = getDistance(currentLat, currentLng, stop.placement_lat, stop.placement_lng);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
    }

    const nearest = remaining.splice(nearestIdx, 1)[0];
    optimized.push(nearest);

    if (nearest.placement_lat && nearest.placement_lng) {
      currentLat = nearest.placement_lat;
      currentLng = nearest.placement_lng;
    }
  }

  return optimized;
}

// ============================================
// PART 1: DAILY ROUTE TO OWNER
// ============================================
async function sendDailyRoute(today, results) {
  const todayStr = today.toISOString().split('T')[0];

  // Get today's deliveries
  const deliveries = await queryBookings(
    `delivery_date=eq.${todayStr}&status=eq.confirmed&order=created_at.asc`
  );

  // Get pickups due today
  const allDelivered = await queryBookings(`status=eq.delivered`);
  const pickups = allDelivered.filter(b => {
    const deliveryDate = new Date(b.delivery_date);
    const days = b.rental_duration === '3-day' ? 3 : 7;
    const pickupDate = new Date(deliveryDate);
    pickupDate.setDate(pickupDate.getDate() + days);
    return pickupDate.toISOString().split('T')[0] === todayStr;
  });

  // Get overdue pickups
  const overdue = allDelivered.filter(b => {
    const deliveryDate = new Date(b.delivery_date);
    const days = b.rental_duration === '3-day' ? 3 : 7;
    const pickupDate = new Date(deliveryDate);
    pickupDate.setDate(pickupDate.getDate() + days);
    return pickupDate.toISOString().split('T')[0] < todayStr;
  });

  const totalStops = deliveries.length + pickups.length;
  results.routeStops = totalStops;
  results.overdueCount = overdue.length;

  if (totalStops === 0 && overdue.length === 0) {
    await sendSMS(process.env.OWNER_PHONE,
      `☀️ Good morning!\n\n📅 No stops scheduled for today.\n\nEnjoy your day!`
    );
    return;
  }

  // Combine and mark stop types
  const allStops = [
    ...deliveries.map(d => ({ ...d, stopType: 'DELIVERY' })),
    ...pickups.map(p => ({ ...p, stopType: 'PICKUP' })),
  ];

  // Optimize route
  const optimizedStops = optimizeRoute(
    allStops,
    config.serviceAreaCenter.lat,
    config.serviceAreaCenter.lng
  );

  // Build message
  let message = `☀️ GOOD MORNING!\n\n🚛 TODAY'S ROUTE (${totalStops} stops)\n\n`;

  optimizedStops.forEach((stop, idx) => {
    const dumpster = config.dumpsters.find(d => d.id === stop.dumpster_size);
    const icon = stop.stopType === 'DELIVERY' ? '📦' : '🚛';

    message += `${idx + 1}. ${icon} ${stop.stopType}\n`;
    message += `   ${dumpster?.shortName || stop.dumpster_size}\n`;
    message += `   ${stop.address}\n`;

    if (stop.customer_name && stop.customer_name !== 'Manual Entry') {
      message += `   👤 ${stop.customer_name}\n`;
    }
    if (stop.customer_phone) {
      message += `   📞 ${stop.customer_phone}\n`;
    }
    if (stop.placement_notes) {
      message += `   📌 ${stop.placement_notes}\n`;
    }
    message += '\n';
  });

  if (overdue.length > 0) {
    message += `⚠️ ${overdue.length} OVERDUE:\n`;
    for (const o of overdue.slice(0, 3)) {
      message += `• ${o.address.substring(0, 25)}...\n`;
    }
    message += '\n';
  }

  if (optimizedStops.length > 0) {
    const addresses = optimizedStops.map(s => encodeURIComponent(s.address)).join('/');
    message += `🗺️ Open route:\ngoogle.com/maps/dir/${addresses}`;
  }

  await sendSMS(process.env.OWNER_PHONE, message);
  console.log(`📨 Daily route sent: ${totalStops} stops`);
}

// ============================================
// PART 2: CUSTOMER REMINDERS
// ============================================
async function sendReminders(today, results) {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // ========================================
  // DELIVERY REMINDERS (day before)
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
  // PICKUP REMINDERS (day before rental ends)
  // ========================================
  const pickupBookings = await queryBookings(
    `status=eq.delivered&pickup_reminder_sent=is.null`
  );

  for (const booking of pickupBookings) {
    try {
      const deliveryDate = new Date(booking.delivery_date);
      const rentalDays = booking.rental_duration === '3-day' ? 3 : 7;
      const pickupDate = new Date(deliveryDate);
      pickupDate.setDate(pickupDate.getDate() + rentalDays);

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
  // REVIEW REQUESTS (2 days after completion)
  // ========================================
  const completedBookings = await queryBookings(
    `status=eq.completed&review_request_sent=is.null`
  );

  for (const booking of completedBookings) {
    try {
      const completedDate = new Date(booking.completed_at || booking.updated_at);
      const daysSinceCompletion = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));

      if (daysSinceCompletion < 2) continue;

      const phone = formatPhoneForTwilio(booking.customer_phone);
      const firstName = booking.customer_name.split(' ')[0];
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
}

// ============================================
// MAIN CRON HANDLER
// ============================================
export async function GET(request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    routeStops: 0,
    overdueCount: 0,
    deliveryReminders: 0,
    pickupReminders: 0,
    reviewRequests: 0,
    errors: [],
  };

  try {
    const today = new Date();

    // Part 1: Send daily route to owner
    await sendDailyRoute(today, results);

    // Part 2: Send customer reminders
    await sendReminders(today, results);

    console.log('📊 Daily cron complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Daily cron error:', error);
    return NextResponse.json({
      error: error.message,
      ...results,
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
