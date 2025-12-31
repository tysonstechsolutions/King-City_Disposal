'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import {
  Truck,
  Package,
  AlertCircle,
  Info
} from 'lucide-react'

export default function FleetPage() {
  const [fleet, setFleet] = useState({})

  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') !== 'true') {
      window.location.href = '/admin'
      return
    }
    // Load fleet from config
    setFleet(config.fleet || {})
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
                        {dumpster?.dimensions || 'Roll-off container'}
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

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">How Fleet Inventory Works</p>
              <p className="text-sm text-blue-700 mt-1">
                Fleet sizes are configured in <code className="bg-blue-100 px-1 rounded">src/config.js</code> under
                the <code className="bg-blue-100 px-1 rounded">fleet</code> property. When a customer books
                a dumpster, the system checks availability based on delivery date, rental duration, and
                existing bookings to prevent overbooking.
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-neutral-400" />
            To Update Fleet Size
          </h2>
          <ol className="space-y-3 text-neutral-700">
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
              <span>Open <code className="bg-neutral-100 px-2 py-0.5 rounded text-sm">src/config.js</code> in your code editor</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
              <span>Find the <code className="bg-neutral-100 px-2 py-0.5 rounded text-sm">fleet</code> object</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
              <span>Update the count for each dumpster size</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
              <span>Save and redeploy your site</span>
            </li>
          </ol>

          <div className="mt-6 bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-500 mb-2">Example configuration:</p>
            <pre className="text-sm text-neutral-700 font-mono bg-neutral-100 p-3 rounded overflow-x-auto">
{`fleet: {
  '20yd': 3,  // 3 twenty-yard dumpsters
  '30yd': 2,  // 2 thirty-yard dumpsters
}`}
            </pre>
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
