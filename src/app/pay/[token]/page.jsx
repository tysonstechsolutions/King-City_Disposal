'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { config } from '../../../config'
import {
  FileText,
  Calendar,
  CreditCard,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export default function BatchPayPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [batch, setBatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)

  const canceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    fetchBatch()
  }, [params.token])

  const fetchBatch = async () => {
    try {
      const res = await fetch(`/api/payment-batches?token=${params.token}`)
      if (res.ok) {
        setBatch(await res.json())
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Payment link not found')
      }
    } catch (err) {
      console.error(err)
      setError('Error loading payment link')
    }
    setLoading(false)
  }

  const handlePayNow = async () => {
    setPaying(true)
    try {
      const res = await fetch('/api/payment-batches/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.payment_url) {
          window.location.href = data.payment_url
          return
        }
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to start payment')
      }
    } catch (err) {
      console.error(err)
      alert('Error processing payment')
    }
    setPaying(false)
  }

  const formatCurrency = (cents) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100)

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">{error}</h1>
          <p className="text-dark-300">Please check the link or call {config.billingPhone}.</p>
        </div>
      </div>
    )
  }

  const invoices = batch?.invoices || []
  const allPaid = batch?.all_paid

  return (
    <div className="min-h-screen bg-dark-800 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-dark-900 rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">{config.businessName}</h1>
                <p className="text-white/80 text-sm">{config.billingPhone}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-sm font-semibold tracking-wider">PAYMENT</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {canceled && !allPaid && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">Payment was canceled. You can try again below.</p>
              </div>
            )}

            {allPaid ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-1">All Paid</h2>
                <p className="text-dark-300">
                  Thank you{batch?.customer_name ? `, ${batch.customer_name}` : ''}! These invoices are paid in full.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wide mb-1">Bill To</h2>
                  <p className="font-semibold text-lg text-white">{batch?.customer_name}</p>
                  <p className="text-dark-300 text-sm mt-1">
                    {invoices.filter((i) => !i.paid).length} invoice
                    {invoices.filter((i) => !i.paid).length === 1 ? '' : 's'} ready to pay
                  </p>
                </div>

                {/* Invoice list */}
                <div className="border border-dark-700 rounded-lg divide-y divide-dark-700 mb-6">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="font-mono font-semibold text-white">{inv.invoice_number}</span>
                          {inv.paid && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">
                              Paid
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-dark-400 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {inv.due_date ? `Due ${formatDate(inv.due_date)}` : formatDate(inv.invoice_date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${inv.paid ? 'text-dark-500 line-through' : 'text-white'}`}>
                          {formatCurrency(inv.paid ? inv.total_cents : inv.balance_due_cents)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between border-t border-dark-700 pt-4 mb-6">
                  <span className="text-lg font-semibold text-white">Total Due</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(batch?.amount_due_cents)}
                  </span>
                </div>

                <button
                  onClick={handlePayNow}
                  disabled={paying}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {paying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay {formatCurrency(batch?.amount_due_cents)} Now
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-dark-500 mt-4">
                  Secure payment powered by Stripe. Questions? Call {config.billingPhone}.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
