import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS } from '../../../lib/notifications'
import { config } from '../../../config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      invoice_number,
      customer_name,
      customer_email,
      customer_phone,
      request_type,
      message
    } = body

    // Validate required fields
    if (!invoice_number || !customer_name || !request_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Map request type to readable text
    const requestTypeMap = {
      extension: 'Rental Extension',
      swap: 'Dumpster Swap',
      pickup: 'Early Pickup',
      other: 'Other Request'
    }
    const readableType = requestTypeMap[request_type] || request_type

    // Store request in database (optional - create table if needed)
    try {
      await supabase.from('customer_requests').insert({
        invoice_number,
        customer_name,
        customer_email,
        customer_phone,
        request_type,
        message,
        status: 'pending',
        created_at: new Date().toISOString()
      })
    } catch (dbError) {
      // If table doesn't exist, that's okay - we'll still send notifications
      console.log('Could not store request in database (table may not exist):', dbError.message)
    }

    // Send SMS notification to business
    const smsMessage = `📋 NEW CUSTOMER REQUEST

Type: ${readableType}
Customer: ${customer_name}
Invoice: ${invoice_number}
Phone: ${customer_phone || 'Not provided'}
${message ? `\nDetails: ${message}` : ''}

Respond ASAP to keep customer happy!`

    try {
      await sendSMS(config.phoneRaw, smsMessage)
    } catch (smsError) {
      console.error('Error sending SMS notification:', smsError)
      // Don't fail the request if SMS fails
    }

    // Send confirmation SMS to customer (if phone provided)
    if (customer_phone) {
      const customerSMS = `Thank you for your ${readableType.toLowerCase()} request! We'll contact you soon to confirm.

${config.businessName}
${config.billingPhone}`

      try {
        // Remove any formatting from phone number
        const cleanPhone = customer_phone.replace(/\D/g, '')
        await sendSMS(cleanPhone, customerSMS)
      } catch (smsError) {
        console.error('Error sending customer confirmation:', smsError)
        // Don't fail the request if customer SMS fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Request submitted successfully'
    })

  } catch (error) {
    console.error('Error processing customer request:', error)
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    )
  }
}
