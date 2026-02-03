'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import {
  Truck,
  Package,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

export default function FleetPage() {
  const [fleet, setFleet] = useState(config.fleet || {})
  const [availability, setAvailability] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchAvailability()
  }, [selectedDate])

  const fetchAvailability = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/availability?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
      }
    } catch (err) {
      console.error('Error fetching availability:', err)
    }
    setLoading(false)
  }

  const totalDumpsters = Object.values(fleet).reduce((a, b) => a + b, 0)

  // Get availability status color
  const getStatusColor = (available, total) => {
    if (available === 0) return 'text-red-400'
    if (available <= Math.ceil(total * 0.25)) return 'text-amber-400'
    return 'text-green-400'
  }

  const getStatusBg = (available, total) => {
    if (available === 0) return 'bg-red-500/20'
    if (available <= Math.ceil(total * 0.25)) return 'bg-amber-500/20'
    return 'bg-green-500/20'
  }

  const getStatusIcon = (available, total) => {
    if (available === 0) return <AlertTriangle className="w-5 h-5 text-red-400" />
    if (available <= Math.ceil(total * 0.25)) return <AlertTriangle className="w-5 h-5 text-amber-400" />
    return <CheckCircle2 className="w-5 h-5 text-green-400" />
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="w-6 h-6 text-primary" />
                Fleet Inventory
              </h1>
              <p className="text-sm text-dark-400">
                View availability and manage your fleet
              </p>
            </div>
            <button
              onClick={fetchAvailability}
              disabled={loading}
              className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-dark-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Date Selector */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-dark-400" />
            <span className="text-dark-300 text-sm font-medium">Check availability for:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Fleet Summary */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden mb-6">
          <div className="bg-primary/10 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-primary" />
              <span className="font-semibold text-white">Total Fleet</span>
            </div>
            <span className="text-2xl font-bold text-primary">{totalDumpsters} Dumpsters</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {Object.entries(fleet).map(([size, count]) => {
                const dumpster = config.dumpsters?.find(d => d.id === size)
                const avail = availability[size] || { available: count, booked: 0, total: count }
                const statusColor = getStatusColor(avail.available, count)
                const statusBg = getStatusBg(avail.available, count)

                return (
                  <div key={size} className="px-6 py-4 flex items-center justify-between hover:bg-dark-750 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${statusBg} rounded-lg flex items-center justify-center`}>
                        <Truck className={`w-6 h-6 ${statusColor}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{dumpster?.name || size}</p>
                        <p className="text-sm text-dark-400">
                          {dumpster?.dimensions?.display || 'Roll-off container'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {/* Availability Bar */}
                      <div className="hidden md:block w-32">
                        <div className="flex justify-between text-xs text-dark-400 mb-1">
                          <span>Available</span>
                          <span>{avail.available}/{count}</span>
                        </div>
                        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${avail.available === 0 ? 'bg-red-500' : avail.available <= Math.ceil(count * 0.25) ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${(avail.available / count) * 100}%` }}
                          />
                        </div>
                      </div>
                      {/* Status Badge */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusBg}`}>
                        {getStatusIcon(avail.available, count)}
                        <span className={`text-sm font-medium ${statusColor}`}>
                          {avail.available === 0 ? 'Sold Out' : `${avail.available} Available`}
                        </span>
                      </div>
                      {/* Total Count */}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{count}</p>
                        <p className="text-xs text-dark-500">total</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex gap-4">
          <Link
            href="/admin/capacity"
            className="flex-1 bg-dark-800 border border-dark-700 rounded-xl p-4 hover:border-primary/50 hover:bg-dark-750 transition-colors text-center"
          >
            <Package className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-medium text-white">View Capacity Calendar</p>
            <p className="text-sm text-dark-400">See daily availability</p>
          </Link>
          <Link
            href="/admin"
            className="flex-1 bg-dark-800 border border-dark-700 rounded-xl p-4 hover:border-primary/50 hover:bg-dark-750 transition-colors text-center"
          >
            <Truck className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-medium text-white">Manage Bookings</p>
            <p className="text-sm text-dark-400">View all orders</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
