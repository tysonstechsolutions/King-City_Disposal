// ============================================
// TWILIO INBOUND SMS WEBHOOK
// ============================================
// 
// CUSTOMER COMMANDS:
// - EXTEND → Extend rental, send payment link
// - PICKUP → Schedule pickup
// - STATUS → Check rental status
//
// OWNER COMMANDS (from OWNER_PHONE only):
// - ADD [address], [size], [date] → Add new job
// - WEIGHT [lbs] #[bookingId] → Calculate overage
// - ROUTE → Get today's optimized route
// - LIST → Show today's jobs
// - DELIVERED #[id] → Mark as delivered
// - PICKEDUP #[id] → Mark as completed
// - SEND → Send pending overage invoice
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

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
  return response.json();
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

async function insertBooking(data) {
  const response = await fetch(`${config.supabase.url}/rest/v1/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.supabase.anonKey,
      'Authorization': `Bearer ${config.supabase.anonKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (response.ok) {
    const result = await response.json();
    return result[0];
  }
  return null;
}

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

async function getActiveRental(phone) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const bookings = await queryBookings(
    `customer_phone=ilike.*${cleanPhone}*&status=in.(confirmed,delivered)&order=created_at.desc&limit=1`
  );
  return bookings[0] || null;
}

function parseDate(dateStr) {
  const lower = dateStr.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lower === 'today') return today.toISOString().split('T')[0];
  if (lower === 'tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  
  const days = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
  for (const [name, num] of Object.entries(days)) {
    if (lower.includes(name)) {
      const current = today.getDay();
      let daysUntil = num - current;
      if (daysUntil <= 0) daysUntil += 7;
      const d = new Date(today);
      d.setDate(today.getDate() + daysUntil);
      return d.toISOString().split('T')[0];
    }
  }
  
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function parseSize(sizeStr) {
  const lower = sizeStr.toLowerCase();
  if (lower.includes('14')) return '14yd';
  if (lower.includes('30')) return '30yd';
  return '20yd';
}

function isOwner(from) {
  const ownerPhone = process.env.OWNER_PHONE;
  if (!ownerPhone) return false;
  return from.replace(/\D/g, '').slice(-10) === ownerPhone.replace(/\D/g, '').slice(-10);
}

function twiml(message) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function looksLikeAddress(text) {
  return /^\d+\s+\w+/.test(text.trim()) || 
         /(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|way|blvd)/i.test(text);
}

async function createPaymentLink(name, amount, metadata) {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    const response = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': name,
        'line_items[0][price_data][unit_amount]': Math.round(amount * 100).toString(),
        'line_items[0][quantity]': '1',
        ...Object.fromEntries(Object.entries(metadata).map(([k, v]) => [`metadata[${k}]`, v.toString()])),
      }),
    });
    const data = await response.json();
    return data.url;
  } catch (e) {
    console.error('Stripe error:', e);
    return null;
  }
}

// ============================================
// OWNER COMMAND HANDLERS
// ============================================

async function handleAdd(body) {
  const parts = body.replace(/^ADD\s+/i, '').split(',').map(s => s.trim());
  if (parts.length < 1) return 'Format: ADD [address], [size], [date]\nEx: ADD 123 Main St, 20yd, tomorrow';

  const address = parts[0];
  const size = parts[1] ? parseSize(parts[1]) : '20yd';
  const deliveryDate = parseDate(parts[2] || 'tomorrow');
  const dumpster = config.dumpsters.find(d => d.id === size);

  const booking = await insertBooking({
    customer_name: 'Manual Entry',
    customer_phone: '',
    address,
    dumpster_size: size,
    rental_duration: '7-day',
    delivery_date: deliveryDate,
    status: 'confirmed',
    source: 'sms',
  });

  if (booking) {
    return `✅ ADDED #${booking.id}\n\n📍 ${address}\n📦 ${dumpster?.name || size}\n📅 ${formatDate(deliveryDate)}\n\nText DELIVERED #${booking.id} when done`;
  }
  return '❌ Failed to add. Try again.';
}

