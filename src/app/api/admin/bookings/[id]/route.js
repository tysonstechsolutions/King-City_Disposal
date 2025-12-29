import { NextResponse } from 'next/server'
import { config } from '../../../../../config'

// Get service role key for admin operations
const getServiceKey = () => {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey
}

// PATCH - Update booking (status, notes)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
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
      `${config.supabase.url}/rest/v1/bookings?id=eq.${id}`,
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
      console.error('Supabase update error:', errorText)
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: response.status }
      )
    }

    const updated = await response.json()
    return NextResponse.json({ success: true, booking: updated[0] })

  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete booking
export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const response = await fetch(
      `${config.supabase.url}/rest/v1/bookings?id=eq.${id}`,
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
      console.error('Supabase delete error:', errorText)
      return NextResponse.json(
        { error: 'Failed to delete booking' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete booking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
