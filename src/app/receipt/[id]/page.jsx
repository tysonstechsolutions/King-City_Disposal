'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { config } from '../../../config'
import {
  CheckCircle2,
  FileText,
  MapPin,
  Calendar,
  Truck,
  Phone,
  Mail,
  Printer,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react'

export default function ReceiptPage() {
  const params = useParams()
  const [transaction, setTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTransaction()
  }, [params.id])

  const fetchTransaction = async () => {
    try {
      // Fetch by receipt_number (the URL param)
      const response = await fetch(
        `${config.supabase.url}/rest/v1/transactions?receipt_number=eq.${params.id}`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setTransaction(data[0])
        } else {
          setError('Receipt not found')
        }
      } else {
        setError('Failed to load receipt')
      }
    } catch (err) {
      setError('Error loading receipt')
      console.error(err)
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">{error}</h1>
          <p className="text-dark-300">Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const getTypeLabel = (type) => {
    const labels = {
      booking: 'Dumpster Rental',
      extension: 'Rental Extension',
      overage: 'Weight Overage',
      late_fee: 'Late Fee',
      custom: 'Service'
    }
    return labels[type] || 'Service'
  }

  return (
    <div className="min-h-screen bg-dark-800 py-8 print:bg-dark-900 print:py-0">
      <div className="max-w-2xl mx-auto px-4">
        {/* Print Button - Hidden on print */}
        <div className="flex justify-end mb-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>

        {/* Receipt Card */}
        <div className="bg-dark-900 rounded-xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="bg-primary text-white p-6 print:bg-dark-900 print:text-black print:border-b-2 print:border-black">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{config.businessName}</h1>
                <p className="text-white/80 print:text-dark-300">{config.phone}</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-white/80 print:text-primary" />
            </div>
          </div>

          {/* Receipt Content */}
          <div className="p-6">
            {/* Payment Confirmed Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">Payment Confirmed</p>
                <p className="text-sm text-green-600">{formatDate(transaction.paid_at)}</p>
              </div>
            </div>

            {/* Receipt Number & Amount */}
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-dark-700">
              <div>
                <p className="text-sm text-dark-400 mb-1">Receipt Number</p>
                <p className="text-lg font-mono font-semibold">{transaction.receipt_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-dark-400 mb-1">Amount Paid</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(transaction.amount_cents)}</p>
              </div>
            </div>

            {/* Service Details */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wide mb-3">
                Service Details
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-dark-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{getTypeLabel(transaction.type)}</p>
                    {transaction.description && (
                      <p className="text-sm text-dark-300">{transaction.description}</p>
                    )}
                  </div>
                </div>

                {transaction.dumpster_size && (
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-dark-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{transaction.dumpster_size}</p>
                      {transaction.rental_duration && (
                        <p className="text-sm text-dark-300">{transaction.rental_duration} rental</p>
                      )}
                    </div>
                  </div>
                )}

                {transaction.service_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-dark-500 flex-shrink-0 mt-0.5" />
                    <p>{transaction.service_address}</p>
                  </div>
                )}

                {transaction.delivery_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-dark-500 flex-shrink-0 mt-0.5" />
                    <p>Delivery: {formatDate(transaction.delivery_date)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6 pb-6 border-b border-dark-700">
              <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wide mb-3">
                Customer
              </h2>

              <div className="space-y-2">
                <p className="font-medium">{transaction.customer_name}</p>
                {transaction.customer_phone && (
                  <div className="flex items-center gap-2 text-sm text-dark-300">
                    <Phone className="w-4 h-4" />
                    {transaction.customer_phone}
                  </div>
                )}
                {transaction.customer_email && (
                  <div className="flex items-center gap-2 text-sm text-dark-300">
                    <Mail className="w-4 h-4" />
                    {transaction.customer_email}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wide mb-3">
                Payment Information
              </h2>

              <div className="bg-dark-800 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-dark-300">Method</span>
                  <span className="font-medium capitalize">{transaction.payment_method || 'Card'}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-300">Status</span>
                  <span className="font-medium text-green-600 capitalize">{transaction.status}</span>
                </div>
                {transaction.stripe_payment_intent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Reference</span>
                    <span className="font-mono text-dark-400">
                      {transaction.stripe_payment_intent.slice(-8)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-dark-400 pt-4 border-t border-dark-700">
              <p className="mb-1">Thank you for your business!</p>
              <p>{config.businessName} • {config.phone}</p>
              {config.email && <p>{config.email}</p>}
            </div>
          </div>
        </div>

        {/* Questions Section - Hidden on print */}
        <div className="mt-6 text-center text-dark-300 print:hidden">
          <p>Questions about your receipt?</p>
          <a href={`tel:${config.phone}`} className="text-primary font-medium hover:underline">
            Call {config.phone}
          </a>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
