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
    <div className="min-h-screen bg-neutral-50">
      <AdminNav />

      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Truck className="w-6 h-6 text-primary-600" />
                Fleet Inventory
              </h1>
              <p className="text-sm text-neutral-500">
                View your dumpster inventory
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Fleet Summary */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
          <div className="bg-primary-50 border-b border-primary-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-primary-600" />
              <span className="font-semibold text-primary-700">Total Fleet</span>
            </div>
            <span className="text-2xl font-bold text-primary-600">{totalDumpsters} Dumpsters</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {Object.entries(fleet).map(([size, count]) => {
              const dumpster = config.dumpsters?.find(d => d.id === size)
              return (
                <div key={size} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{dumpster?.name || size}</p>
                      <p className="text-sm text-neutral-500">
                        {dumpster?.dimensions?.display || 'Roll-off container'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-neutral-900">{count}</p>
                    <p className="text-sm text-neutral-500">units</p>
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
            className="flex-1 bg-white border border-neutral-200 rounded-xl p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors text-center"
          >
            <Package className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="font-medium text-neutral-900">View Capacity Calendar</p>
            <p className="text-sm text-neutral-500">See daily availability</p>
          </Link>
          <Link
            href="/admin"
            className="flex-1 bg-white border border-neutral-200 rounded-xl p-4 hover:border-primary-300 hover:bg-primary-50 transition-colors text-center"
          >
            <Truck className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="font-medium text-neutral-900">Manage Bookings</p>
            <p className="text-sm text-neutral-500">View all orders</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
