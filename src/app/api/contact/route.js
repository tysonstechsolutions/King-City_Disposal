// ============================================
// CONTACT FORM SUBMISSION
// ============================================
// Receives messages from the public contact form, sends an SMS to the
// owner and (if configured) an email to the billing inbox.

import { NextResponse } from 'next/server';
import { config } from '../../../config';
import { sendSMS, sendEmail } from '../../../lib/notifications';
import { logger } from '../../../lib/logger';

export const dynamic = 'force-dynamic';

// Per-IP rate limit. In-memory only (per serverless instance), so this is
// a soft cap — but it's enough to slow bots without standing up Redis.
const ipHits = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 5;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]
    || request.headers.get('x-real-ip')
    || 'unknown';

  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    return NextResponse.json({ error: 'Too many requests, please try again shortly.' }, { status: 429 });
  }
  hits.push(now);
  ipHits.set(ip, hits);

  try {
    const body = await request.json();
    const name = String(body.name || '').trim().slice(0, 200);
    const phone = String(body.phone || '').trim().slice(0, 30);
    const email = String(body.email || '').trim().slice(0, 200);
    const message = String(body.message || '').trim().slice(0, 2000);

    if (!name || !message) {
      return NextResponse.json({ error: 'Name and message are required.' }, { status: 400 });
    }

    // Trivial honeypot: if the request includes a field named "website", drop it.
    if (body.website) {
      logger.warn('Contact form honeypot triggered', { ip });
      return NextResponse.json({ success: true }); // pretend success to bots
    }

    // SMS to owner — short, no formatting tricks.
    const ownerSms = `📩 New contact form\n\n${name}\n${phone || 'no phone'}\n${email || 'no email'}\n\n${message.slice(0, 700)}`;
    try {
      await sendSMS(config.phoneRaw || process.env.OWNER_PHONE, ownerSms);
    } catch (e) {
      logger.error('Contact SMS failed', e);
    }

    // Email to billing inbox if configured.
    if (process.env.RESEND_API_KEY && config.billingEmail) {
      try {
        await sendEmail({
          to: config.billingEmail,
          subject: `Contact form: ${name}`,
          html: `<div style="font-family:Arial,sans-serif">
            <h2>New contact form submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone) || '<em>none</em>'}</p>
            <p><strong>Email:</strong> ${escapeHtml(email) || '<em>none</em>'}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space:pre-wrap;border-left:3px solid #ccc;padding-left:12px">${escapeHtml(message)}</p>
          </div>`,
          text: `New contact form\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\n\n${message}`,
        });
      } catch (e) {
        logger.error('Contact email failed', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Contact form error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
