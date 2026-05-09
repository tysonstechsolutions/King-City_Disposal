'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Phone, Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { config } from '../../config'
import { trackPurchase } from '../../lib/analytics'

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
        <p className="text-dark-400">Loading...</p>
      </div>
    </div>
  )
}

// Inner component that uses useSearchParams
function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')
  const sessionId = searchParams.get('session_id')
  const fired = useRef(false)

  // Fire the purchase event exactly once when this page loads. This is the
  // single most important conversion event — it tells the owner (and any
  // ad platform CAPI) that a customer actually paid. The dollar amount comes
  // from the `amount` query param that the Stripe success_url passes through
  // so we don't need a server lookup or expose data via an API.
  useEffect(() => {
    if (fired.current) return
    if (!bookingId && !sessionId) return
    fired.current = true

    const amountParam = searchParams.get('amount')
    const valueDollars = amountParam ? Number(amountParam) / 100 : undefined

    trackPurchase({
      transactionId: bookingId || sessionId,
      valueDollars: Number.isFinite(valueDollars) ? valueDollars : undefined,
      currency: 'USD',
    })
  }, [bookingId, sessionId, searchParams])

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Payment Successful!
        </h1>
        <p className="text-dark-300 text-lg mb-8">
          Thank you for your payment. Your booking is confirmed.
        </p>

        {/* What's Next */}
        <div className="bg-dark-900 rounded-xl p-6 mb-8 text-left border border-dark-700 shadow-sm">
          <h2 className="text-lg font-semibold text-white mb-4">What happens next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Confirmation Text</p>
                <p className="text-dark-400 text-sm">You'll receive a text confirming your delivery details.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Day-Before Reminder</p>
                <p className="text-dark-400 text-sm">We'll text you the day before delivery with timing.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Delivery Day</p>
                <p className="text-dark-400 text-sm">We'll drop off your dumpster at the specified location.</p>
              </div>
            </div>
          </div>
        </div>

        {/* SMS Commands Tip */}
        <div className="bg-primary/10 border border-primary-200 rounded-xl p-4 mb-8">
          <p className="text-dark-200 text-sm">
            <strong className="text-white">Pro tip:</strong> During your rental, you can text us:
          </p>
          <p className="text-dark-300 text-sm mt-2">
            <code className="text-primary font-medium">STATUS</code> to check your rental &bull;
            <code className="text-primary font-medium"> EXTEND</code> for more days &bull;
            <code className="text-primary font-medium"> PICKUP</code> when you're done early
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5 inline mr-2" />
            Back to Home
          </Link>

          <a
            href={`tel:${config.phoneRaw}`}
            className="block w-full bg-neutral-200 hover:bg-neutral-300 text-dark-200 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Phone className="w-5 h-5 inline mr-2" />
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
