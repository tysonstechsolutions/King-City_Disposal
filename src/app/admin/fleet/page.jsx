'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import {
  Truck,
  Package
} from 'lucide-react'

export default function FleetPage() {
  const [fleet, setFleet] = useState(config.fleet || {})
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (typeof window !== 'undefined' && sessionStorage.getItem('adminAuth') !== 'true') {
      window.location.href = '/admin'
    }
  }, [])

  const totalDumpsters = Object.values(fleet).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="w-6 h-6 text-primary-600" />
                Fleet Inventory
              </h1>
              <p className="text-sm text-dark-400">
                View your dumpster inventory
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Fleet Summary */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden mb-6">
          <div className="bg-primary-50 border-b border-primary-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-primary-600" />
              <span className="font-semibold text-primary-700">Total Fleet</span>
            </div>
            <span className="text-2xl font-bold text-primary-600">{totalDumpsters} Dumpsters</span>
          </div>

          <div className="divide-y divide-dark-700">
            {Object.entries(fleet).map(([size, count]) => {
              const dumpster = config.dumpsters?.find(d => d.id === size)
              return (
                <div key={size} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{dumpster?.name || size}</p>
                      <p className="text-sm text-dark-400">
                        {dumpster?.dimensions?.display || 'Roll-off container'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-sm text-dark-400">units</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex gap-4">
          <Link
            href="/admin/capacity"
            className="flex-1 bg-white border border-dark-700 rounded-xl p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors text-center"
          >
            <Package className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="font-medium text-white">View Capacity Calendar</p>
            <p className="text-sm text-dark-400">See daily availability</p>
          </Link>
          <Link
            href="/admin"
            className="flex-1 bg-white border border-dark-700 rounded-xl p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors text-center"
          >
            <Truck className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="font-medium text-white">Manage Bookings</p>
            <p className="text-sm text-dark-400">View all orders</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
