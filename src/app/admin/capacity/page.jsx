'use client'

import { useState, useEffect, useCallback } from 'react'
import { config } from '../../../config'
import { 
  ChevronLeft,
  ChevronRight,
  Truck,
  Package,
  AlertTriangle,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

export default function CapacityCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Fleet size - configure these based on actual inventory
  const fleetSize = {
    '14yd': 3,
    '20yd': 5,
    '30yd': 2,
  }
  const totalDumpsters = Object.values(fleetSize).reduce((a, b) => a + b, 0)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      // Get bookings for the current month view (plus buffer)
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      startDate.setDate(startDate.getDate() - 7)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
      
      const response = await fetch(
        `${config.supabase.url}/rest/v1/bookings?delivery_date=gte.${startDate.toISOString().split('T')[0]}&delivery_date=lte.${endDate.toISOString().split('T')[0]}&status=in.(confirmed,delivered)`,
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
    if (sessionStorage.getItem('adminAuth') !== 'true') {
      window.location.href = '/admin'
      return
    }
    fetchBookings()
  }, [fetchBookings])

  // Calculate how many dumpsters are "out" on a given date
  const getDumpstersOut = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    
    const out = { '14yd': 0, '20yd': 0, '30yd': 0 }
    
    for (const booking of bookings) {
      const deliveryDate = new Date(booking.delivery_date)
      const rentalDays = booking.rental_duration === '3-day' ? 3 : 
                         booking.rental_duration?.match(/(\d+)-day/)?.[1] ? 
                         parseInt(booking.rental_duration.match(/(\d+)-day/)[1]) : 7
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
    if (pct >= 0.9) return 'bg-red-500/30 border-red-500/50'
    if (pct >= 0.7) return 'bg-orange-500/30 border-orange-500/50'
    if (pct >= 0.5) return 'bg-yellow-500/30 border-yellow-500/50'
    return 'bg-green-500/20 border-green-500/30'
  }

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin"
                className="flex items-center gap-2 text-dark-300 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="w-6 h-6 text-primary-400" />
                  Capacity Calendar
                </h1>
                <p className="text-sm text-dark-400">
                  {totalDumpsters} dumpsters in fleet
                </p>
              </div>
            </div>
            
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="p-2 bg-dark-700 rounded-lg"
            >
              <RefreshCw className={`w-5 h-5 text-dark-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Fleet Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Object.entries(fleetSize).map(([size, count]) => {
            const dumpster = config.dumpsters.find(d => d.id === size)
            return (
              <div key={size} className="bg-dark-800 rounded-xl p-4 text-center">
                <Truck className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">{count}x {dumpster?.shortName || size}</p>
              </div>
            )
          })}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">{monthName}</h2>
            <button
              onClick={goToToday}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              Go to Today
            </button>
          </div>
          
          <button
            onClick={nextMonth}
            className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-dark-800 rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-dark-700">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-dark-400 text-sm font-medium">
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
                  className={`min-h-[100px] p-2 border-b border-r border-dark-700 ${
                    day.isCurrentMonth ? '' : 'opacity-40'
                  } ${isToday(day.date) ? 'ring-2 ring-primary-400 ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      isToday(day.date) ? 'text-primary-400' : 'text-white'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    {totalOut > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${capacityColor}`}>
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
                              isMaxed ? 'bg-red-500/30 text-red-300' : 'bg-dark-600 text-dark-300'
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
                      <AlertTriangle className="w-4 h-4 text-red-400" />
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
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30"></div>
            <span className="text-dark-400">&lt;50% booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-500/50"></div>
            <span className="text-dark-400">50-70% booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500/30 border border-orange-500/50"></div>
            <span className="text-dark-400">70-90% booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/30 border border-red-500/50"></div>
            <span className="text-dark-400">&gt;90% booked</span>
          </div>
        </div>

        {/* Capacity Note */}
        <div className="mt-6 bg-dark-800 rounded-xl p-4 text-center">
          <p className="text-dark-400 text-sm">
            💡 To update fleet size, edit the <code className="text-primary-400">fleetSize</code> object in this component
          </p>
        </div>
      </div>
    </div>
  )
}
