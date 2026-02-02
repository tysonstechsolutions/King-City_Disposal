import { NextResponse } from 'next/server'
import { config } from '../../../../../config'
import { requireAdminAuth } from '../../../../../lib/adminAuth'
import { logger } from '../../../../../lib/logger'

// Get service role key for admin operations
const getServiceKey = () => {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey
}

// Validate booking ID (supports both numeric IDs and UUIDs)
function validateBookingId(id) {
  if (!id || typeof id !== 'string') return null

  // Check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(id)) {
    return id
  }

  // Check if it's a valid numeric ID
  const numId = parseInt(id, 10)
  if (!isNaN(numId) && numId > 0) {
    return numId
  }

  return null
}

// PATCH - Update booking (status, notes)
export async function PATCH(request, { params }) {
  try {
    // Check admin authentication (now async)
    const auth = await requireAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const { id } = await params

    // Validate booking ID
    const validId = validateBookingId(id)
    if (!validId) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = ['status', 'notes', 'weight_tons', 'actual_pickup_date']
    const updateData = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${config.supabase.url}/rest/v1/bookings?id=eq.${validId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getServiceKey(),
          'Authorization': `Bearer ${getServiceKey()}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updateData),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Supabase update error', null, { error: errorText })
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: response.status }
      )
    }

    const updated = await response.json()
    return NextResponse.json({ success: true, booking: updated[0] })

  } catch (error) {
    logger.error('Update booking error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete booking
export async function DELETE(request, { params }) {
  try {
    // Check admin authentication (now async)
    const auth = await requireAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const { id } = await params

    // Validate booking ID
    const validId = validateBookingId(id)
    if (!validId) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `${config.supabase.url}/rest/v1/bookings?id=eq.${validId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': getServiceKey(),
          'Authorization': `Bearer ${getServiceKey()}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Supabase delete error', null, { error: errorText })
      return NextResponse.json(
        { error: 'Failed to delete booking' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Delete booking error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
