// ============================================
// NOTIFICATIONS LIBRARY
// ============================================
// Unified SMS and Email notification system
// Uses Twilio for SMS and Resend for Email
// ============================================

import { Resend } from 'resend';
import { config } from '../config';

// Initialize Resend (email)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ============================================
// SMS via Twilio
// ============================================
export async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn('Twilio not configured - skipping SMS');
    return { success: false, error: 'Twilio not configured' };
  }

  if (!to) {
    return { success: false, error: 'No phone number provided' };
  }

  // Format phone number
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

    if (response.ok) {
      const data = await response.json();
      return { success: true, sid: data.sid };
    } else {
      const error = await response.json();
      console.error('Twilio error:', error);
      return { success: false, error: error.message || 'SMS failed' };
    }
  } catch (e) {
    console.error('SMS error:', e);
    return { success: false, error: e.message };
  }
}

// ============================================
// Email via Resend
// ============================================
export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!resend) {
    console.warn('Resend not configured - skipping email');
    return { success: false, error: 'Resend not configured' };
  }

  if (!to) {
    return { success: false, error: 'No email address provided' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || `${config.businessName} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo || config.email,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (e) {
    console.error('Email error:', e);
    return { success: false, error: e.message };
  }
}

// ============================================
// Notify Customer (SMS + Email)
// ============================================
export async function notifyCustomer({ phone, email, subject, smsMessage, emailHtml, emailText }) {
  const results = { sms: null, email: null };

  // Send SMS if phone provided
  if (phone && smsMessage) {
    results.sms = await sendSMS(phone, smsMessage);
  }

  // Send email if email provided
  if (email && (emailHtml || emailText)) {
    results.email = await sendEmail({
      to: email,
      subject: subject || `${config.businessName} - Update`,
      html: emailHtml,
      text: emailText,
    });
  }

  return results;
}

// ============================================
// Notify Owner
// ============================================
export async function notifyOwner(message, emailSubject = null, emailHtml = null) {
  const results = { sms: null, email: null };

  // SMS to owner
  const ownerPhone = process.env.OWNER_PHONE;
  if (ownerPhone && message) {
    results.sms = await sendSMS(ownerPhone, message);
  }

  // Email to owner (optional)
  const ownerEmail = process.env.OWNER_EMAIL;
  if (ownerEmail && emailSubject) {
    results.email = await sendEmail({
      to: ownerEmail,
      subject: emailSubject,
      html: emailHtml || `<pre>${message}</pre>`,
      text: message,
    });
  }

  return results;
}

// ============================================
// Email Templates
// ============================================

// Booking Confirmation Email
export function bookingConfirmationEmail(booking) {
  const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
  const dumpsterName = dumpster?.name || booking.dumpster_size;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3d8b64; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .details-row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .btn { display: inline-block; background: #3d8b64; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Booking Confirmed!</h1>
    <p style="margin: 5px 0 0;">Your dumpster rental is all set</p>
  </div>

  <div class="content">
    <p>Hi ${booking.customer_name?.split(' ')[0] || 'there'},</p>
    <p>Thank you for booking with ${config.businessName}! Here are your rental details:</p>

    <div class="details">
      <div class="details-row">
        <span class="label">Dumpster Size:</span>
        <span class="value">${dumpsterName}</span>
      </div>
      <div class="details-row">
        <span class="label">Delivery Date:</span>
        <span class="value">${booking.delivery_date}</span>
      </div>
      <div class="details-row">
        <span class="label">Rental Period:</span>
        <span class="value">${booking.rental_duration}</span>
      </div>
      <div class="details-row">
        <span class="label">Delivery Address:</span>
        <span class="value">${booking.address}</span>
      </div>
      ${booking.placement_notes ? `
      <div class="details-row">
        <span class="label">Placement Notes:</span>
        <span class="value">${booking.placement_notes}</span>
      </div>
      ` : ''}
      ${booking.price_cents ? `
      <div class="details-row">
        <span class="label">Total:</span>
        <span class="value">$${(booking.price_cents / 100).toFixed(2)}</span>
      </div>
      ` : ''}
    </div>

    <p><strong>What's Next?</strong></p>
    <ul>
      <li>We'll deliver between 8am-12pm on your delivery date</li>
      <li>Please ensure the placement area is clear and accessible</li>
      <li>We'll send a reminder the day before delivery</li>
    </ul>

    <p>Questions? Call us at <a href="tel:${config.phoneRaw}">${config.phone}</a> or reply to this email.</p>
  </div>

  <div class="footer">
    <p>${config.businessName}<br>
    ${config.phone}<br>
    ${config.address?.city || 'Southern Illinois'}</p>
  </div>
</body>
</html>
`;

  const text = `
Booking Confirmed!

Hi ${booking.customer_name?.split(' ')[0] || 'there'},

Thank you for booking with ${config.businessName}!

Dumpster: ${dumpsterName}
Delivery: ${booking.delivery_date}
Duration: ${booking.rental_duration}
Address: ${booking.address}
${booking.placement_notes ? `Placement: ${booking.placement_notes}` : ''}
${booking.price_cents ? `Total: $${(booking.price_cents / 100).toFixed(2)}` : ''}

We'll deliver between 8am-12pm on your delivery date.
Please ensure the area is clear and accessible.

Questions? Call ${config.phone}

${config.businessName}
`;

  return { html, text };
}

// Invoice Email
export function invoiceEmail(invoice) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';
  const invoiceUrl = `${siteUrl}/invoice/${invoice.invoice_number}`;
  const amount = `$${((invoice.total_cents || 0) / 100).toFixed(2)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3d8b64; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .amount { font-size: 32px; font-weight: bold; color: #3d8b64; text-align: center; margin: 20px 0; }
    .btn { display: inline-block; background: #3d8b64; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Invoice ${invoice.invoice_number}</h1>
  </div>

  <div class="content">
    <p>Hi ${invoice.customer_name?.split(' ')[0] || 'there'},</p>
    <p>Here's your invoice from ${config.businessName}:</p>

    <div class="amount">${amount}</div>

    ${invoice.due_date ? `<p style="text-align: center;">Due: ${new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>` : ''}

    <p style="text-align: center;">
      <a href="${invoiceUrl}" class="btn">View & Pay Invoice</a>
    </p>

    <p>Questions? Call us at <a href="tel:${config.phoneRaw}">${config.phone}</a></p>
  </div>

  <div class="footer">
    <p>${config.businessName}</p>
  </div>
</body>
</html>
`;

  const text = `
Invoice ${invoice.invoice_number}

Hi ${invoice.customer_name?.split(' ')[0] || 'there'},

Amount Due: ${amount}
${invoice.due_date ? `Due Date: ${new Date(invoice.due_date).toLocaleDateString()}` : ''}

View & Pay: ${invoiceUrl}

Questions? Call ${config.phone}

${config.businessName}
`;

  return { html, text };
}

// Payment Receipt Email
export function receiptEmail(transaction) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kingcitydisposal.com';
  const receiptUrl = `${siteUrl}/receipt/${transaction.receipt_number}`;
  const amount = `$${((transaction.amount_cents || 0) / 100).toFixed(2)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #22c55e; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .amount { font-size: 32px; font-weight: bold; color: #22c55e; text-align: center; margin: 20px 0; }
    .btn { display: inline-block; background: #333; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Payment Received</h1>
    <p style="margin: 5px 0 0;">Thank you for your payment!</p>
  </div>

  <div class="content">
    <p>Hi ${transaction.customer_name?.split(' ')[0] || 'there'},</p>
    <p>We've received your payment of:</p>

    <div class="amount">${amount}</div>

    <p style="text-align: center; color: #666;">
      Receipt #${transaction.receipt_number}<br>
      ${new Date(transaction.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    </p>

    <p style="text-align: center;">
      <a href="${receiptUrl}" class="btn">View Receipt</a>
    </p>

    <p>Thank you for choosing ${config.businessName}!</p>
  </div>

  <div class="footer">
    <p>${config.businessName}<br>${config.phone}</p>
  </div>
</body>
</html>
`;

  const text = `
Payment Received!

Hi ${transaction.customer_name?.split(' ')[0] || 'there'},

Amount: ${amount}
Receipt #: ${transaction.receipt_number}
Date: ${new Date(transaction.created_at || Date.now()).toLocaleDateString()}

View Receipt: ${receiptUrl}

Thank you for choosing ${config.businessName}!
${config.phone}
`;

  return { html, text };
}

