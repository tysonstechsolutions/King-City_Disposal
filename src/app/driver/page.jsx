'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { config } from '../../config'
import { logger } from '../../lib/logger'
import {
  Truck,
  MapPin,
  Phone,
  Check,
  Clock,
  Navigation,
  RefreshCw,
  Camera,
  User,
  Package,
  AlertTriangle,
  Lock
} from 'lucide-react'

export default function DriverChecklistPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  // Check authentication on mount. The admin login stores the cryptographic
  // session token under 'adminToken' — the old 'adminAuth=true' check never
  // matched, so the driver page always redirected. Use the same token key as
  // every other admin page.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('adminToken')
      if (token) {
        setIsAuthenticated(true)
      } else {
        router.push('/admin')
      }
    }
  }, [router])

  const fetchStops = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch deliveries for today
      const deliveriesRes = await fetch(
        `${config.supabase.url}/rest/v1/bookings?delivery_date=eq.${today}&status=in.(confirmed,delivered)&order=created_at.asc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      const deliveries = deliveriesRes.ok ? await deliveriesRes.json() : []

      // Fetch all delivered (for pickups)
      const deliveredRes = await fetch(
        `${config.supabase.url}/rest/v1/bookings?status=eq.delivered&order=delivery_date.asc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      const allDelivered = deliveredRes.ok ? await deliveredRes.json() : []

      // Find pickups due today or overdue
      const pickups = allDelivered.filter(b => {
        const deliveryDate = new Date(b.delivery_date)
        const durationMatch = b.rental_duration?.match(/(\d+)-day/)
        const days = durationMatch ? parseInt(durationMatch[1]) : 10
        const pickupDate = new Date(deliveryDate)
        pickupDate.setDate(pickupDate.getDate() + days)
        return pickupDate.toISOString().split('T')[0] <= today
      }).map(b => {
        const deliveryDate = new Date(b.delivery_date)
        const durationMatch = b.rental_duration?.match(/(\d+)-day/)
        const days = durationMatch ? parseInt(durationMatch[1]) : 10
        const pickupDate = new Date(deliveryDate)
        pickupDate.setDate(pickupDate.getDate() + days)
        const isOverdue = pickupDate.toISOString().split('T')[0] < today
        return { ...b, isPickup: true, isOverdue }
      })

      // Combine: pending deliveries first, then pickups
      const pendingDeliveries = deliveries
        .filter(d => d.status === 'confirmed')
        .map(d => ({ ...d, isDelivery: true }))

      const allStops = [...pendingDeliveries, ...pickups]
      setStops(allStops)
    } catch (error) {
      console.error('Error fetching stops:', error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchStops()
    }
  }, [fetchStops, isAuthenticated])

  const updateStatus = async (id, newStatus) => {
    setUpdating(id)
    try {
      const updates = {
        status: newStatus,
        ...(newStatus === 'delivered' && { delivered_at: new Date().toISOString() }),
        ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
      }

      await fetch(
        `${config.supabase.url}/rest/v1/bookings?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
          body: JSON.stringify(updates),
        }
      )

      // Customer delivery SMS is sent by the server-side booking webhook,
      // not from this driver client (which only has the anon key). Nothing
      // to do here — fetchStops() will reflect the new status.

      fetchStops()
    } catch (error) {
      logger.error('Driver stop update failed', error, { stopId: id, newStatus })
    }
    setUpdating(null)
  }

  const openMaps = (stop) => {
    if (stop.placement_lat && stop.placement_lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.placement_lat},${stop.placement_lng}`, '_blank', 'noopener,noreferrer')
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`, '_blank', 'noopener,noreferrer')
    }
  }

  const openAllInMaps = () => {
    if (stops.length === 0) return
    const addresses = stops.map(s => encodeURIComponent(s.address)).join('/')
    window.open(`https://www.google.com/maps/dir/${addresses}`, '_blank', 'noopener,noreferrer')
  }

  const getDumpster = (sizeId) => {
    return config.dumpsters.find(d => d.id === sizeId) || { name: sizeId, shortName: sizeId }
  }

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-12 h-12 text-dark-400 mx-auto mb-4" />
          <p className="text-dark-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 sticky top-0 z-10 safe-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="w-6 h-6 text-primary-400" />
                Today's Stops
              </h1>
              <p className="text-dark-400 text-sm">
                {stops.length} stop{stops.length !== 1 ? 's' : ''} remaining
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchStops}
                disabled={loading}
                className="p-3 bg-dark-700 rounded-xl"
                aria-label="Refresh stops"
              >
                <RefreshCw className={`w-5 h-5 text-dark-300 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
              {stops.length > 0 && (
                <button
                  type="button"
                  onClick={openAllInMaps}
                  className="p-3 bg-primary/20 rounded-xl"
                  aria-label="Open all stops in Maps"
                >
                  <Navigation className="w-5 h-5 text-primary-400" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stops List */}
      <div className="p-4 space-y-4 pb-20">
        {loading && stops.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : stops.length === 0 ? (
          <div className="text-center py-12 bg-dark-800 rounded-xl">
            <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">All Done!</h2>
            <p className="text-dark-400">No more stops for today.</p>
          </div>
        ) : (
          stops.map((stop, index) => {
            const dumpster = getDumpster(stop.dumpster_size)
            const isUpdating = updating === stop.id
            
            return (
              <div
                key={stop.id}
                className={`bg-dark-800 rounded-xl overflow-hidden border ${
                  stop.isOverdue 
                    ? 'border-red-500/50' 
                    : stop.isPickup 
                    ? 'border-orange-500/30' 
                    : 'border-dark-700'
                }`}
              >
                {/* Stop Header */}
                <div className={`px-4 py-3 flex items-center justify-between ${
                  stop.isOverdue 
                    ? 'bg-red-500/10' 
                    : stop.isPickup 
                    ? 'bg-orange-500/10' 
                    : 'bg-primary/10'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">{index + 1}</span>
                    <div>
                      <span className={`text-sm font-semibold ${
                        stop.isOverdue 
                          ? 'text-red-400' 
                          : stop.isPickup 
                          ? 'text-orange-400' 
                          : 'text-primary-400'
                      }`}>
                        {stop.isOverdue && '⚠️ OVERDUE '}
                        {stop.isPickup ? 'PICKUP' : 'DELIVERY'}
                      </span>
                      <p className="text-white font-medium">{dumpster.shortName}</p>
                    </div>
                  </div>
                  <Package className={`w-8 h-8 ${
                    stop.isPickup ? 'text-orange-400' : 'text-primary-400'
                  }`} />
                </div>

                {/* Stop Details */}
                <div className="p-4 space-y-3">
                  {/* Address */}
                  <button
                    onClick={() => openMaps(stop)}
                    className="w-full flex items-start gap-3 text-left"
                  >
                    <MapPin className="w-5 h-5 text-dark-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{stop.address}</p>
                      {stop.placement_notes && (
                        <p className="text-dark-400 text-sm mt-1">📌 {stop.placement_notes}</p>
                      )}
                    </div>
                    <Navigation className="w-5 h-5 text-primary-400 flex-shrink-0" />
                  </button>

                  {/* Customer Info */}
                  {stop.customer_name && stop.customer_name !== 'Manual Entry' && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-dark-400" />
                      <span className="text-white">{stop.customer_name}</span>
                    </div>
                  )}

                  {/* Phone */}
                  {stop.customer_phone && (
                    <a
                      href={`tel:${stop.customer_phone}`}
                      className="flex items-center gap-3"
                    >
                      <Phone className="w-5 h-5 text-dark-400" />
                      <span className="text-primary-400">{stop.customer_phone}</span>
                    </a>
                  )}
                </div>

                {/* Action Button */}
                <div className="p-4 pt-0">
                  <button
                    onClick={() => updateStatus(stop.id, stop.isPickup ? 'completed' : 'delivered')}
                    disabled={isUpdating}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                      isUpdating
                        ? 'bg-dark-600 text-dark-400'
                        : stop.isPickup
                        ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98]'
                        : 'bg-green-500 hover:bg-green-600 text-white active:scale-[0.98]'
                    }`}
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-6 h-6" />
                        {stop.isPickup ? 'PICKED UP' : 'DELIVERED'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Quick Stats Footer */}
      {stops.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 px-4 py-3 safe-bottom">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-primary-400">
                {stops.filter(s => !s.isPickup).length}
              </p>
              <p className="text-xs text-dark-400">Deliveries</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">
                {stops.filter(s => s.isPickup && !s.isOverdue).length}
              </p>
              <p className="text-xs text-dark-400">Pickups</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">
                {stops.filter(s => s.isOverdue).length}
              </p>
              <p className="text-xs text-dark-400">Overdue</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
