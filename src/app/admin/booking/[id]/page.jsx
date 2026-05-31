'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { config } from '../../../../config'
import BookingDetailMap from '../../../../components/BookingDetailMap'
import { useToast } from '../../../../components/Toast'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Truck,
  User,
  FileText,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Copy,
  ExternalLink,
  Receipt,
  Send,
  UserCircle
} from 'lucide-react'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [invoiceCreated, setInvoiceCreated] = useState(null)

  // Fetch booking
  const fetchBooking = useCallback(async () => {
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/bookings?id=eq.${params.id}`,
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
          setBooking(data[0])
          setNotes(data[0].notes || '')
          setStatus(data[0].status || 'pending')
        } else {
          setError('Booking not found')
        }
      } else {
        setError('Failed to fetch booking')
      }
    } catch (err) {
      setError('Error loading booking')
      console.error(err)
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchBooking()
  }, [fetchBooking])

  // Save changes
  const handleSave = async () => {
    setSaving(true)
    try {
      const token = sessionStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/bookings/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ notes, status }),
      })

      if (response.ok) {
        setBooking({ ...booking, notes, status })
        toast.success('Changes saved successfully')
      } else {
        toast.error('Failed to save changes')
      }
    } catch (err) {
      console.error('Error saving:', err)
      toast.error('Error saving changes')
    }
    setSaving(false)
  }

  // Delete booking
  const handleDelete = async () => {
    try {
      const token = sessionStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/bookings/${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success('Booking deleted')
        router.replace('/admin')
        router.refresh()
      } else {
        toast.error('Failed to delete booking')
      }
    } catch (err) {
      console.error('Error deleting:', err)
      toast.error('Error deleting booking')
    }
  }

  // Copy link
  const copyLink = () => {
    const url = `${window.location.origin}/admin/booking/${params.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  // Create invoice for this booking
  const createInvoice = async () => {
    if (!booking) return
    setCreatingInvoice(true)

    try {
      const dumpster = getDumpsterInfo(booking.dumpster_size)

      // Calculate pickup date (delivery + rental duration days)
      const deliveryDate = new Date(booking.delivery_date)
      const durationDays = parseInt(booking.rental_duration) || 10
      const pickupDate = new Date(deliveryDate)
      pickupDate.setDate(pickupDate.getDate() + durationDays)

      // Calculate due date (delivery date + 15 days)
      const dueDate = new Date(deliveryDate)
      dueDate.setDate(dueDate.getDate() + 15)

      const invoiceData = {
        booking_id: booking.id,
        customer_id: booking.customer_id || null,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        customer_email: booking.customer_email,
        customer_address: booking.address,
        service_address: booking.address,
        service_description: `${dumpster.name} Dumpster Rental - ${booking.rental_duration}`,
        dumpster_size: booking.dumpster_size,
        rental_duration: booking.rental_duration,
        delivery_date: booking.delivery_date,
        pickup_date: pickupDate.toISOString().split('T')[0],
        line_items: [
          {
            description: `${dumpster.name} Dumpster - ${booking.rental_duration} Rental`,
            amount_cents: booking.price_cents || 0,
          }
        ],
        subtotal_cents: booking.price_cents || 0,
        tax_cents: 0,
        discount_cents: 0,
        total_cents: booking.price_cents || 0,
        due_date: dueDate.toISOString().split('T')[0],
        notes: booking.placement_notes || null,
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(invoiceData),
      })

      if (response.ok) {
        const result = await response.json()
        setInvoiceCreated(result.invoice || result)
        toast.success('Invoice created successfully')
        // Refresh booking to show invoice link
        fetchBooking()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to create invoice')
      }
    } catch (err) {
      console.error('Error creating invoice:', err)
      toast.error('Error creating invoice')
    }

    setCreatingInvoice(false)
  }

  // Send invoice via SMS
  const sendInvoice = async (invoiceId) => {
    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })

      if (response.ok) {
        toast.success('Invoice sent!')
        fetchBooking()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to send invoice')
      }
    } catch (err) {
      console.error('Error sending invoice:', err)
    }
  }

  // Open in Google Maps
  const openInGoogleMaps = () => {
    const lat = booking.placement_lat || ''
    const lng = booking.placement_lng || ''
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
    } else {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(booking.address)}`, '_blank')
    }
  }

  // Get status color
  const getStatusColor = (s) => {
    switch (s) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'delivered': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Get dumpster info
  const getDumpsterInfo = (sizeId) => {
    return config.dumpsters.find(d => d.id === sizeId) || { name: sizeId, dimensions: '' }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">{error}</h1>
          <button onClick={() => router.push('/admin')} className="btn-primary mt-4">
            Back to Admin
          </button>
        </div>
      </div>
    )
  }

  const dumpster = getDumpsterInfo(booking.dumpster_size)

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Bookings</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={copyLink}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left Column - Map */}
          <div className="space-y-6">
            {/* Map */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
              <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-400" />
                  Dumpster Placement
                </h2>
                <button
                  onClick={openInGoogleMaps}
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Maps
                </button>
              </div>

              {/* Static satellite map with dumpster rectangle */}
              <BookingDetailMap
                lat={booking.placement_lat}
                lng={booking.placement_lng}
                address={booking.address}
                placementNotes={booking.placement_notes}
                dumpsterSize={booking.dumpster_size}
              />

              {booking.placement_notes && (
                <div className="p-4 bg-dark-700/50">
                  <p className="text-sm text-dark-400">Placement Notes:</p>
                  <p className="text-white">{booking.placement_notes}</p>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-primary-400 mt-0.5" />
                <div>
                  <p className="text-dark-400 text-sm">Delivery Address</p>
                  <p className="text-white font-medium">{booking.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">

            {/* Customer Info */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-400" />
                Customer
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-dark-400 text-sm">Name</p>
                  <p className="text-white text-lg font-medium">{booking.customer_name}</p>
                </div>

                <div>
                  <p className="text-dark-400 text-sm">Phone</p>
                  <a
                    href={`tel:${booking.customer_phone}`}
                    className="text-primary-400 text-lg font-medium hover:text-primary-300 flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    {booking.customer_phone}
                  </a>
                </div>

                {booking.customer_email && (
                  <div>
                    <p className="text-dark-400 text-sm">Email</p>
                    <a
                      href={`mailto:${booking.customer_email}`}
                      className="text-primary-400 hover:text-primary-300 flex items-center gap-2"
                    >
                      <Mail className="w-5 h-5" />
                      {booking.customer_email}
                    </a>
                  </div>
                )}

                {booking.customer_id && (
                  <div className="pt-2 border-t border-dark-700">
                    <button
                      onClick={() => router.push(`/admin/customers/${booking.customer_id}`)}
                      className="text-primary-400 hover:text-primary-300 flex items-center gap-2 text-sm"
                    >
                      <UserCircle className="w-4 h-4" />
                      View Customer Profile
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Section */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary-400" />
                Invoice
              </h2>

              {booking.invoice_id || invoiceCreated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Invoice Created</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/admin/invoices/${booking.invoice_id || invoiceCreated?.id}`)}
                      className="px-4 py-2 bg-dark-700 text-white rounded-lg text-sm hover:bg-dark-600 transition-colors flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Invoice
                    </button>

                    <button
                      onClick={() => sendInvoice(booking.invoice_id || invoiceCreated?.id)}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send to Customer
                    </button>

                    {invoiceCreated?.invoice_number && (
                      <a
                        href={`/invoice/${invoiceCreated.invoice_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-dark-700 text-white rounded-lg text-sm hover:bg-dark-600 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Customer View
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-dark-400 text-sm">
                    Create an invoice to send to the customer for payment.
                  </p>

                  <button
                    onClick={createInvoice}
                    disabled={creatingInvoice}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {creatingInvoice ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Receipt className="w-4 h-4" />
                        Create Invoice
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Booking Details */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary-400" />
                Booking Details
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-dark-400 text-sm">Dumpster Size</p>
                  <p className="text-white font-medium">{dumpster.name}</p>
                  <p className="text-dark-500 text-xs">{dumpster.dimensions?.display || `${dumpster.dimensions?.length}' x ${dumpster.dimensions?.width}' x ${dumpster.dimensions?.height}'`}</p>
                </div>

                <div>
                  <p className="text-dark-400 text-sm">Project Type</p>
                  <p className="text-white font-medium capitalize">{booking.project_type || 'Not specified'}</p>
                </div>

                <div>
                  <p className="text-dark-400 text-sm">Delivery Date</p>
                  <p className="text-white font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-primary-400" />
                    {formatDate(booking.delivery_date)}
                  </p>
                </div>

                <div>
                  <p className="text-dark-400 text-sm">Duration</p>
                  <p className="text-white font-medium flex items-center gap-1">
                    <Clock className="w-4 h-4 text-primary-400" />
                    {booking.rental_duration}
                  </p>
                </div>

                <div>
                  <p className="text-dark-400 text-sm">Price</p>
                  <p className="text-primary-400 font-bold text-xl flex items-center gap-1">
                    <DollarSign className="w-5 h-5" />
                    {booking.price_cents ? (booking.price_cents / 100).toFixed(2) : 'TBD'}
                  </p>
                </div>

              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary-400" />
                Payment Status
              </h2>

              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${booking.paid ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {booking.paid ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-yellow-400" />
                      )}
                      <div>
                        <p className={`font-semibold ${booking.paid ? 'text-green-400' : 'text-yellow-400'}`}>
                          {booking.paid ? 'Paid' : 'Unpaid'}
                        </p>
                        {booking.paid && booking.paid_at && (
                          <p className="text-dark-400 text-sm">
                            {new Date(booking.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {booking.stripe_session_id && ' via Stripe'}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-white font-bold text-xl">
                      ${booking.price_cents ? (booking.price_cents / 100).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>

                {!booking.paid && (
                  <button
                    onClick={async () => {
                      if (!confirm('Mark this booking as paid? This should only be used for cash/check/manual payments.')) return;
                      try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`/api/admin/bookings/${params.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            paid: true,
                            paid_at: new Date().toISOString(),
                            payment_method: 'manual',
                          }),
                        });
                        if (response.ok) {
                          toast.success('Marked as paid');
                          fetchBooking();
                        } else {
                          toast.error('Failed to update payment status');
                        }
                      } catch (err) {
                        console.error('Error:', err);
                        toast.error('Error updating payment');
                      }
                    }}
                    className="w-full px-4 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Mark as Paid (Cash/Check/Manual)
                  </button>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
              <h2 className="font-semibold text-white mb-4">Status</h2>

              <div className="flex flex-wrap gap-2">
                {['pending', 'confirmed', 'delivered', 'completed', 'cancelled'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      status === s
                        ? getStatusColor(s)
                        : 'bg-dark-700 text-dark-400 border-dark-600 hover:border-dark-500'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-400" />
                Internal Notes
              </h2>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this booking..."
                rows={4}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none"
              />
            </div>

            {/* Delete */}
            <div className="bg-dark-800 rounded-2xl border border-red-500/20 p-6">
              <h2 className="font-semibold text-red-400 mb-2">Danger Zone</h2>
              <p className="text-dark-400 text-sm mb-4">
                Permanently delete this booking. This cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Booking
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-dark-700 text-dark-300 rounded-lg text-sm hover:bg-dark-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Created timestamp */}
        <p className="text-center text-dark-500 text-sm mt-8">
          Booking created {formatDate(booking.created_at)}
        </p>
      </div>
    </div>
  )
}
