// ============================================
// INVENTORY MANAGEMENT UTILITIES
// ============================================
// Prevents overbooking by checking dumpster availability

import { config } from '../config'

/**
 * Calculate how many dumpsters are available for a given date and size
 *
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} size - Dumpster size (e.g., '20yd', '30yd')
 * @returns {Promise<{total: number, booked: number, available: number}>}
 */
export async function getAvailability(date, size) {
  const supabaseUrl = config.supabase.url
  const supabaseKey = config.supabase.anonKey

  // Get fleet size from config
  const total = config.fleet[size] || 0

  if (total === 0) {
    return { total: 0, booked: 0, available: 0 }
  }

  try {
    // Query bookings that overlap with this date
    // A dumpster is "in use" from delivery_date through pickup_date
    // pickup_date = delivery_date + rental_duration (default 10 days)
    //
    // We need to find bookings where:
    // - delivery_date <= requested_date
    // - pickup_date > requested_date (dumpster hasn't been picked up yet)
    // - status is not 'cancelled' or 'completed'
    // - dumpster_size matches

    // First, get all active bookings for this size
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?` +
      `dumpster_size=eq.${size}&` +
      `status=in.(pending,confirmed,delivered)&` +
      `select=id,delivery_date,rental_duration`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch bookings for availability check')
      // On error, assume some availability to not block bookings
      return { total, booked: 0, available: total }
    }

    const bookings = await response.json()

    // Calculate which bookings overlap with the requested date
    const requestedDate = new Date(date + 'T12:00:00')

    let booked = 0
    for (const booking of bookings) {
      const deliveryDate = new Date(booking.delivery_date + 'T00:00:00')

      // Calculate pickup date based on rental duration
      // Standard 10-day rental
      let durationDays = 10
      const durationMatch = booking.rental_duration?.match(/(\d+)-day/)
      if (durationMatch) durationDays = parseInt(durationMatch[1])
      const pickupDate = new Date(deliveryDate)
      pickupDate.setDate(pickupDate.getDate() + durationDays)

      // Check if requested date falls within the rental period
      // Dumpster is in use from delivery_date up to (but not including) pickup_date
      if (requestedDate >= deliveryDate && requestedDate < pickupDate) {
        booked++
      }
    }

    const available = Math.max(0, total - booked)

    return { total, booked, available }
  } catch (error) {
    console.error('Error checking availability:', error)
    // On error, assume some availability to not block bookings
    return { total, booked: 0, available: total }
  }
}

/**
 * Check availability for all dumpster sizes on a given date
 *
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Object with availability for each size
 */
export async function getAllAvailability(date) {
  const sizes = Object.keys(config.fleet)
  const results = {}

  await Promise.all(
    sizes.map(async (size) => {
      results[size] = await getAvailability(date, size)
    })
  )

  return results
}

/**
 * Check if a specific size is available on a date
 *
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} size - Dumpster size
 * @returns {Promise<boolean>}
 */
export async function isAvailable(date, size) {
  const { available } = await getAvailability(date, size)
  return available > 0
}

/**
 * Get availability for a range of dates (for calendar display)
 *
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {number} days - Number of days to check
 * @param {string} size - Dumpster size
 * @returns {Promise<Object>} - Object with date as key, availability as value
 */
export async function getAvailabilityRange(startDate, days, size) {
  const results = {}
  const start = new Date(startDate + 'T12:00:00')

  for (let i = 0; i < days; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    results[dateStr] = await getAvailability(dateStr, size)
  }

  return results
}
