'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { config } from '../../../config'
import {
  FileText,
  Calendar,
  MapPin,
  Truck,
  Phone,
  Mail,
  CreditCard,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Printer,
  Download
} from 'lucide-react'

export default function CustomerInvoicePage() {
  const params = useParams()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchInvoice()
    markAsViewed()
  }, [params.id])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/invoices?invoice_number=eq.${params.id}`,
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
          setInvoice(data[0])
        } else {
          setError('Invoice not found')
        }
      } else {
        setError('Failed to load invoice')
      }
    } catch (err) {
      setError('Error loading invoice')
      console.error(err)
    }
    setLoading(false)
  }

  const markAsViewed = async () => {
    try {
      await fetch(
        `${config.supabase.url}/rest/v1/invoices?invoice_number=eq.${params.id}&status=eq.sent`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
          body: JSON.stringify({
            status: 'viewed',
            viewed_at: new Date().toISOString()
          }),
        }
      )
    } catch (err) {
      console.error('Error marking as viewed:', err)
    }
  }

  const handlePayNow = async () => {
    setPaying(true)
    try {
      const response = await fetch('/api/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.payment_url) {
          window.location.href = data.payment_url
        }
      } else {
        alert('Failed to create payment link')
      }
    } catch (err) {
      console.error('Error creating payment:', err)
      alert('Error processing payment')
    }
    setPaying(false)
  }

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format((cents || 0) / 100)
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

  const isOverdue = invoice?.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'paid'
  const isPaid = invoice?.status === 'paid'

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">{error}</h1>
          <p className="text-neutral-600">Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  const lineItems = invoice.line_items || []

  return (
    <div className="min-h-screen bg-neutral-100 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto px-4">
        {/* Action Buttons - Hidden on print */}
        <div className="flex justify-between items-center mb-4 print:hidden">
          <div>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                Overdue
              </span>
            )}
            {isPaid && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Paid
              </span>
            )}
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="bg-primary text-white p-6 print:bg-white print:text-black print:border-b-2 print:border-black">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">{config.businessName}</h1>
                <p className="text-white/80 print:text-neutral-600">{config.phone}</p>
                {config.email && <p className="text-white/80 print:text-neutral-600">{config.email}</p>}
              </div>
              <div className="text-right">
                <p className="text-white/60 print:text-neutral-500 text-sm">INVOICE</p>
                <p className="text-xl font-bold font-mono">{invoice.invoice_number}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Status Banner */}
            {isPaid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Paid in Full</p>
                  <p className="text-sm text-green-600">{formatDate(invoice.paid_at)}</p>
                </div>
              </div>
            )}

            {isOverdue && !isPaid && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">Payment Overdue</p>
                  <p className="text-sm text-red-600">Was due {formatDate(invoice.due_date)}</p>
                </div>
              </div>
            )}

            {/* Bill To & Invoice Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Bill To</h2>
                <p className="font-semibold text-lg">{invoice.customer_name}</p>
                {invoice.customer_address && <p className="text-neutral-600">{invoice.customer_address}</p>}
                {invoice.customer_phone && (
                  <p className="text-neutral-600 flex items-center gap-1 mt-1">
                    <Phone className="w-4 h-4" /> {invoice.customer_phone}
                  </p>
                )}
                {invoice.customer_email && (
                  <p className="text-neutral-600 flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {invoice.customer_email}
                  </p>
                )}
              </div>
              <div className="md:text-right">
                <div className="space-y-1">
                  <div className="flex md:justify-end gap-2">
                    <span className="text-neutral-500">Invoice Date:</span>
                    <span className="font-medium">{formatDate(invoice.invoice_date || invoice.created_at)}</span>
                  </div>
                  <div className="flex md:justify-end gap-2">
                    <span className="text-neutral-500">Due Date:</span>
                    <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                      {formatDate(invoice.due_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Details */}
            {(invoice.service_address || invoice.dumpster_size) && (
              <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Service Details</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {invoice.service_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-neutral-500">Service Address</p>
                        <p className="font-medium">{invoice.service_address}</p>
                      </div>
                    </div>
                  )}
                  {invoice.dumpster_size && (
                    <div className="flex items-start gap-2">
                      <Truck className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-neutral-500">Dumpster</p>
                        <p className="font-medium">{invoice.dumpster_size}</p>
                        {invoice.rental_duration && <p className="text-sm text-neutral-500">{invoice.rental_duration}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-neutral-200">
                    <th className="text-left py-3 text-sm font-semibold text-neutral-500">Description</th>
                    <th className="text-right py-3 text-sm font-semibold text-neutral-500 w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-3">{item.description}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(item.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t-2 border-neutral-200 pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(invoice.subtotal_cents)}</span>
                  </div>
                  {invoice.discount_cents > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(invoice.discount_cents)}</span>
                    </div>
                  )}
                  {invoice.tax_cents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Tax</span>
                      <span className="font-medium">{formatCurrency(invoice.tax_cents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-neutral-200">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total_cents)}</span>
                  </div>
                  {invoice.amount_paid_cents > 0 && invoice.amount_paid_cents < invoice.total_cents && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Paid</span>
                        <span>-{formatCurrency(invoice.amount_paid_cents)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-primary">
                        <span>Balance Due</span>
                        <span>{formatCurrency(invoice.balance_due_cents)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500 mb-1">Notes</p>
                <p className="text-neutral-700">{invoice.notes}</p>
              </div>
            )}

            {/* Pay Now Button - Hidden when paid or on print */}
            {!isPaid && invoice.balance_due_cents > 0 && (
              <div className="mt-8 print:hidden">
                <button
                  onClick={handlePayNow}
                  disabled={paying}
                  className="w-full py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay {formatCurrency(invoice.balance_due_cents)} Now
                    </>
                  )}
                </button>
                <p className="text-center text-sm text-neutral-500 mt-2">
                  Secure payment via Stripe
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-neutral-200 text-center text-sm text-neutral-500">
              <p>Thank you for your business!</p>
              <p className="mt-1">{config.businessName} • {config.phone}</p>
            </div>
          </div>
        </div>

        {/* Questions - Hidden on print */}
        <div className="mt-6 text-center text-neutral-600 print:hidden">
          <p>Questions about this invoice?</p>
          <a href={`tel:${config.phone}`} className="text-primary font-medium hover:underline">
            Call {config.phone}
          </a>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