// Delivery Reminder Email
export function deliveryReminderEmail(booking) {
  const dumpster = config.dumpsters.find(d => d.id === booking.dumpster_size);
  const dumpsterName = dumpster?.name || booking.dumpster_size;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3d8b64; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .highlight { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Delivery Tomorrow!</h1>
  </div>

  <div class="content">
    <p>Hi ${booking.customer_name?.split(' ')[0] || 'there'},</p>

    <p>Just a reminder - your <strong>${dumpsterName}</strong> is scheduled for delivery <strong>TOMORROW</strong> between 8am-12pm.</p>

    <div class="highlight">
      <strong>Delivery Address:</strong><br>
      ${booking.address}
      ${booking.placement_notes ? `<br><br><strong>Placement:</strong> ${booking.placement_notes}` : ''}
    </div>

    <p><strong>Please make sure:</strong></p>
    <ul>
      <li>The placement area is clear of vehicles and obstacles</li>
      <li>There's enough clearance for our truck (12ft height, 20ft length)</li>
      <li>Any gates that need to be opened are accessible</li>
    </ul>

    <p>Questions? Call us at <a href="tel:${config.phoneRaw}">${config.phone}</a></p>
  </div>

  <div class="footer">
    <p>${config.businessName}</p>
  </div>
</body>
</html>
`;

  const text = `
Delivery Tomorrow!

Hi ${booking.customer_name?.split(' ')[0] || 'there'},

Your ${dumpsterName} is scheduled for delivery TOMORROW between 8am-12pm.

Address: ${booking.address}
${booking.placement_notes ? `Placement: ${booking.placement_notes}` : ''}

Please make sure the area is clear and accessible.

Questions? Call ${config.phone}

${config.businessName}
`;

  return { html, text };
}
