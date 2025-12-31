'use client'

import { useState, useEffect, useCallback } from 'react'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  Package,
  AlertTriangle,
  RefreshCw,
  Settings
} from 'lucide-react'
import Link from 'next/link'

export default function CapacityCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // Use fleet size from config
  const fleetSize = config.fleet || { '20yd': 3, '30yd': 2 }
  const totalDumpsters = Object.values(fleetSize).reduce((a, b) => a + b, 0)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      // Get bookings for the current month view (plus buffer)
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      startDate.setDate(startDate.getDate() - 7)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)

      const response = await fetch(
        `${config.supabase.url}/rest/v1/bookings?delivery_date=gte.${startDate.toISOString().split('T')[0]}&delivery_date=lte.${endDate.toISOString().split('T')[0]}&status=in.(pending,confirmed,delivered)`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )

      if (response.ok) {
        setBookings(await response.json())
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
    setLoading(false)
  }, [currentDate])

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('adminAuth') !== 'true') {
      window.location.href = '/admin'
      return
    }
    fetchBookings()
  }, [fetchBookings])

  // Calculate how many dumpsters are "out" on a given date
  const getDumpstersOut = (date) => {
    const dateStr = date.toISOString().split('T')[0]

    // Initialize with all sizes from fleet
    const out = {}
    Object.keys(fleetSize).forEach(size => {
      out[size] = 0
    })

    for (const booking of bookings) {
      const deliveryDate = new Date(booking.delivery_date)
      // Default to 10 days for standard rentals, support legacy 3/7-day
      let rentalDays = 10
      if (booking.rental_duration === '3-day') rentalDays = 3
      else if (booking.rental_duration === '7-day') rentalDays = 7
      else if (booking.rental_duration?.match(/(\d+)-day/)) {
        rentalDays = parseInt(booking.rental_duration.match(/(\d+)-day/)[1])
      }
      const pickupDate = new Date(deliveryDate)
      pickupDate.setDate(pickupDate.getDate() + rentalDays)

      // Check if this booking overlaps with the date
      const checkDate = new Date(dateStr)
      if (checkDate >= deliveryDate && checkDate < pickupDate) {
        if (out[booking.dumpster_size] !== undefined) {
          out[booking.dumpster_size]++
        }
      }
    }

    return out
  }

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days = []

    // Add padding for days before first of month
    const startPadding = firstDay.getDay()
    for (let i = 0; i < startPadding; i++) {
      const date = new Date(year, month, -startPadding + i + 1)
      days.push({ date, isCurrentMonth: false })
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // Add padding after last day
    const endPadding = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getCapacityColor = (out, total) => {
    const pct = out / total
    if (pct >= 0.9) return 'bg-red-100 border-red-300'
    if (pct >= 0.7) return 'bg-orange-100 border-orange-300'
    if (pct >= 0.5) return 'bg-yellow-100 border-yellow-300'
    return 'bg-green-100 border-green-300'
  }

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminNav />

      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                  <Package className="w-6 h-6 text-primary-600" />
                  Capacity Calendar
                </h1>
                <p className="text-sm text-neutral-500">
                  {totalDumpsters} dumpsters in fleet
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/fleet"
                className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                title="Manage Fleet"
              >
                <Settings className="w-5 h-5 text-neutral-600" />
              </Link>
              <button
                onClick={fetchBookings}
                disabled={loading}
                className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-neutral-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Fleet Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(fleetSize).map(([size, count]) => {
            const dumpster = config.dumpsters.find(d => d.id === size)
            return (
              <div key={size} className="bg-white rounded-xl p-4 text-center border border-neutral-200">
                <Truck className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <p className="text-neutral-900 font-bold">{count}x {dumpster?.shortName || size}</p>
              </div>
            )
          })}
          <div className="bg-primary-50 rounded-xl p-4 text-center border border-primary-200">
            <Package className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="text-primary-700 font-bold">{totalDumpsters} Total</p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="p-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50"
          >
            <ChevronLeft className="w-6 h-6 text-neutral-700" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-neutral-900">{monthName}</h2>
            <button
              onClick={goToToday}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Go to Today
            </button>
          </div>

          <button
            onClick={nextMonth}
            className="p-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50"
          >
            <ChevronRight className="w-6 h-6 text-neutral-700" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl overflow-hidden border border-neutral-200">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-neutral-500 text-sm font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {getCalendarDays().map((day, idx) => {
              const out = getDumpstersOut(day.date)
              const totalOut = Object.values(out).reduce((a, b) => a + b, 0)
              const available = totalDumpsters - totalOut
              const capacityColor = getCapacityColor(totalOut, totalDumpsters)

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 border-b border-r border-neutral-200 ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-neutral-50 opacity-60'
                  } ${isToday(day.date) ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      isToday(day.date) ? 'text-primary-600' : 'text-neutral-900'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    {totalOut > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${capacityColor}`}>
                        {available} left
                      </span>
                    )}
                  </div>

                  {totalOut > 0 && day.isCurrentMonth && (
                    <div className="space-y-1">
                      {Object.entries(out).map(([size, count]) => {
                        if (count === 0) return null
                        const max = fleetSize[size]
                        const isMaxed = count >= max
                        return (
                          <div
                            key={size}
                            className={`text-xs px-2 py-1 rounded flex items-center justify-between ${
                              isMaxed ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            <span>{size.replace('yd', '')}</span>
                            <span>{count}/{max}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {totalOut >= totalDumpsters && day.isCurrentMonth && (
                    <div className="flex items-center justify-center mt-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
            <span className="text-neutral-600">&lt;50% booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
            <span className="text-neutral-600">50-70% booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
            <span className="text-neutral-600">70-90% booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
            <span className="text-neutral-600">&gt;90% booked</span>
          </div>
        </div>

        {/* Capacity Note */}
        <div className="mt-6 bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
          <p className="text-neutral-700 text-sm">
            Fleet sizes are configured in <code className="text-primary-600 bg-white px-2 py-0.5 rounded">src/config.js</code> under the <code className="text-primary-600 bg-white px-2 py-0.5 rounded">fleet</code> property.
          </p>
        </div>
      </div>
    </div>
  )
}
