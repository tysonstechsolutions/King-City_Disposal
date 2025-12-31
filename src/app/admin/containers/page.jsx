'use client'

import { useState, useEffect, useCallback } from 'react'
import { config } from '../../../config'
import { 
  Truck, 
  MapPin, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  RefreshCw,
  ArrowLeft,
  Package,
  User,
  Navigation
} from 'lucide-react'
import Link from 'next/link'

export default function ContainerBoardPage() {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, overdue, ending-soon, active
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Fetch active containers
  const fetchContainers = useCallback(async () => {
    setLoading(true)
    try {
      // Get all delivered/confirmed bookings (active containers)
      const response = await fetch(
        `${config.supabase.url}/rest/v1/bookings?status=in.(confirmed,delivered)&order=delivery_date.asc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        
        // Calculate status for each container
        const enrichedData = data.map(booking => {
          const deliveryDate = new Date(booking.delivery_date)
          const rentalDays = booking.rental_duration === '3-day' ? 3 : 7
          const pickupDate = new Date(deliveryDate)
          pickupDate.setDate(pickupDate.getDate() + rentalDays)
          
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          pickupDate.setHours(0, 0, 0, 0)
          
          const daysUntilPickup = Math.ceil((pickupDate - today) / (1000 * 60 * 60 * 24))
          
          let containerStatus = 'active'
          if (daysUntilPickup < 0) {
            containerStatus = 'overdue'
          } else if (daysUntilPickup === 0) {
            containerStatus = 'pickup-today'
          } else if (daysUntilPickup === 1) {
            containerStatus = 'ending-soon'
          }
          
          return {
            ...booking,
            pickupDate,
            daysUntilPickup,
            containerStatus,
          }
        })
        
        // Sort: overdue first, then by pickup date
        enrichedData.sort((a, b) => {
          const statusOrder = { 'overdue': 0, 'pickup-today': 1, 'ending-soon': 2, 'active': 3 }
          if (statusOrder[a.containerStatus] !== statusOrder[b.containerStatus]) {
            return statusOrder[a.containerStatus] - statusOrder[b.containerStatus]
          }
          return a.daysUntilPickup - b.daysUntilPickup
        })
        
        setContainers(enrichedData)
      }
    } catch (error) {
      console.error('Error fetching containers:', error)
    }
    setLoading(false)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    // Check auth
    if (typeof window !== 'undefined' && sessionStorage.getItem('adminAuth') !== 'true') {
      window.location.href = '/admin'
      return
    }
    fetchContainers()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchContainers, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchContainers])

  // Filter containers
  const filteredContainers = containers.filter(c => {
    if (filter === 'all') return true
    if (filter === 'overdue') return c.containerStatus === 'overdue'
    if (filter === 'ending-soon') return ['pickup-today', 'ending-soon'].includes(c.containerStatus)
    if (filter === 'active') return c.containerStatus === 'active'
    return true
  })

  // Get status color and icon
  const getStatusStyle = (status) => {
    switch (status) {
      case 'overdue':
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/50',
          text: 'text-red-400',
          icon: <AlertTriangle className="w-5 h-5" />,
          label: 'OVERDUE'
        }
      case 'pickup-today':
        return {
          bg: 'bg-orange-500/20',
          border: 'border-orange-500/50',
          text: 'text-orange-400',
          icon: <Clock className="w-5 h-5" />,
          label: 'PICKUP TODAY'
        }
      case 'ending-soon':
        return {
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/50',
          text: 'text-yellow-400',
          icon: <Clock className="w-5 h-5" />,
          label: 'ENDS TOMORROW'
        }
      default:
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-500/50',
          text: 'text-green-400',
          icon: <CheckCircle className="w-5 h-5" />,
          label: 'ACTIVE'
        }
    }
  }

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get counts
  const counts = {
    all: containers.length,
    overdue: containers.filter(c => c.containerStatus === 'overdue').length,
    endingSoon: containers.filter(c => ['pickup-today', 'ending-soon'].includes(c.containerStatus)).length,
    active: containers.filter(c => c.containerStatus === 'active').length,
  }

  // Open in Google Maps
  const openInMaps = (booking) => {
    const lat = booking.placement_lat
    const lng = booking.placement_lng
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(booking.address)}`, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header */}
      <div className="bg-neutral-800 border-b border-neutral-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin"
                className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="w-6 h-6 text-primary-400" />
                  Container Board
                </h1>
                <p className="text-sm text-neutral-400">
                  {containers.length} active containers
                </p>
              </div>
            </div>
            
            <button
              onClick={fetchContainers}
              disabled={loading}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'all' 
                ? 'bg-primary-500/20 border-primary-500' 
                : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
            }`}
          >
            <p className="text-2xl font-bold text-white">{counts.all}</p>
            <p className="text-sm text-neutral-400">Total Out</p>
          </button>
          
          <button
            onClick={() => setFilter('overdue')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'overdue' 
                ? 'bg-red-500/20 border-red-500' 
                : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
            }`}
          >
            <p className={`text-2xl font-bold ${counts.overdue > 0 ? 'text-red-400' : 'text-white'}`}>
              {counts.overdue}
            </p>
            <p className="text-sm text-neutral-400">Overdue</p>
          </button>
          
          <button
            onClick={() => setFilter('ending-soon')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'ending-soon' 
                ? 'bg-yellow-500/20 border-yellow-500' 
                : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
            }`}
          >
            <p className={`text-2xl font-bold ${counts.endingSoon > 0 ? 'text-yellow-400' : 'text-white'}`}>
              {counts.endingSoon}
            </p>
            <p className="text-sm text-neutral-400">Ending Soon</p>
          </button>
          
          <button
            onClick={() => setFilter('active')}
            className={`p-4 rounded-xl border transition-colors ${
              filter === 'active' 
                ? 'bg-green-500/20 border-green-500' 
                : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
            }`}
          >
            <p className="text-2xl font-bold text-green-400">{counts.active}</p>
            <p className="text-sm text-neutral-400">Active</p>
          </button>
        </div>

        {/* Container List */}
        {loading && containers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : filteredContainers.length === 0 ? (
          <div className="text-center py-12 bg-neutral-800 rounded-xl border border-neutral-700">
            <Package className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400">No containers found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContainers.map((container) => {
              const style = getStatusStyle(container.containerStatus)
              const dumpster = config.dumpsters.find(d => d.id === container.dumpster_size)
              
              return (
                <div
                  key={container.id}
                  className={`${style.bg} border ${style.border} rounded-xl p-4 transition-all hover:scale-[1.01]`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Status Badge */}
                    <div className={`flex items-center gap-2 ${style.text} font-semibold`}>
                      {style.icon}
                      <span className="text-sm">{style.label}</span>
                    </div>
                    
                    {/* Main Info */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Location */}
                      <div>
                        <p className="text-white font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-neutral-400" />
                          {container.address}
                        </p>
                        <p className="text-neutral-400 text-sm mt-1 flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {container.customer_name}
                        </p>
                      </div>
                      
                      {/* Dumpster Size */}
                      <div>
                        <p className="text-white font-medium flex items-center gap-2">
                          <Truck className="w-4 h-4 text-neutral-400" />
                          {dumpster?.name || container.dumpster_size}
                        </p>
                        <p className="text-neutral-400 text-sm mt-1">
                          {container.rental_duration === '3-day' ? '3-Day' : '7-Day'} Rental
                        </p>
                      </div>
                      
                      {/* Dates */}
                      <div>
                        <p className="text-white font-medium flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          Pickup: {formatDate(container.pickupDate)}
                        </p>
                        <p className="text-neutral-400 text-sm mt-1">
                          {container.daysUntilPickup < 0 
                            ? `${Math.abs(container.daysUntilPickup)} days overdue`
                            : container.daysUntilPickup === 0 
                            ? 'Today'
                            : `${container.daysUntilPickup} day${container.daysUntilPickup !== 1 ? 's' : ''} left`
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${container.customer_phone}`}
                        className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
                        title="Call customer"
                      >
                        <Phone className="w-5 h-5 text-neutral-300" />
                      </a>
                      <button
                        onClick={() => openInMaps(container)}
                        className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
                        title="Open in Maps"
                      >
                        <Navigation className="w-5 h-5 text-neutral-300" />
                      </button>
                      <Link
                        href={`/admin/booking/${container.id}`}
                        className="p-2 bg-primary-500/20 hover:bg-primary-500/30 rounded-lg transition-colors"
                        title="View details"
                      >
                        <span className="text-primary-400 text-sm font-medium px-2">View</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Last refresh time */}
        <p className="text-center text-neutral-500 text-sm mt-6">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}
