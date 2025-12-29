'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Phone, Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { config } from '../../config'

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading...</p>
      </div>
    </div>
  )
}

// Inner component that uses useSearchParams
function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-neutral-900 mb-3">
          Payment Successful!
        </h1>
        <p className="text-neutral-600 text-lg mb-8">
          Thank you for your payment. Your booking is confirmed.
        </p>

        {/* What's Next */}
        <div className="bg-white rounded-xl p-6 mb-8 text-left border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">What happens next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-neutral-900 font-medium">Confirmation Text</p>
                <p className="text-neutral-500 text-sm">You'll receive a text confirming your delivery details.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-neutral-900 font-medium">Day-Before Reminder</p>
                <p className="text-neutral-500 text-sm">We'll text you the day before delivery with timing.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-600 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-neutral-900 font-medium">Delivery Day</p>
                <p className="text-neutral-500 text-sm">We'll drop off your dumpster at the specified location.</p>
              </div>
            </div>
          </div>
        </div>

        {/* SMS Commands Tip */}
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-8">
          <p className="text-neutral-700 text-sm">
            <strong className="text-neutral-900">Pro tip:</strong> During your rental, you can text us:
          </p>
          <p className="text-neutral-600 text-sm mt-2">
            <code className="text-primary-600 font-medium">STATUS</code> to check your rental &bull;
            <code className="text-primary-600 font-medium"> EXTEND</code> for more days &bull;
            <code className="text-primary-600 font-medium"> PICKUP</code> when you're done early
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

        {/* Booking Reference */}
        {bookingId && (
          <p className="text-neutral-400 text-sm mt-6">
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
