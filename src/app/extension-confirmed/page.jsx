'use client'

import { CheckCircle, Phone, Home, Calendar } from 'lucide-react'
import Link from 'next/link'
import { config } from '../../config'

export default function ExtensionConfirmedPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-10 h-10 text-green-400" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Extension Confirmed!
        </h1>
        <p className="text-dark-300 text-lg mb-8">
          Your rental has been extended. Keep filling that dumpster!
        </p>

        {/* Info Box */}
        <div className="bg-dark-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Extra days added to your rental</span>
          </div>
          <p className="text-dark-400 text-sm">
            You'll receive a text reminder the day before your new pickup date.
          </p>
        </div>

        {/* SMS Commands Reminder */}
        <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 mb-8">
          <p className="text-dark-300 text-sm">
            <strong className="text-white">Need anything else?</strong> Just text us:
          </p>
          <p className="text-dark-400 text-sm mt-2">
            <code className="text-primary-400">STATUS</code> to check dates &bull; 
            <code className="text-primary-400"> PICKUP</code> when you're ready
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/" className="btn-primary w-full flex items-center justify-center gap-2">
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          
          <a 
            href={`tel:${config.phoneRaw}`}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            Questions? Call {config.phone}
          </a>
        </div>
      </div>
    </div>
  )
}
