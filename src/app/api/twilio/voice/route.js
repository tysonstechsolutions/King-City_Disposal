// ============================================
// TWILIO VOICE WEBHOOK - MISSED CALL TEXT-BACK
// ============================================
// 
// When someone calls and you don't answer:
// 1. Twilio hits this webhook
// 2. We send them an auto-text offering to help
// 3. They can reply and get into the chatbot flow via SMS
//
// SETUP IN TWILIO:
// 1. Go to Phone Numbers → Your Number → Voice & Fax
// 2. Set "A CALL COMES IN" to Webhook: https://yourdomain.com/api/twilio/voice
// 3. Set "CALL STATUS CHANGES" to Webhook: https://yourdomain.com/api/twilio/voice/status
//
// ============================================

import { NextResponse } from 'next/server';

// TwiML response helper
function twiml(content) {
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

// ============================================
// INCOMING CALL - Ring then voicemail
// ============================================
export async function POST(request) {
  const formData = await request.formData();
  const callStatus = formData.get('CallStatus');
  const from = formData.get('From');
  
  console.log(`📞 Incoming call from ${from}, status: ${callStatus}`);

  // Ring for 20 seconds, then go to voicemail
  // The status callback will handle the missed call text
  const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20" callerId="${process.env.TWILIO_PHONE_NUMBER}" action="/api/twilio/voice/status">
    <Number>${process.env.OWNER_PHONE}</Number>
  </Dial>
  <Say voice="alice">Sorry we missed you. We'll text you right back to help with your dumpster rental. Goodbye.</Say>
</Response>`;

  return twiml(response);
}
