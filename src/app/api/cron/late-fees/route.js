// ============================================
// LATE FEE AUTOMATION - CRON JOB
// ============================================
// 
// Runs daily, texts customers whose rentals are overdue
// Calculates daily late fees and sends payment links
//
// SETUP:
// Add to vercel.json:
// { "path": "/api/cron/late-fees", "schedule": "0 15 * * *" }
// (15 UTC = 9am CST)
//
// ============================================

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { sendSMS } from '../../../../lib/notifications';

const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

async function queryBookings(filter) {
  const response = await fetch(
    `${config.supabase.url}/rest/v1/bookings?${filter}`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );
  return response.ok ? response.json() : [];
}

async function updateBooking(id, updates) {
  await fetch(`${config.supabase.url}/rest/v1/bookings?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': getSupabaseKey(),
      'Authorization': `Bearer ${getSupabaseKey()}`,
    },
    body: JSON.stringify(updates),
  });
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
    return null;
  }
}

function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  return `+${cleaned}`;
}

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    checked: 0,
    overdue: 0,
    notified: 0,
    errors: [],
  };

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Get all delivered bookings
    const delivered = await queryBookings(`status=eq.delivered`);
    results.checked = delivered.length;

    for (const booking of delivered) {
      try {
        // Calculate when rental was supposed to end
        const deliveryDate = new Date(booking.delivery_date);

        // Parse rental duration
        const durationMatch = booking.rental_duration?.match(/(\d+)-day/);
        const totalDays = durationMatch ? parseInt(durationMatch[1]) : 10;
        
        const endDate = new Date(deliveryDate);
        endDate.setDate(endDate.getDate() + totalDays);
        endDate.setHours(0, 0, 0, 0);

        // Check if overdue
        if (today <= endDate) continue;

        results.overdue++;

        // Calculate days overdue and fees.
        // Cap the late fee at 14 days' worth — past that the dumpster is being
        // ignored and we should switch to phone calls / recovery, not keep
        // letting the bill balloon. Avoids handing customers a $5,000 SMS
        // surprise and the disputes/chargebacks that come with it.
        const LATE_FEE_DAY_CAP = 14;
        const rawDaysOverdue = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
        const daysOverdue = rawDaysOverdue;
        const cappedDays = Math.min(rawDaysOverdue, LATE_FEE_DAY_CAP);
        const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
        const dailyRate = dumpster?.dailyExtension || 25;
        const totalLateFee = cappedDays * dailyRate;

        // Check if we already notified today
        const lastNotified = booking.late_fee_notified_at 
          ? new Date(booking.late_fee_notified_at).toISOString().split('T')[0]
          : null;
        
        if (lastNotified === todayStr) continue;

        // Skip if no phone number
        if (!booking.customer_phone) {
          results.errors.push(`#${booking.id}: No phone number`);
          continue;
        }

        // Create payment link for late fees
        const paymentLink = await createPaymentLink(
          `Late Fee - ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
          totalLateFee,
          { booking_id: booking.id, type: 'late_fee', days_overdue: daysOverdue }
        );

        // Build message based on severity
        let message;
        
        if (daysOverdue === 1) {
          // First day overdue - friendly reminder
          message = `Hi ${booking.customer_name?.split(' ')[0] || 'there'}! Your dumpster rental ended yesterday.\n\n`;
          message += `📍 ${booking.address}\n\n`;
          message += `Late fee: $${dailyRate}/day\n`;
          message += `Current charge: $${totalLateFee}\n\n`;
          message += `Reply PICKUP when you're ready and we'll come get it!\n\n`;
          if (paymentLink) {
            message += `Pay late fees: ${paymentLink}\n\n`;
          }
          message += `- ${config.businessName}`;
        } else if (daysOverdue <= 3) {
          // 2-3 days - firmer reminder
          message = `Hi ${booking.customer_name?.split(' ')[0] || 'there'}, your dumpster is ${daysOverdue} days overdue.\n\n`;
          message += `📍 ${booking.address}\n`;
          message += `💰 Late fees: $${totalLateFee}\n\n`;
          message += `Please reply PICKUP to schedule removal.\n\n`;
          if (paymentLink) {
            message += `Pay now: ${paymentLink}\n\n`;
          }
          message += `Questions? Call ${config.phone}`;
        } else {
          // 4+ days - urgent
          message = `URGENT: Your dumpster is ${daysOverdue} days overdue.\n\n`;
          message += `📍 ${booking.address}\n`;
          message += `💰 Late fees: $${totalLateFee} (and growing)\n\n`;
          message += `Please call us ASAP: ${config.phone}\n\n`;
          message += `Reply PICKUP to schedule immediate removal.`;
        }

        // Send SMS
        const phone = formatPhone(booking.customer_phone);
        const sent = await sendSMS(phone, message);

        if (sent) {
          await updateBooking(booking.id, {
            late_fee_notified_at: new Date().toISOString(),
            days_overdue: daysOverdue,
            pending_late_fee: totalLateFee,
          });
          results.notified++;
          console.log(`📨 Late fee notice sent to ${booking.customer_name} (${daysOverdue} days, $${totalLateFee})`);
        }

        // Also notify owner if 3+ days overdue
        if (daysOverdue >= 3 && process.env.OWNER_PHONE) {
          await sendSMS(process.env.OWNER_PHONE,
            `⚠️ OVERDUE ${daysOverdue} DAYS\n\n${booking.customer_name}\n📞 ${booking.customer_phone}\n📍 ${booking.address}\n💰 $${totalLateFee} owed`
          );
        }

      } catch (e) {
        results.errors.push(`#${booking.id}: ${e.message}`);
      }
    }

    console.log('📊 Late fee cron complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Late fee cron error:', error);
    return NextResponse.json({ error: error.message, ...results }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
