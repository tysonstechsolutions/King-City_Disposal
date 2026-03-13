import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, sendEmail } from '../../../lib/notifications'
import { config } from '../../../config'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      invoice_number,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
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

    // Map request type to readable text and booking service type
    const requestTypeMap = {
      extension: { label: 'Rental Extension', serviceType: 'Extension' },
      swap: { label: 'Dumpster Swap', serviceType: 'Swap Out' },
      pickup: { label: 'Early Pickup', serviceType: 'Pickup' },
      other: { label: 'Other Request', serviceType: 'Service' }
    }
    const { label: readableType, serviceType } = requestTypeMap[request_type] || { label: request_type, serviceType: 'Service' }

    // Store request in database
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
      console.log('Could not store request in database:', dbError.message)
    }

    // ============================================
    // CREATE BOOKING FOR SWAP/EXTENSION REQUESTS
    // ============================================
    let bookingId = null
    if (request_type === 'swap' || request_type === 'extension' || request_type === 'pickup') {
      try {
        // Look up original booking by invoice number to get address
        let serviceAddress = customer_address || ''
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('service_address, customer_address, booking_id')
          .eq('invoice_number', invoice_number)
          .single()

        if (invoiceData) {
          serviceAddress = invoiceData.service_address || invoiceData.customer_address || serviceAddress
        }

        // Create a new booking for the service request
        const bookingData = {
          customer_name,
          customer_email: customer_email || null,
          customer_phone: customer_phone || null,
          address: serviceAddress,
          service_type: serviceType, // "Swap Out", "Extension", or "Pickup"
          dumpster_size: '30yd', // Default, can be updated
          status: 'pending',
          notes: `${readableType} request from invoice ${invoice_number}.\n\nCustomer message: ${message || 'No additional details provided.'}`,
          delivery_date: new Date().toISOString().split('T')[0], // Today as placeholder
          created_at: new Date().toISOString(),
        }

        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single()

        if (newBooking) {
          bookingId = newBooking.id
          console.log(`Created ${serviceType} booking #${bookingId} for ${customer_name}`)
        } else if (bookingError) {
          console.error('Error creating booking:', bookingError)
        }
      } catch (bookingErr) {
        console.error('Error creating service booking:', bookingErr)
      }
    }

    // ============================================
    // SEND SMS NOTIFICATION TO BUSINESS
    // ============================================
    const smsMessage = `📋 NEW ${serviceType.toUpperCase()} REQUEST

Customer: ${customer_name}
Invoice: ${invoice_number}
Phone: ${customer_phone || 'Not provided'}
${message ? `\nDetails: ${message}` : ''}
${bookingId ? `\n✅ Booking #${bookingId} created` : ''}

Check admin panel for details!`

    try {
      await sendSMS(config.phoneRaw, smsMessage)
    } catch (smsError) {
      console.error('Error sending SMS notification:', smsError)
    }

    // ============================================
    // SEND EMAIL NOTIFICATION TO BUSINESS
    // ============================================
    if (resend && config.billingEmail) {
      try {
        await resend.emails.send({
          from: `${config.businessName} <${process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev'}>`,
          to: config.billingEmail,
          subject: `🔔 ${readableType} Request - ${customer_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">📋 ${readableType} Request</h1>
              </div>
              <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; width: 120px;">Customer:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">${customer_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Invoice #:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">${invoice_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Phone:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">${customer_phone || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Email:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">${customer_email || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Request Type:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;">
                      <span style="background: #007bff; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
                        ${readableType}
                      </span>
                    </td>
                  </tr>
                  ${message ? `
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Details:</td>
                    <td style="padding: 10px 0;">${message}</td>
                  </tr>
                  ` : ''}
                </table>

                ${bookingId ? `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin-top: 20px;">
                  <strong style="color: #155724;">✅ Booking #${bookingId} Created</strong>
                  <p style="margin: 5px 0 0 0; color: #155724;">
                    A new "${serviceType}" booking has been automatically created. Check the admin panel to schedule it.
                  </p>
                </div>
                ` : ''}
              </div>
              <div style="background: #1a1a2e; color: #aaa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
                ${config.businessName} - Admin Notification
              </div>
            </div>
          `
        })
        console.log('Email notification sent to', config.billingEmail)
      } catch (emailError) {
        console.error('Error sending email notification:', emailError)
      }
    }

    // ============================================
    // SEND CONFIRMATION SMS TO CUSTOMER
    // ============================================
    if (customer_phone) {
      const customerSMS = `Thank you for your ${readableType.toLowerCase()} request! We'll contact you soon to confirm.

${config.businessName}
${config.billingPhone}`

      try {
        const cleanPhone = customer_phone.replace(/\D/g, '')
        await sendSMS(cleanPhone, customerSMS)
      } catch (smsError) {
        console.error('Error sending customer confirmation:', smsError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Request submitted successfully',
      booking_id: bookingId
    })

  } catch (error) {
    console.error('Error processing customer request:', error)
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    )
  }
}
