// ============================================
// TWILIO VOICE STATUS CALLBACK - MISSED CALL TEXT-BACK
// ============================================
// 
// This fires when a call ends. If it wasn't answered,
// we automatically text the caller.
//
// ============================================

import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { config } from '../../../../../config';

// Verify the inbound call status update is actually from Twilio.
async function verifyTwilioSignature(request, formData) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }
  const signature = request.headers.get('x-twilio-signature');
  if (!signature) return false;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const path = new URL(request.url).pathname;
  const fullUrl = `${baseUrl.replace(/\/$/, '')}${path}`;

  const params = {};
  for (const [k, v] of formData.entries()) {
    params[k] = v;
  }
  return twilio.validateRequest(authToken, signature, fullUrl, params);
}

// Send SMS via Twilio
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio SMS error: ${error}`);
  }

  return response.json();
}

// Log missed call to database (optional but useful)
async function logMissedCall(phone, status) {
  try {
    const supabaseUrl = config.supabase.url;
    const supabaseKey = config.supabase.anonKey;

    await fetch(`${supabaseUrl}/rest/v1/missed_calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        phone_number: phone,
        call_status: status,
        texted_back: true,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error('Failed to log missed call:', e);
    // Don't fail the whole flow if logging fails
  }
}

// ============================================
// CALL STATUS WEBHOOK
// ============================================
export async function POST(request) {
  try {
    const formData = await request.formData();

    if (!(await verifyTwilioSignature(request, formData))) {
      console.warn('Twilio voice/status webhook rejected: invalid signature');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const dialCallStatus = formData.get('DialCallStatus'); // Status of the forwarded call
    const callStatus = formData.get('CallStatus'); // Overall call status
    const from = formData.get('From'); // Caller's phone number
    const to = formData.get('To'); // Your Twilio number

    console.log(`📞 Call status update: ${dialCallStatus || callStatus} from ${from}`);

    // Only send text if call wasn't answered
    const missedStatuses = ['no-answer', 'busy', 'failed', 'canceled'];
    const wasMissed = missedStatuses.includes(dialCallStatus) || 
                      missedStatuses.includes(callStatus);

    if (wasMissed && from) {
      console.log(`📱 Sending missed call text to ${from}`);

      const message = `Hey! This is ${config.businessName}. Sorry we missed your call! 📞

Need a dumpster? Just reply with your address and I'll get you a quick quote.

Or book online anytime: ${config.websiteUrl || 'https://kingcitydisposal.com'}/pricing`;

      await sendSMS(from, message);
      await logMissedCall(from, dialCallStatus || callStatus);

      console.log(`✅ Missed call text sent to ${from}`);
    }

    // Return empty TwiML (call is already over)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Voice status webhook error:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