async function handleWeight(body) {
  const match = body.match(/WEIGHT\s+(\d+)\s*#?(\d+)?/i);
  if (!match) return 'Format: WEIGHT [lbs] #[id]\nEx: WEIGHT 5280 #42';

  const weightLbs = parseInt(match[1]);
  const bookingId = match[2];
  const weightTons = weightLbs / 2000;

  let booking;
  if (bookingId) {
    const bookings = await queryBookings(`id=eq.${bookingId}`);
    booking = bookings[0];
  } else {
    const bookings = await queryBookings(`status=eq.delivered&order=delivery_date.desc&limit=1`);
    booking = bookings[0];
  }

  if (!booking) return `⚖️ ${weightLbs.toLocaleString()} lbs = ${weightTons.toFixed(2)} tons\n\n⚠️ No booking found. Add #ID for overage calc.`;

  const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
  const includedLbs = dumpster?.weightLimit || 6000;
  const overageRate = dumpster?.overage || 70;

  await updateBooking(booking.id, { actual_weight_lbs: weightLbs });

  if (weightLbs <= includedLbs) {
    return `📊 #${booking.id} WEIGHT\n\n⚖️ ${weightLbs.toLocaleString()} lbs\n✅ Under limit - no overage!`;
  }

  const overageLbs = weightLbs - includedLbs;
  const overageTons = overageLbs / 2000;
  const overageAmount = overageTons * overageRate;

  const paymentLink = await createPaymentLink(
    `Weight Overage - ${overageTons.toFixed(2)} tons`,
    overageAmount,
    { booking_id: booking.id, type: 'overage' }
  );

  if (paymentLink) {
    await updateBooking(booking.id, { pending_overage_amount: overageAmount, pending_overage_link: paymentLink });
  }

  return `📊 #${booking.id} WEIGHT\n\n⚖️ ${weightLbs.toLocaleString()} lbs\n⚠️ Over by ${overageTons.toFixed(2)} tons\n💰 Charge: $${overageAmount.toFixed(2)}\n\n${paymentLink ? 'Reply SEND to invoice customer' : ''}`;
}

async function handleRoute() {
  const today = new Date().toISOString().split('T')[0];
  
  const deliveries = await queryBookings(`delivery_date=eq.${today}&status=eq.confirmed`);
  const allDelivered = await queryBookings(`status=eq.delivered`);
  
  const pickups = allDelivered.filter(b => {
    const d = new Date(b.delivery_date);
    d.setDate(d.getDate() + (b.rental_duration === '3-day' ? 3 : 7));
    return d.toISOString().split('T')[0] === today;
  });

  if (!deliveries.length && !pickups.length) return '📅 No stops today!';

  let msg = `🚛 TODAY (${deliveries.length + pickups.length} stops)\n\n`;
  let num = 1;

  for (const d of deliveries) {
    const size = config.dumpsters.find(x => x.id === d.dumpster_size)?.shortName || d.dumpster_size;
    msg += `${num++}. 📦 DELIVER ${size}\n   ${d.address}\n\n`;
  }
  for (const p of pickups) {
    const size = config.dumpsters.find(x => x.id === p.dumpster_size)?.shortName || p.dumpster_size;
    msg += `${num++}. 🚛 PICKUP ${size}\n   ${p.address}\n\n`;
  }

  const stops = [...deliveries, ...pickups];
  if (stops.length) {
    const addrs = stops.map(s => encodeURIComponent(s.address)).join('/');
    msg += `🗺️ google.com/maps/dir/${addrs}`;
  }

  return msg;
}

async function handleList() {
  const today = new Date().toISOString().split('T')[0];
  const todayJobs = await queryBookings(`delivery_date=eq.${today}`);
  const outNow = await queryBookings(`status=eq.delivered&limit=10`);

  if (!todayJobs.length && !outNow.length) return '📋 No jobs today.\n\nADD [address], [size], [date] to add one.';

  let msg = '📋 JOBS\n\n';
  
  if (todayJobs.length) {
    msg += `TODAY (${todayJobs.length}):\n`;
    for (const b of todayJobs) {
      const icon = b.status === 'delivered' ? '✅' : '⏳';
      const size = config.dumpsters.find(d => d.id === b.dumpster_size)?.shortName || b.dumpster_size;
      msg += `${icon} #${b.id} ${size} - ${b.address.substring(0, 20)}...\n`;
    }
  }

  if (outNow.length) {
    msg += `\nOUT NOW (${outNow.length}):\n`;
    for (const b of outNow.slice(0, 5)) {
      const size = config.dumpsters.find(d => d.id === b.dumpster_size)?.shortName || b.dumpster_size;
      msg += `#${b.id} ${size} - ${b.address.substring(0, 20)}...\n`;
    }
  }

  return msg;
}

async function handleDelivered(body) {
  const match = body.match(/DELIVERED\s*#?(\d+)/i);
  if (!match) return 'Format: DELIVERED #[id]';

  const id = match[1];
  await updateBooking(id, { status: 'delivered', delivered_at: new Date().toISOString() });

  const bookings = await queryBookings(`id=eq.${id}`);
  const booking = bookings[0];

  if (booking?.customer_phone) {
    const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
    await sendSMS(booking.customer_phone,
      `Your ${dumpster?.name || 'dumpster'} has been delivered! 🚛\n\n📍 ${booking.address}\n\nQuestions? Reply here!\n- ${config.businessName}`
    );
  }

  return `✅ #${id} DELIVERED${booking?.customer_phone ? '\n📱 Customer notified' : ''}`;
}

async function handlePickedUp(body) {
  const match = body.match(/PICKED?\s*UP?\s*#?(\d+)/i);
  if (!match) return 'Format: PICKEDUP #[id]';

  await updateBooking(match[1], { status: 'completed', completed_at: new Date().toISOString() });
  return `✅ #${match[1]} COMPLETED`;
}

async function handleSend() {
  const bookings = await queryBookings(`pending_overage_link=not.is.null&limit=1`);
  const booking = bookings[0];
  
  if (!booking?.pending_overage_link) return '❌ No pending overage. Use WEIGHT first.';
  if (!booking.customer_phone) return `❌ No phone for #${booking.id}. Link:\n${booking.pending_overage_link}`;

  await sendSMS(booking.customer_phone,
    `Hi! Your dumpster was over the weight limit.\n\nOverage: $${booking.pending_overage_amount?.toFixed(2)}\n\n💳 Pay: ${booking.pending_overage_link}\n\n- ${config.businessName}`
  );

  await updateBooking(booking.id, { pending_overage_link: null, overage_sent_at: new Date().toISOString() });
  return `✅ Invoice sent to ${booking.customer_name || 'customer'}`;
}

// ============================================
// MAIN HANDLER
// ============================================
export async function POST(request) {
  try {
    const formData = await request.formData();
    const body = formData.get('Body')?.trim() || '';
    const from = formData.get('From');
    const upper = body.toUpperCase();
    const numMedia = parseInt(formData.get('NumMedia') || '0');

    console.log(`📨 SMS from ${from}: "${body}"`);

    // OWNER COMMANDS
    if (isOwner(from)) {
      if (upper.startsWith('ADD ')) return twiml(await handleAdd(body));
      if (upper.startsWith('WEIGHT ')) return twiml(await handleWeight(body));
      if (upper === 'ROUTE') return twiml(await handleRoute());
      if (upper === 'LIST' || upper === 'JOBS') return twiml(await handleList());
      if (upper.startsWith('DELIVERED')) return twiml(await handleDelivered(body));
      if (upper.match(/^PICKED?\s*UP/)) return twiml(await handlePickedUp(body));
      if (upper === 'SEND') return twiml(await handleSend());
      if (upper === 'HELP' || upper === '?') {
        return twiml(`OWNER COMMANDS:\n\nADD [addr], [size], [date]\nWEIGHT [lbs] #[id]\nROUTE\nLIST\nDELIVERED #[id]\nPICKEDUP #[id]\nSEND`);
      }
    }

    // PHOTO HANDLING
    if (numMedia > 0) {
      const mediaUrl = formData.get('MediaUrl0');
      if (mediaUrl) {
        if (isOwner(from)) {
          const bookings = await queryBookings(`status=eq.delivered&order=delivered_at.desc&limit=1`);
          if (bookings[0]) {
            const photos = bookings[0].photos || [];
            await updateBooking(bookings[0].id, { photos: [...photos, mediaUrl] });
            return twiml(`📸 Photo saved to #${bookings[0].id}`);
          }
        }
        await sendSMS(process.env.OWNER_PHONE, `📸 Photo from ${from}:\n${mediaUrl}`);
        return twiml('Photo received!');
      }
    }

    // CUSTOMER: EXTEND
    if (upper === 'EXTEND' || upper.startsWith('EXTEND ')) {
      const rental = await getActiveRental(from);
      if (!rental) return twiml(`No active rental found. Call ${config.phone}`);

      const days = parseInt(body.match(/\d+/)?.[0] || '3');
      const dumpster = config.dumpsters.find(d => d.id === rental.dumpster_size);
      const total = (dumpster?.dailyExtension || 20) * days;

      const link = await createPaymentLink(`${days}-Day Extension`, total, { booking_id: rental.id, type: 'extension', days });
      
      if (link) return twiml(`${days} days = $${total}\n\nPay here:\n${link}`);
      
      await sendSMS(process.env.OWNER_PHONE, `📅 EXTEND REQUEST\n${rental.customer_name}\n${from}\n${rental.address}\n${days} days ($${total})`);
      return twiml(`Extension request received! We'll confirm shortly.`);
    }

    // CUSTOMER: PICKUP
    if (upper === 'PICKUP' || upper === 'PICK UP') {
      const rental = await getActiveRental(from);
      if (!rental) return twiml(`No active rental found. Call ${config.phone}`);

      await sendSMS(process.env.OWNER_PHONE, `🚛 PICKUP REQUEST\n${rental.customer_name}\n${from}\n${rental.address}`);
      await updateBooking(rental.id, { pickup_requested: true, pickup_requested_at: new Date().toISOString() });
      return twiml(`Pickup requested! 🚛 We'll get it soon.`);
    }

    // CUSTOMER: STATUS
    if (upper === 'STATUS') {
      const rental = await getActiveRental(from);
      if (!rental) return twiml(`No active rental. Need a dumpster? Reply with your address!`);

      const dumpster = config.dumpsters.find(d => d.id === rental.dumpster_size);
      const endDate = new Date(rental.delivery_date);
      endDate.setDate(endDate.getDate() + (rental.rental_duration === '3-day' ? 3 : 7));

      return twiml(`📦 YOUR RENTAL\n\n${rental.status.toUpperCase()}\n📍 ${rental.address}\n🚛 ${dumpster?.name}\n📅 Pickup: ${formatDate(endDate)}\n\nEXTEND for more time\nPICKUP when ready`);
    }

    // CUSTOMER: HELP
    if (upper === 'HELP' || upper === '?') {
      return twiml(`${config.businessName}:\n\nSTATUS - Check rental\nEXTEND - More days\nPICKUP - Request pickup\n\n📞 ${config.phone}`);
    }

    // ADDRESS DETECTION
    if (looksLikeAddress(body)) {
      await sendSMS(process.env.OWNER_PHONE, `🏠 NEW LEAD\n${from}\n"${body}"`);
      return twiml(`Got your address! Book online: ${config.websiteUrl}/pricing\n\nOr we'll call you back!`);
    }

    // FORWARD TO OWNER
    await sendSMS(process.env.OWNER_PHONE, `💬 ${from}:\n"${body}"`);
    return twiml(`Thanks! We'll get back to you.\n📞 ${config.phone}`);

  } catch (error) {
    console.error('SMS error:', error);
    return twiml(`Something went wrong. Call ${config.phone}`);
  }
}
