// ============================================
// PAVING QUOTE API ENDPOINT
// ============================================
//
// POST /api/paving-quote
//
// Handles quote requests from the paving calculator:
// 1. Receives form data
// 2. Sends SMS to owner with quote details
// 3. Optionally saves to database
// 4. Returns success/error response
//
// ENVIRONMENT VARIABLES REQUIRED:
// - TWILIO_ACCOUNT_SID
// - TWILIO_AUTH_TOKEN
// - TWILIO_PHONE_NUMBER (format: +16185551234)
// - OWNER_PHONE (format: +16185551234)
//
// OPTIONAL (for database storage):
// - SUPABASE_URL
// - SUPABASE_ANON_KEY
//
// ============================================

import { NextResponse } from 'next/server';

// Import your config - adjust path as needed for your project
// import { pavingConfig } from '../../config/paving-config';

// ============================================
// SMS HELPER FUNCTION
// ============================================
async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log('Twilio not configured - SMS not sent');
    return null;
  }

  try {
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
  } catch (error) {
    console.error('SMS send error:', error);
    return null;
  }
}

// ============================================
// OPTIONAL: DATABASE HELPER (Supabase)
// ============================================
async function saveQuoteToDatabase(quoteData) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase not configured - quote not saved to database');
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/paving_quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(quoteData),
    });

    if (response.ok) {
      const result = await response.json();
      return result[0];
    }
    return null;
  } catch (error) {
    console.error('Database save error:', error);
    return null;
  }
}

// ============================================
// SERVICE LABELS
// ============================================
const serviceLabels = {
  sealcoating: 'Sealcoating',
  paving: 'Asphalt Paving',
  linestriping: 'Line Striping',
};

const projectLabels = {
  residential_driveway: 'Residential Driveway',
  commercial_parking: 'Commercial Parking Lot',
  church_parking: 'Church Parking Lot',
  apartment_complex: 'Apartment Complex',
  industrial: 'Industrial/Warehouse',
  other: 'Other',
};

const conditionLabels = {
  good: 'Good',
  fair: 'Fair (Some cracks)',
  poor: 'Poor (Significant damage)',
  unknown: 'Unknown',
};

// ============================================
// MAIN API HANDLER
// ============================================
export async function POST(request) {
  try {
    const data = await request.json();

    const {
      serviceType,
      projectType,
      squareFootage,
      numStalls,
      numHandicapSymbols,
      linearFeet,
      address,
      condition,
      notes,
      customerName,
      customerPhone,
      customerEmail,
      preferredContact,
      estimateLow,
      estimateHigh,
    } = data;

    // Validate required fields
    if (!serviceType || !address || !customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ============================================
    // BUILD SMS MESSAGE FOR OWNER
    // ============================================
    const serviceName = serviceLabels[serviceType] || serviceType;
    const projectName = projectLabels[projectType] || projectType;
    const conditionName = conditionLabels[condition] || condition;

    let smsMessage = `🛣️ NEW PAVING QUOTE\n\n`;
    smsMessage += `📋 ${serviceName}\n`;
    smsMessage += `🏢 ${projectName}\n`;

    if (serviceType === 'linestriping') {
      if (numStalls) smsMessage += `🅿️ ${numStalls} stalls\n`;
      if (numHandicapSymbols) smsMessage += `♿ ${numHandicapSymbols} handicap symbols\n`;
      if (linearFeet) smsMessage += `📏 ${linearFeet} linear ft\n`;
    } else {
      smsMessage += `📐 ${squareFootage?.toLocaleString() || 0} sq ft\n`;
    }

    smsMessage += `\n📍 ${address}\n`;
    smsMessage += `🔧 Condition: ${conditionName}\n`;

    if (estimateLow && estimateHigh) {
      smsMessage += `\n💰 Est: $${estimateLow.toLocaleString()}-$${estimateHigh.toLocaleString()}\n`;
    }

    smsMessage += `\n👤 ${customerName}\n`;
    smsMessage += `📞 ${customerPhone}\n`;
    if (customerEmail) smsMessage += `📧 ${customerEmail}\n`;
    smsMessage += `✅ Prefers: ${preferredContact}\n`;

    if (notes) {
      smsMessage += `\n📝 Notes: ${notes}\n`;
    }

    // ============================================
    // SEND SMS TO OWNER
    // ============================================
    const ownerPhone = process.env.OWNER_PHONE;
    if (ownerPhone) {
      await sendSMS(ownerPhone, smsMessage);
      console.log('Quote SMS sent to owner');
    } else {
      console.log('OWNER_PHONE not set - SMS not sent');
    }

    // ============================================
    // OPTIONAL: SAVE TO DATABASE
    // ============================================
    const quoteRecord = {
      service_type: serviceType,
      project_type: projectType,
      square_footage: squareFootage,
      num_stalls: numStalls,
      num_handicap_symbols: numHandicapSymbols,
      linear_feet: linearFeet,
      address: address,
      condition: condition,
      notes: notes,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      preferred_contact: preferredContact,
      estimate_low: estimateLow,
      estimate_high: estimateHigh,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const savedQuote = await saveQuoteToDatabase(quoteRecord);

    // ============================================
    // OPTIONAL: SEND CONFIRMATION TO CUSTOMER
    // ============================================
    // Uncomment to send confirmation SMS to customer
    /*
    if (customerPhone) {
      const confirmationMsg = `Thanks for your ${serviceName} quote request! We received your info for ${address} and will contact you within 24 hours with a detailed estimate.\n\n- Your Paving Company`;
      await sendSMS(customerPhone, confirmationMsg);
    }
    */

    return NextResponse.json({
      success: true,
      message: 'Quote request submitted successfully',
      quoteId: savedQuote?.id || null,
    });

  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process quote request' },
      { status: 500 }
    );
  }
}
