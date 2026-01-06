import { NextResponse } from 'next/server'
import { getAvailability, getAllAvailability } from '../../../lib/inventory'

// Force dynamic rendering (not static)
export const dynamic = 'force-dynamic'

// ============================================
// AVAILABILITY API ENDPOINT
// ============================================
// Check dumpster availability for a specific date
//
// GET /api/availability?date=2025-01-15&size=20yd
// Returns: { available: 2, total: 3, booked: 1 }
//
// GET /api/availability?date=2025-01-15 (no size = all sizes)
// Returns: { '20yd': { available: 2, total: 3, booked: 1 }, '30yd': { ... } }
// ============================================

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const size = searchParams.get('size')

    // Validate date
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // If size is provided, get availability for that size only
    if (size) {
      const availability = await getAvailability(date, size)
      return NextResponse.json(availability)
    }

    // Otherwise, get availability for all sizes
    const allAvailability = await getAllAvailability(date)
    return NextResponse.json(allAvailability)

  } catch (error) {
    console.error('Availability check error:', error)
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
}
