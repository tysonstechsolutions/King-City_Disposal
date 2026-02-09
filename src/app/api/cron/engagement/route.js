// ============================================
// CUSTOMER ENGAGEMENT CRON JOB
// ============================================
//
// Runs daily to handle customer engagement:
// - Review requests (after pickup completion)
// - Service reminders (for repeat business)
//
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

  if (!accountSid || !authToken || !from || !to) return false;

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
// 1. REVIEW REQUESTS (After Pickup)
// ============================================
async function runReviewRequests() {
  console.log('⭐ Running review requests...');

  // Get bookings picked up in the last 2 days that haven't had review request sent
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const response = await fetch(
    `${supabaseUrl}/rest/v1/bookings?status=eq.picked_up&review_request_sent=is.null&updated_at=gte.${twoDaysAgo.toISOString()}`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  if (!response.ok) return { review_requests: 0 };

  const bookings = await response.json();
  let sent = 0;

  // Build Google review URL
  const reviewUrl = config.googlePlaceId
    ? `https://search.google.com/local/writereview?placeid=${config.googlePlaceId}`
    : `https://www.google.com/search?q=${encodeURIComponent(config.businessName + ' ' + (config.address?.city || ''))}`;

  for (const booking of bookings) {
    if (!booking.customer_phone) continue;

    // Only send if pickup was 12-48 hours ago (give time to settle)
    const updatedAt = new Date(booking.updated_at);
    const hoursAgo = (new Date() - updatedAt) / (1000 * 60 * 60);
    if (hoursAgo < 12 || hoursAgo > 48) continue;

    const firstName = booking.customer_name?.split(' ')[0] || 'there';

    const message = `Hi ${firstName}! Thank you for choosing ${config.businessName}!

We hope everything went smoothly with your dumpster rental. If you have a moment, we'd really appreciate a quick review:

${reviewUrl}

Your feedback helps other customers find us!

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
      console.log(`⭐ Review request sent to ${booking.customer_name}`);
    }
  }

  return { review_requests_sent: sent, eligible: bookings.length };
}

// ============================================
// 2. SERVICE REMINDERS (Repeat Business)
// ============================================
async function runServiceReminders() {
  console.log('📧 Running service reminders...');

  // Find customers whose last booking was 3-6 months ago
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // Get customers with completed bookings who haven't received a reminder
  const response = await fetch(
    `${supabaseUrl}/rest/v1/customers?service_reminder_sent=is.null&last_booking_date=lte.${threeMonthsAgo.toISOString().split('T')[0]}&last_booking_date=gte.${sixMonthsAgo.toISOString().split('T')[0]}`,
    {
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    }
  );

  if (!response.ok) return { service_reminders: 0 };

  const customers = await response.json();
  let sent = 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';

  for (const customer of customers) {
    if (!customer.phone) continue;

    const firstName = customer.name?.split(' ')[0] || 'there';

    const message = `Hi ${firstName}! It's been a while since we last helped you out. Need another dumpster?

We're still here for all your disposal needs - same great prices, easy online booking, fast reliable service.

Book your next rental: ${siteUrl}

Or just reply to this text!

- ${config.businessName}
${config.phone}`;

    const success = await sendSMS(customer.phone, message);
    if (success) {
      await fetch(
        `${supabaseUrl}/rest/v1/customers?id=eq.${customer.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': getSupabaseKey(),
            'Authorization': `Bearer ${getSupabaseKey()}`,
          },
          body: JSON.stringify({
            service_reminder_sent: new Date().toISOString(),
          }),
        }
      );
      sent++;
      console.log(`📧 Service reminder sent to ${customer.name}`);
    }
  }

  return { service_reminders_sent: sent, eligible: customers.length };
}

// ============================================
// MAIN CRON HANDLER
// ============================================
export async function GET(request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🚀 Starting engagement cron job...');
  const startTime = Date.now();

  const results = {
    timestamp: new Date().toISOString(),
    review_requests: null,
    service_reminders: null,
    errors: [],
  };

  // Run review requests
  try {
    results.review_requests = await runReviewRequests();
  } catch (e) {
    console.error('Review requests error:', e);
    results.errors.push({ task: 'review_requests', error: e.message });
  }

  // Run service reminders
  try {
    results.service_reminders = await runServiceReminders();
  } catch (e) {
    console.error('Service reminders error:', e);
    results.errors.push({ task: 'service_reminders', error: e.message });
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Engagement cron complete in ${duration}ms`);

  return NextResponse.json({
    success: true,
    duration_ms: duration,
    ...results,
  });
}
