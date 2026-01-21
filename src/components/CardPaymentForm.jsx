'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react'

// Initialize Stripe outside component to avoid recreating on re-render
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

// Inner form component that uses Stripe hooks
function CheckoutForm({ amountCents, onSuccess, onError, customerName, customerEmail }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [elementReady, setElementReady] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setMessage('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // Won't redirect for card payments
        payment_method_data: {
          billing_details: {
            name: customerName || undefined,
            email: customerEmail || undefined,
          },
        },
      },
      redirect: 'if_required',
    })

    if (error) {
      setMessage(error.message)
      onError?.(error)
      setIsProcessing(false)
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Payment successful!')
      onSuccess?.(paymentIntent)
    } else {
      setMessage('Payment processing...')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!elementReady && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-dark-300">Loading payment form...</span>
        </div>
      )}
      <div className={elementReady ? '' : 'opacity-0 h-0 overflow-hidden'}>
        <PaymentElement
          options={{
            layout: 'accordion',
            defaultCollapsed: false,
            radios: false,
            spacedAccordionItems: true,
          }}
          onReady={() => setElementReady(true)}
        />
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          message.includes('successful')
            ? 'bg-green-900/30 text-green-400 border border-green-700'
            : 'bg-red-900/30 text-red-400 border border-red-700'
        }`}>
          {message.includes('successful') ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elementReady || isProcessing}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Charge ${(amountCents / 100).toFixed(2)}
          </>
        )}
      </button>
    </form>
  )
}

// Main wrapper component
export default function CardPaymentForm({
  amountCents,
  customerName,
  customerEmail,
  invoiceId,
  description,
  onSuccess,
  onError,
  onCancel,
}) {
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Create PaymentIntent when component mounts
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/stripe/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount_cents: amountCents,
            customer_name: customerName,
            customer_email: customerEmail,
            invoice_id: invoiceId,
            description,
          }),
        })

        const data = await response.json()

        if (data.error) {
          setError(data.error)
        } else {
          setClientSecret(data.clientSecret)
        }
      } catch (err) {
        setError('Failed to initialize payment')
        console.error(err)
      }
      setLoading(false)
    }

    if (amountCents >= 50) {
      createPaymentIntent()
    } else {
      setError('Amount must be at least $0.50')
      setLoading(false)
    }
  }, [amountCents, customerName, customerEmail, invoiceId, description])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stripeKey) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-3 px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600"
          >
            Go Back
          </button>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Payment Error</span>
        </div>
        <p className="text-sm mb-3">{error}</p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600"
          >
            Go Back
          </button>
        )}
      </div>
    )
  }

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#ef4444',
      colorBackground: '#1f2937',
      colorText: '#f3f4f6',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '8px',
    },
  }

  return (
    <div className="space-y-4">
      <div className="bg-dark-700 rounded-lg p-3 text-center">
        <p className="text-sm text-dark-300">Charging</p>
        <p className="text-2xl font-bold text-white">${(amountCents / 100).toFixed(2)}</p>
        {customerName && <p className="text-sm text-dark-400">{customerName}</p>}
      </div>

      {clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance,
          }}
        >
          <CheckoutForm
            amountCents={amountCents}
            onSuccess={onSuccess}
            onError={onError}
            customerName={customerName}
            customerEmail={customerEmail}
          />
        </Elements>
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
