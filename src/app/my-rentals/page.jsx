'use client'

import { useState } from 'react'
import Link from 'next/link'
import { config } from '../../config'
import {
  Phone,
  Search,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileText,
  Send,
  Package,
  RefreshCw
} from 'lucide-react'

export default function MyRentalsPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [requestModal, setRequestModal] = useState(null)
  const [requestNotes, setRequestNotes] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestSuccess, setRequestSuccess] = useState('')

  const handleLookup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/customer/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to lookup')
        return
      }

      if (result.bookings.length === 0) {
        setError('No rentals found for this phone number')
        return
      }

      setData(result)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequest = async (bookingId, requestType) => {
    setRequestLoading(true)
    setRequestSuccess('')

    try {
      const response = await fetch('/api/customer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          phone,
          requestType,
          notes: requestNotes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to submit request')
        return
      }

      setRequestSuccess(result.message)
      setRequestModal(null)
      setRequestNotes('')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setRequestLoading(false)
    }
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock, label: 'Pending' }
      case 'confirmed':
        return { color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle, label: 'Confirmed' }
      case 'delivered':
        return { color: 'bg-purple-500/20 text-purple-400', icon: Truck, label: 'Delivered' }
      case 'completed':
        return { color: 'bg-green-500/20 text-green-400', icon: CheckCircle, label: 'Completed' }
      case 'cancelled':
        return { color: 'bg-red-500/20 text-red-400', icon: AlertCircle, label: 'Cancelled' }
      default:
        return { color: 'bg-gray-500/20 text-gray-400', icon: Clock, label: status }
    }
  }

  const getDumpsterName = (sizeId) => {
    const dumpster = config.dumpsters.find(d => d.id === sizeId)
    return dumpster?.name || sizeId
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // ===== LOOKUP FORM =====
  if (!data) {
    return (
      <div className="min-h-screen bg-dark-900">
        {/* Header */}
        <header className="bg-dark-800 border-b border-dark-700">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors w-fit">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </header>

        <div className="max-w-md mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">My Rentals</h1>
            <p className="text-dark-400 mt-2">View your dumpster rentals and request pickups</p>
          </div>

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                  required
                />
              </div>
              <p className="text-dark-500 text-xs mt-2">
                Enter the phone number you used when booking
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Find My Rentals
                </>
              )}
            </button>
          </form>

          <p className="text-center text-dark-500 text-sm mt-8">
            Questions? Call us at{' '}
            <a href={`tel:${config.phone}`} className="text-primary-400 hover:underline">
              {config.phone}
            </a>
          </p>
        </div>
      </div>
    )
  }

  // ===== RENTALS LIST =====
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setData(null)}
            className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            New Lookup
          </button>
          <button
            onClick={handleLookup}
            className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Customer Info */}
        {data.customer && (
          <div className="bg-dark-800 rounded-xl p-4 mb-6 border border-dark-700">
            <p className="text-white font-semibold">{data.customer.name}</p>
            <p className="text-dark-400 text-sm">{data.customer.totalJobs} total rental{data.customer.totalJobs !== 1 ? 's' : ''}</p>
          </div>
        )}

        {/* Success Message */}
        {requestSuccess && (
          <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400">{requestSuccess}</p>
          </div>
        )}

        {/* Bookings */}
        <h2 className="text-lg font-semibold text-white mb-4">Your Rentals</h2>
        <div className="space-y-4">
          {data.bookings.map((booking) => {
            const statusInfo = getStatusInfo(booking.status)
            const StatusIcon = statusInfo.icon
            const isActive = ['pending', 'confirmed', 'delivered'].includes(booking.status)

            return (
              <div
                key={booking.id}
                className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden"
              >
                <div className="p-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusInfo.label}
                    </span>
                    {booking.paid && (
                      <span className="text-green-400 text-xs font-medium">Paid</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white">
                      <Truck className="w-4 h-4 text-primary-400" />
                      <span className="font-medium">{getDumpsterName(booking.dumpsterSize)}</span>
                    </div>
                    <div className="flex items-start gap-2 text-dark-300">
                      <MapPin className="w-4 h-4 text-dark-500 mt-0.5" />
                      <span className="text-sm">{booking.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-dark-300">
                      <Calendar className="w-4 h-4 text-dark-500" />
                      <span className="text-sm">
                        Delivery: {formatDate(booking.deliveryDate)}
                        {booking.rentalDuration && ` • ${booking.rentalDuration}`}
                      </span>
                    </div>
                    {booking.priceCents > 0 && (
                      <div className="flex items-center gap-2 text-dark-300">
                        <DollarSign className="w-4 h-4 text-dark-500" />
                        <span className="text-sm">${(booking.priceCents / 100).toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions for active rentals */}
                {isActive && (
                  <div className="border-t border-dark-700 p-3 flex gap-2">
                    <button
                      onClick={() => setRequestModal({ booking, type: 'pickup' })}
                      className="flex-1 py-2 px-3 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                    >
                      Request Pickup
                    </button>
                    <button
                      onClick={() => setRequestModal({ booking, type: 'extension' })}
                      className="flex-1 py-2 px-3 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                    >
                      Extend Rental
                    </button>
                    <button
                      onClick={() => setRequestModal({ booking, type: 'issue' })}
                      className="py-2 px-3 bg-dark-700 text-dark-300 rounded-lg text-sm hover:bg-dark-600 transition-colors"
                    >
                      Issue
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Invoices */}
        {data.invoices.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-white mt-8 mb-4">Invoices</h2>
            <div className="space-y-3">
              {data.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-dark-800 rounded-xl border border-dark-700 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-dark-400" />
                    <div>
                      <p className="text-white font-medium">
                        ${((invoice.totalCents || 0) / 100).toFixed(0)}
                      </p>
                      <p className="text-dark-400 text-sm">
                        {invoice.status === 'paid' ? 'Paid' : `Due: ${formatDate(invoice.dueDate)}`}
                      </p>
                    </div>
                  </div>
                  {invoice.paymentLink && invoice.status !== 'paid' && (
                    <a
                      href={invoice.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-sm py-2 px-4"
                    >
                      Pay Now
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Contact */}
        <div className="mt-8 text-center">
          <p className="text-dark-400 text-sm">
            Need help? Call{' '}
            <a href={`tel:${config.phone}`} className="text-primary-400 hover:underline">
              {config.phone}
            </a>
          </p>
        </div>
      </div>

      {/* Request Modal */}
      {requestModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl max-w-md w-full p-6 border border-dark-700">
            <h3 className="text-xl font-bold text-white mb-2">
              {requestModal.type === 'pickup' && 'Request Pickup'}
              {requestModal.type === 'extension' && 'Extend Rental'}
              {requestModal.type === 'issue' && 'Report an Issue'}
            </h3>
            <p className="text-dark-400 text-sm mb-4">
              {getDumpsterName(requestModal.booking.dumpsterSize)} at {requestModal.booking.address}
            </p>

            <textarea
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              placeholder={
                requestModal.type === 'pickup' ? "Preferred pickup date/time (optional)" :
                requestModal.type === 'extension' ? "How many extra days do you need?" :
                "Describe the issue..."
              }
              className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 h-24 resize-none"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setRequestModal(null)
                  setRequestNotes('')
                }}
                className="flex-1 py-3 bg-dark-700 text-white rounded-xl font-medium hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequest(requestModal.booking.id, requestModal.type)}
                disabled={requestLoading}
                className="flex-1 py-3 btn-primary flex items-center justify-center gap-2"
              >
                {requestLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
