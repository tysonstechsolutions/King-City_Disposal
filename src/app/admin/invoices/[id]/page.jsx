'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { config } from '../../../../config'
import AdminNav from '../../../../components/AdminNav'
import { formatWeight } from '../../../../lib/constants'
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
  CreditCard
} from 'lucide-react'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()

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
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  // Fetch invoice
  const fetchInvoice = useCallback(async () => {
    try {
      const response = await fetch(`/api/invoices?id=${params.id}`)

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
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Get status badge
  const getStatusBadge = (status, dueDate) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'paid'

    if (isOverdue || status === 'overdue') {
      return <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700">Overdue</span>
    }

    const badges = {
      draft: <span className="px-3 py-1 text-sm font-medium rounded-full bg-neutral-100 text-neutral-700">Draft</span>,
      sent: <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">Sent</span>,
      viewed: <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-700">Viewed</span>,
      partial: <span className="px-3 py-1 text-sm font-medium rounded-full bg-amber-100 text-amber-700">Partial</span>,
      paid: <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">Paid</span>,
      void: <span className="px-3 py-1 text-sm font-medium rounded-full bg-neutral-100 text-neutral-500">Void</span>,
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

      const response = await fetch(
        `${config.supabase.url}/rest/v1/invoices?id=eq.${params.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
            'Prefer': 'return=representation',
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
            line_items: JSON.stringify(editedInvoice.line_items),
            subtotal_cents: subtotal,
            total_cents: subtotal,
            notes: editedInvoice.notes,
            due_date: editedInvoice.due_date,
            updated_at: new Date().toISOString(),
          }),
        }
      )

      if (response.ok) {
        const [updated] = await response.json()
        // Parse line_items back
        updated.line_items = typeof updated.line_items === 'string'
          ? JSON.parse(updated.line_items)
          : updated.line_items
        setInvoice(updated)
        setEditedInvoice(updated)
        setIsEditing(false)
      } else {
        alert('Failed to save changes')
      }
    } catch (err) {
      console.error('Error saving:', err)
      alert('Error saving changes')
    }
    setSaving(false)
  }

  // Send invoice
  const handleSend = async () => {
    if (!invoice.customer_phone && !invoice.customer_email) {
      alert('No phone or email on this invoice')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id }),
      })

      if (response.ok) {
        alert('Invoice sent!')
        fetchInvoice()
      } else {
        alert('Failed to send invoice')
      }
    } catch (err) {
      console.error('Error sending:', err)
    }
    setSending(false)
  }

  // Record payment
  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Enter a valid payment amount')
      return
    }

    setRecordingPayment(true)
    try {
      const amountCents = Math.round(parseFloat(paymentAmount) * 100)
      const newAmountPaid = (invoice.amount_paid_cents || 0) + amountCents
      const newBalanceDue = invoice.total_cents - newAmountPaid
      const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial'

      const response = await fetch(
        `${config.supabase.url}/rest/v1/invoices?id=eq.${params.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
          body: JSON.stringify({
            amount_paid_cents: newAmountPaid,
            balance_due_cents: Math.max(0, newBalanceDue),
            status: newStatus,
            paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }),
        }
      )

      if (response.ok) {
        // Record payment in payments table
        await fetch(
          `${config.supabase.url}/rest/v1/payments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': config.supabase.anonKey,
              'Authorization': `Bearer ${config.supabase.anonKey}`,
            },
            body: JSON.stringify({
              invoice_id: invoice.id,
              customer_id: invoice.customer_id,
              amount_cents: amountCents,
              method: paymentMethod,
              notes: paymentNotes,
              paid_at: new Date().toISOString(),
            }),
          }
        )

        setShowPaymentModal(false)
        setPaymentAmount('')
        setPaymentNotes('')
        fetchInvoice()
      } else {
        alert('Failed to record payment')
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      alert('Error recording payment')
    }
    setRecordingPayment(false)
  }

  // Delete invoice
  const handleDelete = async () => {
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/invoices?id=eq.${params.id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )

      if (response.ok) {
        router.push('/admin/invoices')
      } else {
        alert('Failed to delete invoice')
      }
    } catch (err) {
      console.error('Error deleting:', err)
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
      <div className="min-h-screen bg-neutral-50">
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
      <div className="min-h-screen bg-neutral-50">
        <AdminNav />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-neutral-900 mb-2">{error}</h1>
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
    <div className="min-h-screen bg-neutral-50">
      <AdminNav />

      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/invoices" className="text-neutral-500 hover:text-neutral-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-neutral-900 font-mono">
                    {invoice.invoice_number}
                  </h1>
                  {getStatusBadge(invoice.status, invoice.due_date)}
                </div>
                <p className="text-sm text-neutral-500">{invoice.customer_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg flex items-center gap-2"
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
                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  {invoice.status !== 'paid' && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
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
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Customer
              </h2>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editedInvoice.customer_name || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, customer_name: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editedInvoice.customer_phone || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, customer_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editedInvoice.customer_email || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, customer_email: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-medium text-neutral-900">{invoice.customer_name}</p>
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
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Service Details
              </h2>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Service Address</label>
                    <input
                      type="text"
                      value={editedInvoice.service_address || ''}
                      onChange={(e) => setEditedInvoice({ ...editedInvoice, service_address: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Dumpster Size</label>
                      <input
                        type="text"
                        value={editedInvoice.dumpster_size || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, dumpster_size: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Rental Duration</label>
                      <input
                        type="text"
                        value={editedInvoice.rental_duration || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, rental_duration: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Actual Weight (lbs)</label>
                      <input
                        type="number"
                        value={editedInvoice.weight_lbs || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, weight_lbs: parseInt(e.target.value) || null })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Included Weight (lbs)</label>
                      <input
                        type="number"
                        value={editedInvoice.weight_included_lbs || ''}
                        onChange={(e) => setEditedInvoice({ ...editedInvoice, weight_included_lbs: parseInt(e.target.value) || null })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoice.service_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />
                      <span>{invoice.service_address}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {invoice.dumpster_size && (
                      <div>
                        <span className="text-neutral-500">Dumpster:</span>
                        <span className="ml-2 font-medium">{invoice.dumpster_size}</span>
                      </div>
                    )}
                    {invoice.rental_duration && (
                      <div>
                        <span className="text-neutral-500">Duration:</span>
                        <span className="ml-2 font-medium">{invoice.rental_duration}</span>
                      </div>
                    )}
                    {invoice.weight_lbs && (
                      <div>
                        <span className="text-neutral-500">Weight:</span>
                        <span className="ml-2 font-medium">{formatWeight(invoice.weight_lbs)}</span>
                      </div>
                    )}
                    {invoice.weight_included_lbs && (
                      <div>
                        <span className="text-neutral-500">Included:</span>
                        <span className="ml-2 font-medium">{formatWeight(invoice.weight_included_lbs)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
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
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount_cents ? (item.amount_cents / 100).toFixed(2) : ''}
                          onChange={(e) => updateLineItem(index, 'amount_cents', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={editedInvoice.line_items.length <= 1}
                        className="p-2 text-neutral-400 hover:text-red-500 disabled:opacity-30"
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

                  <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-neutral-500">Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(calculateSubtotal(editedInvoice.line_items))}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoice.line_items?.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-neutral-100 last:border-0">
                      <span className="text-neutral-700">{item.description}</span>
                      <span className="font-medium">{formatCurrency(item.amount_cents)}</span>
                    </div>
                  ))}

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
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
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
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                />
              ) : (
                <p className="text-neutral-600">{invoice.notes || 'No notes'}</p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-neutral-500 mb-4">Permanently delete this invoice. This cannot be undone.</p>

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
                    className="px-4 py-2 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200"
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
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-neutral-500">Total Amount</p>
                <p className="text-3xl font-bold text-neutral-900">{formatCurrency(invoice.total_cents)}</p>
                {balanceDue > 0 && balanceDue !== invoice.total_cents && (
                  <p className="text-amber-600 font-medium mt-1">{formatCurrency(balanceDue)} due</p>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Status</span>
                  {getStatusBadge(invoice.status, invoice.due_date)}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Due Date</span>
                  <span className="font-medium">{formatDate(invoice.due_date)}</span>
                </div>
                {invoice.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Sent</span>
                    <span className="font-medium">{formatDate(invoice.sent_at)}</span>
                  </div>
                )}
                {invoice.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Paid</span>
                    <span className="font-medium text-green-600">{formatDate(invoice.paid_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <a
                  href={`/invoice/${invoice.invoice_number}`}
                  target="_blank"
                  className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 flex items-center gap-2 justify-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  View as Customer
                </a>
                {invoice.booking_id && (
                  <Link
                    href={`/admin/booking/${invoice.booking_id}`}
                    className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 flex items-center gap-2 justify-center"
                  >
                    <Truck className="w-4 h-4" />
                    View Booking
                  </Link>
                )}
                {invoice.customer_id && (
                  <Link
                    href={`/admin/customers/${invoice.customer_id}`}
                    className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 flex items-center gap-2 justify-center"
                  >
                    <User className="w-4 h-4" />
                    View Customer
                  </Link>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="font-semibold mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
                  <span className="text-neutral-500">Created {formatDate(invoice.created_at)}</span>
                </div>
                {invoice.sent_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-neutral-500">Sent {formatDate(invoice.sent_at)}</span>
                  </div>
                )}
                {invoice.viewed_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-neutral-500">Viewed {formatDate(invoice.viewed_at)}</span>
                  </div>
                )}
                {invoice.paid_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-neutral-500">Paid {formatDate(invoice.paid_at)}</span>
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`${(balanceDue / 100).toFixed(2)} (full balance)`}
                    className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="venmo">Venmo</option>
                  <option value="zelle">Zelle</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Check #, reference, etc."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={recordingPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recordingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
