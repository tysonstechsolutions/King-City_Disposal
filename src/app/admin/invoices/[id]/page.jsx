'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '../../../../components/AdminNav'
import { formatWeight } from '../../../../lib/constants'
import { useToast } from '../../../../components/Toast'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  User,
  FileText,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  Plus,
  Scale,
  Edit3,
  X,
  ExternalLink,
  Clock,
  CreditCard,
  Banknote
} from 'lucide-react'
import CardPaymentForm from '../../../../components/CardPaymentForm'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedInvoice, setEditedInvoice] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('check')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentCheckNumber, setPaymentCheckNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [showCardForm, setShowCardForm] = useState(false)

  // Fetch invoice
  const fetchInvoice = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('adminToken')
      const response = await fetch(`/api/invoices?id=${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setInvoice(data[0])
          setEditedInvoice(data[0])
        } else {
          setError('Invoice not found')
        }
      } else {
        setError('Failed to fetch invoice')
      }
    } catch (err) {
      setError('Error loading invoice')
      console.error(err)
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchInvoice()
  }, [fetchInvoice])

  // Format currency
  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format((cents || 0) / 100)
  }

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set'
    // Append T00:00:00 to date-only strings so they parse as local time, not UTC
    const d = dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Calculate late fee (5% per month after 30 days from date_set or invoice date)
  const calculateLateFee = (inv) => {
    if (!inv || inv.status === 'paid') return { monthsLate: 0, lateFee: 0 }

    // Use date_set if available (when dumpster was delivered), otherwise use invoice_date
    const refStr = inv.date_set || inv.invoice_date || inv.created_at
    const referenceDate = refStr?.length === 10 ? new Date(refStr + 'T00:00:00') : new Date(refStr)

    // Late fees apply 30 days after the reference date
    const lateFeeStartDate = new Date(referenceDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now <= lateFeeStartDate) return { monthsLate: 0, lateFee: 0 }

    // Calculate months overdue (30-day periods after late fee start date)
    const msOverdue = now.getTime() - lateFeeStartDate.getTime()
    const daysOverdue = Math.floor(msOverdue / (24 * 60 * 60 * 1000))
    const monthsLate = Math.ceil(daysOverdue / 30)

    // 5% per month on original subtotal (not including existing late fees)
    const subtotal = inv.subtotal_cents || inv.total_cents || 0
    const lateFee = Math.round(subtotal * 0.05 * monthsLate)

    return { monthsLate, lateFee, daysOverdue }
  }

  // Check if invoice is overdue: 30 days past date_set (dumpster delivery date)
  const isInvoiceOverdue = (inv) => {
    if (!inv || inv.status === 'paid') return false
    const refDate = inv.date_set || inv.invoice_date || inv.created_at
    if (!refDate) return false
    const overdueDate = new Date(refDate)
    overdueDate.setDate(overdueDate.getDate() + 30)
    return new Date() > overdueDate
  }

  // Get status badge
  const getStatusBadge = (status, inv) => {
    const isOverdue = inv ? isInvoiceOverdue(inv) : status === 'overdue'

    if (isOverdue || status === 'overdue') {
      return <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Overdue</span>
    }

    const badges = {
      draft: <span className="px-3 py-1 text-sm font-medium rounded-full bg-dark-700 text-dark-200">Draft</span>,
      sent: <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Sent</span>,
      viewed: <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Viewed</span>,
      partial: <span className="px-3 py-1 text-sm font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Partial</span>,
      paid: <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Paid</span>,
      overdue: <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Overdue</span>,
      void: <span className="px-3 py-1 text-sm font-medium rounded-full bg-dark-700 text-dark-400">Void</span>,
    }
    return badges[status] || badges.draft
  }

  // Update line item
  const updateLineItem = (index, field, value) => {
    setEditedInvoice(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) =>
        i === index ? { ...item, [field]: field === 'amount_cents' ? Math.round(parseFloat(value || 0) * 100) : value } : item
      )
    }))
  }

  // Add line item
  const addLineItem = () => {
    setEditedInvoice(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: '', amount_cents: 0 }]
    }))
  }

  // Remove line item
  const removeLineItem = (index) => {
    if (editedInvoice.line_items.length <= 1) return
    setEditedInvoice(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }))
  }

  // Calculate totals
  const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => sum + (item.amount_cents || 0), 0)
  }

  // Save changes
  const handleSave = async () => {
    setSaving(true)
    try {
      const subtotal = calculateSubtotal(editedInvoice.line_items)
      const lateFee = editedInvoice.late_fee_cents || 0
      const ccFee = editedInvoice.cc_fee_cents || 0
      const discount = editedInvoice.discount_cents || 0
      const total = subtotal + lateFee + ccFee - discount

      const token = sessionStorage.getItem('adminToken')
      const response = await fetch(`/api/invoices/update?id=${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_name: editedInvoice.customer_name,
          customer_phone: editedInvoice.customer_phone,
          customer_email: editedInvoice.customer_email,
          service_address: editedInvoice.service_address,
          dumpster_size: editedInvoice.dumpster_size,
          rental_duration: editedInvoice.rental_duration,
          weight_lbs: editedInvoice.weight_lbs,
          weight_included_lbs: editedInvoice.weight_included_lbs,
          line_items: editedInvoice.line_items,
          subtotal_cents: subtotal,
          late_fee_cents: lateFee,
          cc_fee_cents: ccFee,
          discount_cents: discount,
          total_cents: total,
          notes: editedInvoice.notes,
          invoice_date: editedInvoice.invoice_date,
          due_date: editedInvoice.due_date,
          date_set: editedInvoice.date_set,
        }),
      })

      if (response.ok) {
        const [updated] = await response.json()
        // Parse line_items back
        updated.line_items = typeof updated.line_items === 'string'
          ? JSON.parse(updated.line_items)
          : updated.line_items
        setInvoice(updated)
        setEditedInvoice(updated)
        setIsEditing(false)
        toast.success('Invoice saved')
      } else {
        toast.error('Failed to save changes')
      }
    } catch (err) {
      console.error('Error saving:', err)
      toast.error('Error saving changes')
    }
    setSaving(false)
  }

  // Send invoice
  const handleSend = async () => {
    if (!invoice.customer_phone && !invoice.customer_email) {
      toast.warning('No phone or email on this invoice')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ invoice_id: invoice.id }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.sms_sent || result.email_sent) {
          toast.success(`Invoice sent${result.sms_sent ? ' via SMS' : ''}${result.email_sent ? ' via Email' : ''}`)
        } else {
          toast.warning('Invoice saved but delivery failed - check Twilio/Resend config')
        }
        fetchInvoice()
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Failed to send invoice')
      }
    } catch (err) {
      console.error('Error sending:', err)
      toast.error('Error sending invoice')
    }
    setSending(false)
  }

  // Record payment
  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.warning('Enter a valid payment amount')
      return
    }

    setRecordingPayment(true)
    try {
      const baseAmountCents = Math.round(parseFloat(paymentAmount) * 100)

      // Calculate CC fee if card payment (3.75%)
      // The CC fee is collected from the customer on top of the invoice amount,
      // so it goes into amount_paid_cents. We do NOT inflate total_cents or
      // accumulate cc_fee_cents here — that would double-count on repeated payments.
      const ccFeeCents = paymentMethod === 'card' ? Math.round(baseAmountCents * 0.0375) : 0
      const totalAmountCents = baseAmountCents + ccFeeCents

      const newAmountPaid = (invoice.amount_paid_cents || 0) + totalAmountCents
      const newBalanceDue = (invoice.total_cents || 0) - newAmountPaid
      const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial'

      // Use custom date if provided, otherwise use now
      const paidAtDate = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString()

      // Build notes with check number if provided
      let fullNotes = paymentNotes
      if (paymentCheckNumber && paymentMethod === 'check') {
        fullNotes = `Check #${paymentCheckNumber}${paymentNotes ? ' - ' + paymentNotes : ''}`
      }
      if (paymentMethod === 'card' && ccFeeCents > 0) {
        fullNotes = `CC Fee: $${(ccFeeCents / 100).toFixed(2)}${fullNotes ? ' - ' + fullNotes : ''}`
      }

      // Build update object - only include fields that exist in the schema
      const updateData = {
        amount_paid_cents: newAmountPaid,
        balance_due_cents: Math.max(0, newBalanceDue),
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      // Only set paid_at if fully paid
      if (newStatus === 'paid') {
        updateData.paid_at = paidAtDate
      }

      // Store payment details in notes if check payment
      if (paymentMethod === 'check' && paymentCheckNumber) {
        updateData.notes = invoice.notes
          ? `${invoice.notes}\n---\nPayment: Check #${paymentCheckNumber} - ${formatCurrency(totalAmountCents)} on ${new Date(paidAtDate).toLocaleDateString()}`
          : `Payment: Check #${paymentCheckNumber} - ${formatCurrency(totalAmountCents)} on ${new Date(paidAtDate).toLocaleDateString()}`
      }

      const token = sessionStorage.getItem('adminToken')
      const response = await fetch(`/api/invoices/update?id=${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        setShowPaymentModal(false)
        setPaymentAmount('')
        setPaymentNotes('')
        setPaymentCheckNumber('')
        setPaymentDate('')
        toast.success('Payment recorded successfully')
        fetchInvoice()
      } else {
        const errorText = await response.text()
        console.error('Payment update failed:', errorText)
        toast.error('Failed to record payment. Please try again.')
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      toast.error('Error recording payment')
    }
    setRecordingPayment(false)
  }

  // Delete invoice
  const handleDelete = async () => {
    try {
      const token = sessionStorage.getItem('adminToken')
      const response = await fetch(`/api/invoices/update?id=${params.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success('Invoice deleted')
        router.push('/admin/invoices')
      } else {
        toast.error('Failed to delete invoice')
      }
    } catch (err) {
      console.error('Error deleting:', err)
      toast.error('Error deleting invoice')
    }
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditedInvoice(invoice)
    setIsEditing(false)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900">
        <AdminNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark-900">
        <AdminNav />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">{error}</h1>
            <Link href="/admin/invoices" className="text-primary hover:underline">
              Back to Invoices
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const balanceDue = invoice.total_cents - (invoice.amount_paid_cents || 0)

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/invoices" className="text-dark-400 hover:text-dark-200">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white font-mono">
                    {invoice.invoice_number}
                  </h1>
                  {getStatusBadge(invoice.status, invoice)}
                </div>
                <p className="text-sm text-dark-400">{invoice.customer_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-dark-300 hover:bg-dark-700 rounded-lg flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-dark-300 hover:bg-dark-700 rounded-lg flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  {invoice.status !== 'paid' && (
                    <button
                      onClick={() => {
                        // Pre-fill with balance due and today's date
                        const balance = invoice.total_cents - (invoice.amount_paid_cents || 0)
                        setPaymentAmount((balance / 100).toFixed(2))
                        setPaymentDate(new Date().toISOString().split('T')[0])
                        setShowPaymentModal(true)
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Record Payment
                    </button>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {invoice.status === 'draft' ? 'Send Invoice' : 'Resend'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Customer
              </h2>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-1">Name</label>
                    <input
                      type="text"
                      value={editedInvoice.customer_name || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, customer_name: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editedInvoice.customer_phone || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, customer_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-dark-200 mb-1">Email</label>
                    <input
                      type="text"
                      value={editedInvoice.customer_email || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, customer_email: e.target.value })}
                      placeholder="email@example.com, second@example.com"
                      className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                    <p className="text-xs text-dark-500 mt-1">Separate multiple emails with commas</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-medium text-white">{invoice.customer_name}</p>
                  </div>
                  {invoice.customer_phone && (
                    <a href={`tel:${invoice.customer_phone}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Phone className="w-4 h-4" />
                      {invoice.customer_phone}
                    </a>
                  )}
                  {invoice.customer_email && (
                    <a href={`mailto:${invoice.customer_email}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Mail className="w-4 h-4" />
                      {invoice.customer_email}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Service Details */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Service Details
              </h2>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-1">Service Address</label>
                    <input
                      type="text"
                      value={editedInvoice.service_address || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, service_address: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Dumpster Size</label>
                      <input
                        type="text"
                        value={editedInvoice.dumpster_size || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, dumpster_size: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Rental Duration</label>
                      <input
                        type="text"
                        value={editedInvoice.rental_duration || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, rental_duration: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Actual Weight (tons)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedInvoice.weight_lbs ? (editedInvoice.weight_lbs / 2000).toFixed(2) : ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, weight_lbs: e.target.value ? Math.round(parseFloat(e.target.value) * 2000) : null })}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Included Weight (tons)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editedInvoice.weight_included_lbs ? (editedInvoice.weight_included_lbs / 2000).toFixed(2) : ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, weight_included_lbs: e.target.value ? Math.round(parseFloat(e.target.value) * 2000) : null })}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-dark-700">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={editedInvoice.invoice_date ? editedInvoice.invoice_date.split('T')[0] : ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, invoice_date: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editedInvoice.due_date ? editedInvoice.due_date.split('T')[0] : ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, due_date: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Date Set</label>
                      <input
                        type="date"
                        value={editedInvoice.date_set ? editedInvoice.date_set.split('T')[0] : ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, date_set: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                      <p className="text-xs text-dark-500 mt-1">Late fees start 30 days after</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoice.service_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-dark-500 mt-0.5" />
                      <span>{invoice.service_address}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {invoice.dumpster_size && (
                      <div>
                        <span className="text-dark-400">Dumpster:</span>
                        <span className="ml-2 font-medium">{invoice.dumpster_size}</span>
                      </div>
                    )}
                    {invoice.rental_duration && (
                      <div>
                        <span className="text-dark-400">Duration:</span>
                        <span className="ml-2 font-medium">{invoice.rental_duration}</span>
                      </div>
                    )}
                    {invoice.weight_lbs && (
                      <div>
                        <span className="text-dark-400">Weight:</span>
                        <span className="ml-2 font-medium">{formatWeight(invoice.weight_lbs)}</span>
                      </div>
                    )}
                    {invoice.weight_included_lbs && (
                      <div>
                        <span className="text-dark-400">Included:</span>
                        <span className="ml-2 font-medium">{formatWeight(invoice.weight_included_lbs)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Line Items
              </h2>

              {isEditing ? (
                <div className="space-y-3">
                  {editedInvoice.line_items?.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount_cents ? (item.amount_cents / 100).toFixed(2) : ''}
                          onChange={(e) => updateLineItem(index, 'amount_cents', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={editedInvoice.line_items.length <= 1}
                        className="p-2 text-dark-500 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-2 text-primary hover:text-primary/80"
                  >
                    <Plus className="w-4 h-4" />
                    Add Line Item
                  </button>

                  {/* Late Fee and CC Fee fields */}
                  <div className="mt-4 pt-4 border-t border-dark-700 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-dark-400">Late Fee</label>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editedInvoice.late_fee_cents ? (editedInvoice.late_fee_cents / 100).toFixed(2) : ''}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, late_fee_cents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-red-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-dark-400">Credit / Discount</label>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">-$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editedInvoice.discount_cents ? (editedInvoice.discount_cents / 100).toFixed(2) : ''}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, discount_cents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2 bg-dark-700 border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-dark-400">CC Processing Fee</label>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editedInvoice.cc_fee_cents ? (editedInvoice.cc_fee_cents / 100).toFixed(2) : ''}
                          onChange={(e) => setEditedInvoice({ ...editedInvoice, cc_fee_cents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-dark-700">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold">
                        {formatCurrency(
                          calculateSubtotal(editedInvoice.line_items) +
                          (editedInvoice.late_fee_cents || 0) +
                          (editedInvoice.cc_fee_cents || 0) -
                          (editedInvoice.discount_cents || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Service line items only (filter out tax/fees) */}
                  {invoice.line_items?.filter(item =>
                    !item.is_tax && !item.is_fee &&
                    !item.description?.toLowerCase().includes('sales tax') &&
                    !item.description?.toLowerCase().includes('processing fee')
                  ).map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-dark-700 last:border-0">
                      <span className="text-dark-200">{item.description}</span>
                      <span className="font-medium">{formatCurrency(item.amount_cents)}</span>
                    </div>
                  ))}

                  {/* Subtotal */}
                  {invoice.subtotal_cents > 0 && (
                    <div className="flex justify-between py-2 border-t border-dark-600">
                      <span className="text-dark-400">Subtotal</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal_cents)}</span>
                    </div>
                  )}

                  {/* Tax */}
                  {invoice.tax_cents > 0 && (
                    <div className="flex justify-between py-2 border-b border-dark-700">
                      <span className="text-dark-200">Illinois Sales Tax</span>
                      <span className="font-medium">{formatCurrency(invoice.tax_cents)}</span>
                    </div>
                  )}

                  {invoice.late_fee_cents > 0 && (
                    <div className="flex justify-between py-2 border-b border-dark-700 text-red-400">
                      <span>Late Fee</span>
                      <span className="font-medium">{formatCurrency(invoice.late_fee_cents)}</span>
                    </div>
                  )}

                  {invoice.discount_cents > 0 && (
                    <div className="flex justify-between py-2 border-b border-dark-700 text-green-400">
                      <span>Credit / Discount</span>
                      <span className="font-medium">-{formatCurrency(invoice.discount_cents)}</span>
                    </div>
                  )}

                  {invoice.cc_fee_cents > 0 && (
                    <div className="flex justify-between py-2 border-b border-dark-700">
                      <span className="text-dark-200">Processing Fee</span>
                      <span className="font-medium">{formatCurrency(invoice.cc_fee_cents)}</span>
                    </div>
                  )}

                  <div className="pt-3 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total_cents)}</span>
                  </div>

                  {invoice.amount_paid_cents > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Paid</span>
                        <span>-{formatCurrency(invoice.amount_paid_cents)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-amber-600">
                        <span>Balance Due</span>
                        <span>{formatCurrency(balanceDue)}</span>
                      </div>
                    </>
                  )}

                  {/* Late fee calculation alert */}
                  {invoice.status !== 'paid' && (() => {
                    const { monthsLate, lateFee, daysOverdue } = calculateLateFee(invoice)
                    const existingLateFee = invoice.late_fee_cents || 0
                    const additionalLateFee = Math.max(0, lateFee - existingLateFee)

                    if (additionalLateFee > 0) {
                      return (
                        <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-red-400 font-medium">Late Fee Due</p>
                              <p className="text-sm text-red-300">
                                {daysOverdue} days overdue ({monthsLate} month{monthsLate > 1 ? 's' : ''} × 5%)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-red-400 font-bold">{formatCurrency(additionalLateFee)}</p>
                              <button
                                onClick={async () => {
                                  const newLateFee = existingLateFee + additionalLateFee
                                  const newTotal = (invoice.subtotal_cents || 0) + newLateFee + (invoice.cc_fee_cents || 0)
                                  const token = sessionStorage.getItem('adminToken')
                                  await fetch(`/api/invoices/update?id=${params.id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                      late_fee_cents: newLateFee,
                                      total_cents: newTotal,
                                      balance_due_cents: newTotal - (invoice.amount_paid_cents || 0),
                                    }),
                                  })
                                  fetchInvoice()
                                }}
                                className="mt-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                Apply Fee
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Notes
              </h2>

              {isEditing ? (
                <textarea
                  value={editedInvoice.notes || ''}
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, notes: e.target.value })}
                  placeholder="Invoice notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                />
              ) : (
                <p className="text-dark-300">{invoice.notes || 'No notes'}</p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-dark-800 border border-red-500/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-dark-400 mb-4">Permanently delete this invoice. This cannot be undone.</p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Invoice
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-dark-400">Total Amount</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(invoice.total_cents)}</p>
                {balanceDue > 0 && balanceDue !== invoice.total_cents && (
                  <p className="text-amber-600 font-medium mt-1">{formatCurrency(balanceDue)} due</p>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Status</span>
                  {getStatusBadge(invoice.status, invoice)}
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Due Date</span>
                  <span className="font-medium">{invoice.due_date ? formatDate(invoice.due_date) : 'Due Upon Receipt'}</span>
                </div>
                {invoice.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-dark-400">Sent</span>
                    <span className="font-medium">{formatDate(invoice.sent_at)}</span>
                  </div>
                )}
                {invoice.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-dark-400">Paid</span>
                    <span className="font-medium text-green-600">{formatDate(invoice.paid_at)}</span>
                  </div>
                )}
                {invoice.check_number && (
                  <div className="flex justify-between">
                    <span className="text-dark-400">Check #</span>
                    <span className="font-medium">{invoice.check_number}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <a
                  href={`/invoice/${invoice.invoice_number}`}
                  target="_blank"
                  className="w-full px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 flex items-center gap-2 justify-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  View as Customer
                </a>
                {invoice.booking_id && (
                  <Link
                    href={`/admin/booking/${invoice.booking_id}`}
                    className="w-full px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 flex items-center gap-2 justify-center"
                  >
                    <Truck className="w-4 h-4" />
                    View Booking
                  </Link>
                )}
                {invoice.customer_id && (
                  <Link
                    href={`/admin/customers/${invoice.customer_id}`}
                    className="w-full px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 flex items-center gap-2 justify-center"
                  >
                    <User className="w-4 h-4" />
                    View Customer
                  </Link>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h3 className="font-semibold mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
                  <span className="text-dark-400">Created {formatDate(invoice.created_at)}</span>
                </div>
                {invoice.sent_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-dark-400">Sent {formatDate(invoice.sent_at)}</span>
                  </div>
                )}
                {invoice.viewed_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-dark-400">Viewed {formatDate(invoice.viewed_at)}</span>
                  </div>
                )}
                {invoice.paid_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-dark-400">Paid {formatDate(invoice.paid_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            {showCardForm ? (
              <>
                <h2 className="text-xl font-bold mb-4">Charge Card</h2>
                <CardPaymentForm
                  amountCents={Math.round(parseFloat(paymentAmount || (balanceDue / 100)) * 100 * 1.0375)}
                  customerName={invoice.customer_name}
                  customerEmail={invoice.customer_email}
                  invoiceId={invoice.id}
                  description={`Invoice #${invoice.invoice_number}`}
                  onSuccess={async (paymentIntent) => {
                    // Record the payment
                    const baseAmount = parseFloat(paymentAmount || (balanceDue / 100))
                    const baseAmountCents = Math.round(baseAmount * 100)
                    const ccFeeCents = Math.round(baseAmountCents * 0.0375)
                    const totalAmountCents = baseAmountCents + ccFeeCents

                    const newAmountPaid = (invoice.amount_paid_cents || 0) + totalAmountCents
                    const newBalanceDue = (invoice.total_cents || 0) - newAmountPaid
                    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial'

                    // Build update data — do not inflate total_cents or accumulate
                    // cc_fee_cents here; the fee is already included in amount_paid_cents.
                    const cardUpdateData = {
                      amount_paid_cents: newAmountPaid,
                      balance_due_cents: Math.max(0, newBalanceDue),
                      status: newStatus,
                      updated_at: new Date().toISOString(),
                    }
                    if (newStatus === 'paid') {
                      cardUpdateData.paid_at = new Date().toISOString()
                    }

                    const token = sessionStorage.getItem('adminToken')
                    await fetch(`/api/invoices/update?id=${params.id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify(cardUpdateData),
                    })

                    setShowPaymentModal(false)
                    setShowCardForm(false)
                    setPaymentAmount('')
                    fetchInvoice()
                  }}
                  onError={(error) => {
                    console.error('Payment failed:', error)
                  }}
                  onCancel={() => setShowCardForm(false)}
                />
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">Record Payment</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder={`${(balanceDue / 100).toFixed(2)}`}
                          className="w-full pl-7 pr-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Date Paid</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-200 mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        <option value="check">Check</option>
                        <option value="ach">ACH Transfer</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="paypal">PayPal</option>
                        <option value="venmo">Venmo</option>
                        <option value="zelle">Zelle</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {paymentMethod === 'check' && (
                      <div>
                        <label className="block text-sm font-medium text-dark-200 mb-1">Check #</label>
                        <input
                          type="text"
                          value={paymentCheckNumber}
                          onChange={(e) => setPaymentCheckNumber(e.target.value)}
                          placeholder="Enter check number"
                          className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* CC Fee notice when card is selected */}
                  {paymentMethod === 'card' && paymentAmount && (
                    <div className="bg-dark-700 rounded-lg p-3 text-sm">
                      <div className="flex justify-between text-dark-300">
                        <span>Payment Amount:</span>
                        <span>${parseFloat(paymentAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-dark-300">
                        <span>CC Fee (3.75%):</span>
                        <span>${(parseFloat(paymentAmount || 0) * 0.0375).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-white border-t border-dark-600 mt-2 pt-2">
                        <span>Total with Fee:</span>
                        <span>${(parseFloat(paymentAmount || 0) * 1.0375).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Additional notes..."
                      className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600"
                  >
                    Cancel
                  </button>
                  {paymentMethod === 'card' ? (
                    <button
                      onClick={() => {
                        // Set default payment amount to balance due if empty
                        if (!paymentAmount) {
                          setPaymentAmount((balanceDue / 100).toFixed(2))
                        }
                        setShowCardForm(true)
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Enter Card Details
                    </button>
                  ) : (
                    <button
                      onClick={handleRecordPayment}
                      disabled={recordingPayment}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {recordingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                      Record Payment
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
