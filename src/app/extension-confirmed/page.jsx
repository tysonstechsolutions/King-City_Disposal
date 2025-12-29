'use client'

import { CheckCircle, Phone, Home, Calendar } from 'lucide-react'
import Link from 'next/link'
import { config } from '../../config'

export default function ExtensionConfirmedPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-10 h-10 text-green-600" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-neutral-900 mb-3">
          Extension Confirmed!
        </h1>
        <p className="text-neutral-600 text-lg mb-8">
          Your rental has been extended. Keep filling that dumpster!
        </p>

        {/* Info Box */}
        <div className="bg-white rounded-xl p-6 mb-8 border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Extra days added to your rental</span>
          </div>
          <p className="text-neutral-500 text-sm">
            You'll receive a text reminder the day before your new pickup date.
          </p>
        </div>

        {/* SMS Commands Reminder */}
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-8">
          <p className="text-neutral-700 text-sm">
            <strong className="text-neutral-900">Need anything else?</strong> Just text us:
          </p>
          <p className="text-neutral-600 text-sm mt-2">
            <code className="text-primary-600 font-medium">STATUS</code> to check dates &bull;
            <code className="text-primary-600 font-medium"> PICKUP</code> when you're ready
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5 inline mr-2" />
            Back to Home
          </Link>

          <a
            href={`tel:${config.phoneRaw}`}
            className="block w-full bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Phone className="w-5 h-5 inline mr-2" />
            Questions? Call {config.phone}
          </a>
        </div>
      </div>
    </div>
  )
}
