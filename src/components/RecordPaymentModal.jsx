'use client'

import { useState } from 'react'
import { config } from '../config'
import {
  X,
  DollarSign,
  User,
  Phone,
  FileText,
  CreditCard,
  Banknote,
  Check,
  Loader2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'

export default function RecordPaymentModal({ booking, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState(null)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    amount: booking?.price_cents ? (booking.price_cents / 100).toFixed(2) : '',
    type: 'booking',
    payment_method: 'cash',
    description: '',
    customer_name: booking?.customer_name || '',
    customer_phone: booking?.customer_phone || '',
    send_sms: true,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const adminToken = typeof window !== 'undefined'
        ? sessionStorage.getItem('adminToken')
        : null
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          booking_id: booking?.id || null,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          amount_cents: Math.round(parseFloat(formData.amount) * 100),
          description: formData.description || `${booking?.dumpster_size || ''} - ${formData.payment_method} payment`,
          type: formData.type,
          service_address: booking?.address || null,
          dumpster_size: booking?.dumpster_size || null,
          rental_duration: booking?.rental_duration || null,
          delivery_date: booking?.delivery_date || null,
          payment_method: formData.payment_method,
          send_sms: formData.send_sms && !!formData.customer_phone,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(true)
        setReceiptUrl(data.receipt_url)

        // If this is linked to a booking, update it as paid
        if (booking?.id) {
          await fetch(`/api/admin/bookings/${booking.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}),
            },
            body: JSON.stringify({ status: 'confirmed' }),
          })
        }

        if (onSuccess) {
          setTimeout(() => onSuccess(data), 2000)
        }
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to record payment')
      }
    } catch (err) {
      setError('Error recording payment')
      console.error(err)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Payment Recorded!</h2>
          <p className="text-neutral-600 mb-4">
            Receipt has been created{formData.send_sms && formData.customer_phone ? ' and sent to customer' : ''}.
          </p>
          {receiptUrl && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary-600 hover:underline mb-4"
            >
              View Receipt <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            className="w-full py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-900">Record Payment</h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Customer Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Payment Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            >
              <option value="booking">Booking Payment</option>
              <option value="extension">Extension</option>
              <option value="overage">Weight Overage</option>
              <option value="late_fee">Late Fee</option>
              <option value="custom">Other/Custom</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'cash', label: 'Cash', icon: Banknote },
                { value: 'check', label: 'Check', icon: Check },
                { value: 'card', label: 'Card', icon: CreditCard },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: value })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                    formData.payment_method === value
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description (optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                rows={2}
                placeholder="Notes about this payment..."
              />
            </div>
          </div>

          {/* Send SMS Receipt */}
          {formData.customer_phone && (
            <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.send_sms}
                onChange={(e) => setFormData({ ...formData, send_sms: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-neutral-900">Send SMS Receipt</p>
                <p className="text-sm text-neutral-500">Customer will receive receipt via text</p>
              </div>
            </label>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Record Payment
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
