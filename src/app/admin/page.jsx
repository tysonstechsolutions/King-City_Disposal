'use client'

import { useState, useEffect } from 'react'
import { config } from '../../config'
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
  Package
} from 'lucide-react'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all, pending, confirmed, completed

  // Check password
  const handleLogin = (e) => {
    e.preventDefault()
    if (password === config.admin.password) {
      setIsAuthenticated(true)
      setPasswordError('')
      fetchBookings()
    } else {
      setPasswordError('Wrong password')
    }
  }

  // Fetch bookings from Supabase
  const fetchBookings = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/bookings?order=created_at.desc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      } else {
        console.error('Failed to fetch bookings')
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
    setLoading(false)
  }

  // Update booking status
  const updateStatus = async (bookingId, newStatus) => {
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/bookings?id=eq.${bookingId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )
      
      if (response.ok) {
        fetchBookings() // Refresh
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    return booking.status === filter
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
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Format time ago
  const timeAgo = (dateString) => {
    const now = new Date()
    const then = new Date(dateString)
    const seconds = Math.floor((now - then) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // Get dumpster info
  const getDumpsterName = (sizeId) => {
    const dumpster = config.dumpsters.find(d => d.id === sizeId)
    return dumpster?.name || sizeId
  }

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
                className="input-field"
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

          <p className="text-center text-dark-500 text-sm mt-6">
            Default password is in config.js
          </p>
        </div>
      </div>
    )
  }

  // ============================================
  // ADMIN DASHBOARD
  // ============================================
  return (
    <div className="min-h-screen bg-dark-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Bookings</h1>
            <p className="text-dark-400">{config.businessName} Admin</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: bookings.length, color: 'text-white' },
            { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: 'text-yellow-400' },
            { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-blue-400' },
            { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <p className="text-dark-400 text-sm">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'pending', 'confirmed', 'delivered', 'completed', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
            <p className="text-dark-400 mt-2">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-dark-800 rounded-2xl border border-dark-700">
            <Package className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">No bookings yet</p>
            <p className="text-dark-500 text-sm mt-1">
              Bookings from the chatbot will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div 
                key={booking.id}
                className="bg-dark-800 rounded-xl border border-dark-700 p-4 md:p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Customer Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
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
                          className="flex items-center gap-2 text-primary-400 hover:text-primary-300 mt-1"
                        >
                          <Phone className="w-4 h-4" />
                          {booking.customer_phone}
                        </a>
                        
                        <div className="flex items-start gap-2 text-dark-300 mt-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{booking.address}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="flex flex-wrap gap-4 lg:gap-6">
                    <div>
                      <p className="text-dark-500 text-xs uppercase">Dumpster</p>
                      <p className="text-white font-medium flex items-center gap-1">
                        <Truck className="w-4 h-4 text-primary-400" />
                        {getDumpsterName(booking.dumpster_size)}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-500 text-xs uppercase">Delivery</p>
                      <p className="text-white font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-primary-400" />
                        {formatDate(booking.delivery_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-500 text-xs uppercase">Duration</p>
                      <p className="text-white font-medium flex items-center gap-1">
                        <Clock className="w-4 h-4 text-primary-400" />
                        {booking.rental_duration}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-500 text-xs uppercase">Price</p>
                      <p className="text-primary-400 font-bold flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {booking.price_cents ? (booking.price_cents / 100).toFixed(0) : 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700">
                  <p className="text-dark-500 text-sm">
                    {timeAgo(booking.created_at)}
                  </p>
                  
                  <div className="flex gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(booking.id, 'confirmed')}
                          className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateStatus(booking.id, 'cancelled')}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(booking.id, 'delivered')}
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                    {booking.status === 'delivered' && (
                      <button
                        onClick={() => updateStatus(booking.id, 'completed')}
                        className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-dark-500 text-sm mt-8">
          💡 Tip: When Twilio is set up, you'll get text notifications for new bookings
        </p>
      </div>
    </div>
  )
}
