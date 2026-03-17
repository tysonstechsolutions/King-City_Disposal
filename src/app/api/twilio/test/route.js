// ============================================
// TWILIO SMS TEST ENDPOINT
// ============================================
// GET /api/twilio/test - Send a test SMS to owner
// ============================================

import { NextResponse } from 'next/server';
import { sendSMS } from '../../../../lib/notifications';

export async function GET(request) {
  // Check for secret key to prevent abuse
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key !== 'test123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow specifying which phone to test: owner, billing, or operations
  const target = searchParams.get('to') || 'owner';

  const phoneMap = {
    owner: process.env.OWNER_PHONE,
    billing: process.env.BILLING_PHONE,
    operations: process.env.OPERATIONS_PHONE,
  };

  const targetPhone = phoneMap[target];

  if (!targetPhone) {
    return NextResponse.json({
      success: false,
      error: `${target.toUpperCase()}_PHONE not configured in environment variables`,
      env_check: {
        TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER: !!process.env.TWILIO_PHONE_NUMBER,
        OWNER_PHONE: !!process.env.OWNER_PHONE,
        BILLING_PHONE: !!process.env.BILLING_PHONE,
        OPERATIONS_PHONE: !!process.env.OPERATIONS_PHONE,
      }
    }, { status: 400 });
  }

  const testMessage = `✅ King City Disposal SMS Test (${target.toUpperCase()})\n\nIf you receive this, Twilio is working!\n\nTimestamp: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`;

  const result = await sendSMS(targetPhone, testMessage);

  // Mask phone for display (show last 4 digits)
  const maskPhone = (phone) => {
    if (!phone) return 'not set';
    const clean = phone.replace(/\D/g, '');
    return `***${clean.slice(-4)}`;
  };

  return NextResponse.json({
    success: result.success,
    message: result.success ? `Test SMS sent to ${target}!` : 'SMS failed',
    target,
    sent_to: maskPhone(targetPhone),
    details: result,
    env_check: {
      TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER: !!process.env.TWILIO_PHONE_NUMBER,
      OWNER_PHONE: maskPhone(process.env.OWNER_PHONE),
      BILLING_PHONE: maskPhone(process.env.BILLING_PHONE),
      OPERATIONS_PHONE: maskPhone(process.env.OPERATIONS_PHONE),
    }
  });
}
