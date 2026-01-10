'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { config } from '../../config'
import AdminNav from '../../components/AdminNav'
import { useRealtimeBookings } from '../../hooks/useRealtimeBookings'
import {
  Truck,
  Phone,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Lock,
  User,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  Eye,
  ExternalLink,
  Bell
} from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'calendar'
  const [calendarDate, setCalendarDate] = useState(new Date())

  // Real-time bookings hook (only enabled when authenticated)
  const {
    bookings,
    loading,
    lastUpdated,
    newBookingCount,
    refresh: fetchBookings,
    clearNewBookingAlert,
  } = useRealtimeBookings(isAuthenticated)

  // Check password via server-side validation
  const handleLogin = async (e) => {
    e.preventDefault()
    setPasswordError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsAuthenticated(true)
        // Store token securely in sessionStorage
        sessionStorage.setItem('adminToken', data.token)
      } else {
        setPasswordError(data.error || 'Wrong password')
      }
    } catch (error) {
      console.error('Login error:', error)
      setPasswordError('Login failed. Please try again.')
    }
  }

  // Get auth header for admin API requests
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('adminToken')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  // Check for existing session on mount
  useEffect(() => {
    const validateSession = async () => {
      const token = sessionStorage.getItem('adminToken')
      if (!token) return

      try {
        const response = await fetch('/api/admin/auth', {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (response.ok) {
          setIsAuthenticated(true)
        } else {
          sessionStorage.removeItem('adminToken')
        }
      } catch (error) {
        sessionStorage.removeItem('adminToken')
      }
    }

    validateSession()
  }, [])

  // Update booking status
  const updateStatus = async (bookingId, newStatus, e) => {
    e.stopPropagation() // Prevent navigation
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchBookings()
      } else {
        console.error('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  // Filter bookings by status and search
  const filteredBookings = bookings.filter(booking => {
    // Status filter
    if (filter !== 'all' && booking.status !== filter) return false
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        booking.customer_name?.toLowerCase().includes(query) ||
        booking.customer_phone?.includes(query) ||
        booking.address?.toLowerCase().includes(query) ||
        booking.customer_email?.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'confirmed': return 'bg-blue-500/20 text-blue-400'
      case 'delivered': return 'bg-purple-500/20 text-purple-400'
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No date'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Time ago
  const timeAgo = (dateString) => {
    const now = new Date()
    const then = new Date(dateString)
    const seconds = Math.floor((now - then) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // Get dumpster name
  const getDumpsterName = (sizeId) => {
    const dumpster = config.dumpsters.find(d => d.id === sizeId)
    return dumpster?.name || sizeId
  }

  // Navigate to booking detail
  const openBooking = (bookingId) => {
    router.push(`/admin/booking/${bookingId}`)
  }

  // ===== CALENDAR HELPERS =====
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    return { daysInMonth, startingDay }
  }

  const getBookingsForDate = (day) => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    return filteredBookings.filter(b => b.delivery_date === dateStr)
  }

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
  }

  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // ============================================
  // LOGIN SCREEN
  // ============================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-dark-400 mt-2">{config.businessName}</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                placeholder="Enter admin password"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <button type="submit" className="w-full btn-primary">
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Bookings</h1>
            <p className="text-dark-400">Manage all dumpster rentals</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* New Booking Alert */}
            {newBookingCount > 0 && (
              <button
                onClick={() => {
                  clearNewBookingAlert()
                  fetchBookings()
                }}
                className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500 rounded-lg text-green-400 animate-pulse"
              >
                <Bell className="w-4 h-4" />
                <span className="font-medium">{newBookingCount} new booking{newBookingCount > 1 ? 's' : ''}!</span>
              </button>
            )}

            {/* Last Updated */}
            {lastUpdated && (
              <span className="text-dark-500 text-xs hidden md:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            {/* View Toggle */}
            <div className="flex bg-dark-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-300 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'calendar'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-300 hover:text-white'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Calendar
              </button>
            </div>

            <button
              onClick={fetchBookings}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
              title="Auto-refreshes every 30 seconds"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: bookings.length, color: 'text-white' },
            { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: 'text-yellow-400' },
            { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-blue-400' },
            { label: 'Delivered', value: bookings.filter(b => b.status === 'delivered').length, color: 'text-purple-400' },
            { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-dark-800 rounded-xl p-3 border border-dark-700">
              <p className="text-dark-400 text-xs">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or address..."
              className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
            />
          </div>
          
          {/* Status Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['all', 'pending', 'confirmed', 'delivered', 'completed', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ===== LIST VIEW ===== */}
        {viewMode === 'list' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
                <p className="text-dark-400 mt-2">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-dark-800 rounded-2xl border border-dark-700">
                <Package className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">
                  {searchQuery ? 'No bookings match your search' : 'No bookings yet'}
                </p>
                {!searchQuery && (
                  <p className="text-dark-500 text-sm mt-1">
                    Bookings from the chatbot will appear here
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking) => (
                  <div 
                    key={booking.id}
                    onClick={() => openBooking(booking.id)}
                    className="bg-dark-800 rounded-xl border border-dark-700 p-4 hover:border-primary-500/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Customer Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-white">
                              {booking.customer_name}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                          
                          <a 
                            href={`tel:${booking.customer_phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 mt-1"
                          >
                            <Phone className="w-4 h-4" />
                            {booking.customer_phone}
                          </a>
                          
                          <div className="flex items-start gap-2 text-dark-300 mt-1">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="text-sm truncate">{booking.address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Booking Details */}
                      <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                        <div className="text-center">
                          <p className="text-dark-500 text-xs uppercase">Size</p>
                          <p className="text-white font-medium text-sm">
                            {getDumpsterName(booking.dumpster_size)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-dark-500 text-xs uppercase">Delivery</p>
                          <p className="text-white font-medium text-sm">
                            {formatDate(booking.delivery_date)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-dark-500 text-xs uppercase">Price</p>
                          <p className="text-primary-400 font-bold">
                            ${booking.price_cents ? (booking.price_cents / 100).toFixed(0) : 'TBD'}
                          </p>
                        </div>
                        
                        {/* View button */}
                        <div className="flex items-center gap-2">
                          <Eye className="w-5 h-5 text-dark-500 group-hover:text-primary-400 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-700">
                      <p className="text-dark-500 text-sm">
                        {timeAgo(booking.created_at)}
                        {booking.placement_lat && (
                          <span className="ml-2 text-green-400">📍 Has placement</span>
                        )}
                      </p>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => updateStatus(booking.id, 'confirmed', e)}
                              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={(e) => updateStatus(booking.id, 'cancelled', e)}
                              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={(e) => updateStatus(booking.id, 'delivered', e)}
                            className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
                          >
                            Delivered
                          </button>
                        )}
                        {booking.status === 'delivered' && (
                          <button
                            onClick={(e) => updateStatus(booking.id, 'completed', e)}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== CALENDAR VIEW ===== */}
        {viewMode === 'calendar' && (
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-dark-300" />
              </button>
              <h2 className="text-lg font-semibold text-white">{monthName}</h2>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-dark-300" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-dark-500 text-xs font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const { daysInMonth, startingDay } = getDaysInMonth(calendarDate)
                  const days = []
                  const today = new Date()
                  const isCurrentMonth = 
                    today.getMonth() === calendarDate.getMonth() && 
                    today.getFullYear() === calendarDate.getFullYear()

                  // Empty cells before first day
                  for (let i = 0; i < startingDay; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />)
                  }

                  // Day cells
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dayBookings = getBookingsForDate(day)
                    const isToday = isCurrentMonth && today.getDate() === day

                    days.push(
                      <div
                        key={day}
                        className={`aspect-square p-1 border rounded-lg transition-colors ${
                          isToday 
                            ? 'border-primary-500 bg-primary-500/10' 
                            : 'border-dark-700 hover:border-dark-600'
                        } ${dayBookings.length > 0 ? 'cursor-pointer' : ''}`}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary-400' : 'text-dark-400'}`}>
                          {day}
                        </div>
                        {dayBookings.length > 0 && (
                          <div className="space-y-0.5">
                            {dayBookings.slice(0, 2).map((b) => (
                              <div
                                key={b.id}
                                onClick={() => openBooking(b.id)}
                                className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${getStatusColor(b.status)}`}
                                title={`${b.customer_name} - ${getDumpsterName(b.dumpster_size)}`}
                              >
                                {b.customer_name.split(' ')[0]}
                              </div>
                            ))}
                            {dayBookings.length > 2 && (
                              <div className="text-xs text-dark-500 px-1">
                                +{dayBookings.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  return days
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-dark-500 text-sm mt-8">
          Auto-refreshes every 30 seconds • Click any booking to view details
        </p>
      </div>
      </div>
    </div>
  )
}
