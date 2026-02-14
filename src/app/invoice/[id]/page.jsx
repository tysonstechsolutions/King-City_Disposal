'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
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
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Check if invoice is overdue: 30 days past date_set (dumpster delivery date)
  const getIsOverdue = () => {
    if (!invoice || invoice.status === 'paid') return false
    const refDate = invoice.date_set || invoice.invoice_date || invoice.created_at
    if (!refDate) return false
    const overdueDate = new Date(refDate)
    overdueDate.setDate(overdueDate.getDate() + 30)
    return new Date() > overdueDate
  }

  const isOverdue = getIsOverdue()
  const isPaid = invoice?.status === 'paid'

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

  const lineItems = typeof invoice.line_items === 'string'
    ? JSON.parse(invoice.line_items)
    : (invoice.line_items || [])

  const balanceDue = invoice.total_cents - (invoice.amount_paid_cents || 0)

  return (
    <div className="min-h-screen bg-dark-800 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto px-4 print:px-0 print:max-w-none">
        {/* Action Buttons - Hidden on print */}
        <div className="flex justify-between items-center mb-4 print:hidden">
          <div>
            {isOverdue && !isPaid && (
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
            {!isPaid && !isOverdue && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                Payment Due
              </span>
            )}
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg hover:bg-dark-800"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>

        {/* Invoice Card */}
        <div className="bg-dark-900 rounded-xl shadow-lg overflow-hidden print:bg-white print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="bg-primary text-white p-6 print:bg-white print:text-black print:p-0 print:mb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="hidden print:block">
                  <Image src="/images/logo.png" alt="King City Disposal" width={60} height={60} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold print:text-xl">{config.businessName}</h1>
                  <p className="text-white/80 print:text-gray-600 text-sm">{config.phone}</p>
                  {config.email && <p className="text-white/80 print:text-gray-600 text-sm">{config.email}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 print:text-gray-500 text-sm font-semibold tracking-wider">INVOICE</p>
                <p className="text-xl font-bold font-mono print:text-lg">{invoice.invoice_number}</p>
              </div>
            </div>
          </div>

          <div className="p-6 print:p-0">
            {/* Status Banner - screen only for paid/overdue, print shows simple text */}
            {isPaid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3 print:bg-white print:border print:border-gray-300 print:rounded print:p-2 print:mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 print:w-4 print:h-4 print:text-black" />
                <div>
                  <p className="font-semibold text-green-800 print:text-black print:text-sm">Paid in Full</p>
                  <p className="text-sm text-green-600 print:text-gray-600 print:text-xs">{formatDate(invoice.paid_at)}</p>
                </div>
              </div>
            )}

            {isOverdue && !isPaid && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3 print:bg-white print:border print:border-gray-400 print:rounded print:p-2 print:mb-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 print:w-4 print:h-4 print:text-black" />
                <div>
                  <p className="font-semibold text-red-800 print:text-black print:text-sm">Payment Overdue</p>
                  <p className="text-sm text-red-600 print:text-gray-600 print:text-xs">
                    {invoice.due_date
                      ? `Was due ${formatDate(invoice.due_date)}`
                      : 'Please pay as soon as possible'}
                  </p>
                </div>
              </div>
            )}

            {/* Bill To & Invoice Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-8 print:gap-4 print:mb-4">
              <div>
                <h2 className="text-sm font-semibold text-dark-400 print:text-gray-500 uppercase tracking-wide mb-2 print:mb-1 print:text-xs">Bill To</h2>
                <p className="font-semibold text-lg print:text-sm print:font-bold">{invoice.customer_name}</p>
                {invoice.customer_address && <p className="text-dark-300 print:text-gray-700 print:text-sm">{invoice.customer_address}</p>}
                {invoice.customer_phone && (
                  <p className="text-dark-300 print:text-gray-700 flex items-center gap-1 mt-1 print:text-sm">
                    <Phone className="w-4 h-4 print:w-3 print:h-3" /> {invoice.customer_phone}
                  </p>
                )}
                {invoice.customer_email && (
                  <p className="text-dark-300 print:text-gray-700 flex items-center gap-1 print:text-sm">
                    <Mail className="w-4 h-4 print:w-3 print:h-3" /> {invoice.customer_email}
                  </p>
                )}
              </div>
              <div className="md:text-right">
                <div className="space-y-1 print:text-sm">
                  <div className="flex md:justify-end gap-2">
                    <span className="text-dark-400 print:text-gray-500">Invoice Date:</span>
                    <span className="font-medium print:text-black">{formatDate(invoice.invoice_date || invoice.created_at)}</span>
                  </div>
                  <div className="flex md:justify-end gap-2">
                    <span className="text-dark-400 print:text-gray-500">Due:</span>
                    <span className="font-medium print:text-black">
                      {invoice.due_date ? formatDate(invoice.due_date) : 'Due Upon Receipt'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Details */}
            {(invoice.service_address || invoice.dumpster_size) && (
              <div className="bg-dark-800 rounded-lg p-4 mb-6 print:bg-white print:border print:border-gray-200 print:rounded print:p-2 print:mb-4">
                <h2 className="text-sm font-semibold text-dark-400 print:text-gray-500 uppercase tracking-wide mb-3 print:mb-1 print:text-xs">Service Details</h2>
                <div className="grid md:grid-cols-2 gap-4 print:gap-2 print:text-sm">
                  {invoice.service_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-dark-500 print:text-gray-400 flex-shrink-0 mt-0.5 print:w-3 print:h-3" />
                      <div>
                        <p className="text-sm text-dark-400 print:text-gray-500 print:text-xs">Address</p>
                        <p className="font-medium print:text-black print:text-sm">{invoice.service_address}</p>
                      </div>
                    </div>
                  )}
                  {invoice.dumpster_size && (
                    <div className="flex items-start gap-2">
                      <Truck className="w-5 h-5 text-dark-500 print:text-gray-400 flex-shrink-0 mt-0.5 print:w-3 print:h-3" />
                      <div>
                        <p className="text-sm text-dark-400 print:text-gray-500 print:text-xs">Dumpster</p>
                        <p className="font-medium print:text-black print:text-sm">{invoice.dumpster_size}</p>
                        {invoice.rental_duration && <p className="text-sm text-dark-400 print:text-gray-500 print:text-xs">{invoice.rental_duration}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="mb-6 print:mb-3">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-dark-700 print:border-gray-400">
                    <th className="text-left py-3 print:py-1 text-sm font-semibold text-dark-400 print:text-gray-600 print:text-xs">Description</th>
                    <th className="text-right py-3 print:py-1 text-sm font-semibold text-dark-400 print:text-gray-600 w-32 print:text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 print:divide-gray-200">
                  {lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="py-3 print:py-1.5 print:text-sm print:text-black">{item.description}</td>
                      <td className="py-3 print:py-1.5 text-right font-medium print:text-sm print:text-black">{formatCurrency(item.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t-2 border-dark-700 print:border-gray-400 pt-4 print:pt-2">
              <div className="flex justify-end">
                <div className="w-64 space-y-2 print:space-y-1 print:text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-300 print:text-gray-600">Subtotal</span>
                    <span className="font-medium print:text-black">{formatCurrency(invoice.subtotal_cents)}</span>
                  </div>
                  {invoice.discount_cents > 0 && (
                    <div className="flex justify-between text-green-600 print:text-black">
                      <span>Discount</span>
                      <span>-{formatCurrency(invoice.discount_cents)}</span>
                    </div>
                  )}
                  {invoice.tax_cents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-dark-300 print:text-gray-600">Tax</span>
                      <span className="font-medium print:text-black">{formatCurrency(invoice.tax_cents)}</span>
                    </div>
                  )}
                  {invoice.late_fee_cents > 0 && (
                    <div className="flex justify-between text-red-600 print:text-black">
                      <span>Late Fee</span>
                      <span>{formatCurrency(invoice.late_fee_cents)}</span>
                    </div>
                  )}
                  {invoice.cc_fee_cents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-dark-300 print:text-gray-600">Processing Fee</span>
                      <span className="font-medium print:text-black">{formatCurrency(invoice.cc_fee_cents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-dark-700 print:border-gray-400 print:text-base print:text-black">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total_cents)}</span>
                  </div>
                  {invoice.amount_paid_cents > 0 && invoice.amount_paid_cents < invoice.total_cents && (
                    <>
                      <div className="flex justify-between text-green-600 print:text-black">
                        <span>Paid</span>
                        <span>-{formatCurrency(invoice.amount_paid_cents)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-primary print:text-black print:text-base">
                        <span>Balance Due</span>
                        <span>{formatCurrency(balanceDue)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 p-4 bg-dark-800 rounded-lg print:bg-white print:border-t print:border-gray-200 print:rounded-none print:p-0 print:pt-2 print:mt-3">
                <p className="text-sm text-dark-400 print:text-gray-500 mb-1 print:text-xs">Notes</p>
                <p className="text-dark-200 print:text-black print:text-sm">{invoice.notes}</p>
              </div>
            )}

            {/* Pay Now Button - Hidden when paid or on print */}
            {!isPaid && balanceDue > 0 && (
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
                      Pay {formatCurrency(balanceDue)} Now
                    </>
                  )}
                </button>
                <p className="text-center text-sm text-dark-400 mt-2">
                  Secure payment via Stripe
                </p>
              </div>
            )}

            {/* Contact Information */}
            <div className="mt-8 pt-6 border-t border-dark-700 print:mt-4 print:pt-3 print:border-gray-300">
              <div className="text-center space-y-4 print:space-y-1">
                <h3 className="text-lg font-semibold text-white mb-2 print:text-black print:text-sm print:mb-1 print:hidden">Contact Information</h3>
                <div className="print:flex print:justify-center print:gap-8">
                  <div>
                    <p className="text-dark-300 print:text-gray-600 print:text-xs">Operations</p>
                    <a href="tel:6182318481" className="text-primary font-bold text-xl hover:text-primary/80 transition-colors print:text-black print:text-sm print:no-underline">
                      (618) 231-8481
                    </a>
                  </div>
                  <div>
                    <p className="text-dark-300 print:text-gray-600 print:text-xs">Billing</p>
                    <a href="tel:6182318380" className="text-primary font-bold text-xl hover:text-primary/80 transition-colors print:text-black print:text-sm print:no-underline">
                      (618) 231-8380
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-dark-700 text-center text-sm text-dark-400 print:mt-3 print:pt-2 print:border-gray-300 print:text-gray-500 print:text-xs">
              <p>Thank you for your business!</p>
              <p className="mt-1">{config.businessName} &bull; {config.phone}</p>
            </div>
          </div>
        </div>

        {/* Questions - Hidden on print */}
        <div className="mt-6 text-center text-dark-300 print:hidden">
          <p>Questions about this invoice?</p>
          <a href={`tel:${config.phone}`} className="text-primary font-medium hover:underline">
            Call {config.phone}
          </a>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          html, body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            color: black !important;
            background: white !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          /* Only allow the logo to keep its colors */
          img[alt="King City Disposal"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            filter: none !important;
          }
          /* Keep status border visible */
          .print\\:border { border-color: #d1d5db !important; }
          a { text-decoration: none !important; }
        }
      `}</style>
    </div>
  )
}
