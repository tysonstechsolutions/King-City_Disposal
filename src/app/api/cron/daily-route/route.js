// ============================================
// DAILY ROUTE TEXT - CRON JOB
// ============================================
// 
// Runs at 6am CST, texts owner the day's route
// with optimized stop order and Google Maps link
//
// SETUP:
// Add to vercel.json:
// { "path": "/api/cron/daily-route", "schedule": "0 12 * * *" }
// (12 UTC = 6am CST)
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) return null;

  await fetch(
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
}

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

// Simple distance calculation for route optimization
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
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
      // Use placement coords if available, otherwise skip optimization for this stop
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

export async function GET(request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's deliveries
    const deliveries = await queryBookings(
      `delivery_date=eq.${today}&status=eq.confirmed&order=created_at.asc`
    );

    // Get pickups due today
    const allDelivered = await queryBookings(`status=eq.delivered`);
    const pickups = allDelivered.filter(b => {
      const deliveryDate = new Date(b.delivery_date);
      const days = b.rental_duration === '3-day' ? 3 : 7;
      const pickupDate = new Date(deliveryDate);
      pickupDate.setDate(pickupDate.getDate() + days);
      return pickupDate.toISOString().split('T')[0] === today;
    });

    // Also get overdue pickups
    const overdue = allDelivered.filter(b => {
      const deliveryDate = new Date(b.delivery_date);
      const days = b.rental_duration === '3-day' ? 3 : 7;
      const pickupDate = new Date(deliveryDate);
      pickupDate.setDate(pickupDate.getDate() + days);
      return pickupDate.toISOString().split('T')[0] < today;
    });

    const totalStops = deliveries.length + pickups.length;

    if (totalStops === 0 && overdue.length === 0) {
      await sendSMS(process.env.OWNER_PHONE, 
        `☀️ Good morning!\n\n📅 No stops scheduled for today.\n\n${overdue.length > 0 ? `⚠️ ${overdue.length} overdue pickups pending` : 'Enjoy your day!'}`
      );
      return NextResponse.json({ success: true, stops: 0 });
    }

    // Combine and mark stop types
    const allStops = [
      ...deliveries.map(d => ({ ...d, stopType: 'DELIVERY' })),
      ...pickups.map(p => ({ ...p, stopType: 'PICKUP' })),
    ];

    // Optimize route starting from service area center
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

    // Add overdue warning
    if (overdue.length > 0) {
      message += `⚠️ ${overdue.length} OVERDUE:\n`;
      for (const o of overdue.slice(0, 3)) {
        message += `• ${o.address.substring(0, 25)}...\n`;
      }
      message += '\n';
    }

    // Google Maps multi-stop link
    if (optimizedStops.length > 0) {
      const addresses = optimizedStops.map(s => encodeURIComponent(s.address)).join('/');
      message += `🗺️ Open route:\ngoogle.com/maps/dir/${addresses}`;
    }

    // Send the message
    await sendSMS(process.env.OWNER_PHONE, message);

    console.log(`📨 Daily route sent: ${totalStops} stops`);

    return NextResponse.json({
      success: true,
      stops: totalStops,
      deliveries: deliveries.length,
      pickups: pickups.length,
      overdue: overdue.length,
    });

  } catch (error) {
    console.error('Daily route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
