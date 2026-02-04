// Test SMS endpoint - DELETE AFTER TESTING
import { NextResponse } from 'next/server';

async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return { error: 'Missing Twilio credentials', accountSid: !!accountSid, authToken: !!authToken, from: !!from };
  }

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to');
  const message = searchParams.get('message') || 'Test message from King City Disposal invoice system!';

  if (!to) {
    return NextResponse.json({ error: 'Missing ?to= parameter' }, { status: 400 });
  }

  try {
    const result = await sendSMS(to, message);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
