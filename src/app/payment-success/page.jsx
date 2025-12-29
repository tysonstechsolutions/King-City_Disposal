'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Phone, Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { config } from '../../config'

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-primary-400 animate-spin mx-auto mb-4" />
        <p className="text-dark-400">Loading...</p>
      </div>
    </div>
  )
}

// Inner component that uses useSearchParams
function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Payment Successful!
        </h1>
        <p className="text-dark-300 text-lg mb-8">
          Thank you for your payment. Your booking is confirmed.
        </p>

        {/* What's Next */}
        <div className="bg-dark-800 rounded-xl p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold text-white mb-4">What happens next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-400 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Confirmation Text</p>
                <p className="text-dark-400 text-sm">You'll receive a text confirming your delivery details.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-400 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Day-Before Reminder</p>
                <p className="text-dark-400 text-sm">We'll text you the day before delivery with timing.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-400 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Delivery Day</p>
                <p className="text-dark-400 text-sm">We'll drop off your dumpster at the specified location.</p>
              </div>
            </div>
          </div>
        </div>

        {/* SMS Commands Tip */}
        <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 mb-8">
          <p className="text-dark-300 text-sm">
            <strong className="text-white">Pro tip:</strong> During your rental, you can text us:
          </p>
          <p className="text-dark-400 text-sm mt-2">
            <code className="text-primary-400">STATUS</code> to check your rental &bull;
            <code className="text-primary-400"> EXTEND</code> for more days &bull;
            <code className="text-primary-400"> PICKUP</code> when you're done early
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

        {/* Booking Reference */}
        {bookingId && (
          <p className="text-dark-500 text-sm mt-6">
            Booking reference: #{bookingId}
          </p>
        )}
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
