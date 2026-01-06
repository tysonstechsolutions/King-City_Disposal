'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { config } from '../../../../config'
import AdminNav from '../../../../components/AdminNav'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Star,
  AlertTriangle,
  DollarSign,
  Calendar,
  FileText,
  Receipt,
  Plus,
  Loader2,
  CheckCircle2,
  Edit3,
  Save,
  Truck,
  Send,
  ExternalLink
} from 'lucide-react'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [customer, setCustomer] = useState(null)
  const [bookings, setBookings] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({})
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)

  const fetchCustomer = useCallback(async () => {
    try {
      // Fetch customer
      const customerRes = await fetch(
        `${config.supabase.url}/rest/v1/customers?id=eq.${params.id}`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (customerRes.ok) {
        const data = await customerRes.json()
        if (data.length > 0) {
          setCustomer(data[0])
          setFormData(data[0])
        }
      }

      // Fetch customer's bookings
      const bookingsRes = await fetch(
        `${config.supabase.url}/rest/v1/bookings?customer_id=eq.${params.id}&order=created_at.desc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (bookingsRes.ok) {
        setBookings(await bookingsRes.json())
      }

      // Fetch customer's invoices
      const invoicesRes = await fetch(
        `${config.supabase.url}/rest/v1/invoices?customer_id=eq.${params.id}&order=created_at.desc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (invoicesRes.ok) {
        setInvoices(await invoicesRes.json())
      }

    } catch (err) {
      console.error('Error fetching customer:', err)
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    fetchCustomer()
  }, [fetchCustomer])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/customers?id=eq.${params.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
          body: JSON.stringify(formData),
        }
      )
      if (response.ok) {
        setCustomer(formData)
        setEditing(false)
      }
    } catch (err) {
      console.error('Error saving:', err)
    }
    setSaving(false)
  }

  const createQuickInvoice = async (invoiceData) => {
    setCreatingInvoice(true)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email,
          customer_address: customer.address,
          service_address: invoiceData.service_address || customer.address,
          service_description: invoiceData.description,
          line_items: [
            {
              description: invoiceData.description,
              amount_cents: Math.round(invoiceData.amount * 100),
            }
          ],
          subtotal_cents: Math.round(invoiceData.amount * 100),
          tax_cents: 0,
          total_cents: Math.round(invoiceData.amount * 100),
          due_date: invoiceData.due_date,
          notes: invoiceData.notes,
        }),
      })

      if (response.ok) {
        setShowNewInvoice(false)
        fetchCustomer()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to create invoice')
      }
    } catch (err) {
      console.error('Error creating invoice:', err)
    }
    setCreatingInvoice(false)
  }

  const sendInvoice = async (invoiceId) => {
    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })
      if (response.ok) {
        alert('Invoice sent!')
        fetchCustomer()
      }
    } catch (err) {
      console.error('Error sending invoice:', err)
    }
  }

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format((cents || 0) / 100)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <AdminNav />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <AdminNav />
        <div className="max-w-4xl mx-auto p-6 text-center">
          <p className="text-neutral-500">Customer not found</p>
          <button onClick={() => router.push('/admin/customers')} className="mt-4 text-primary">
            Back to Customers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminNav />

      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/admin/customers')}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Customers
            </button>

            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => { setEditing(false); setFormData(customer); }}
                    className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg flex items-center gap-2 hover:bg-neutral-200"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left Column - Customer Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                  customer.is_flagged
                    ? 'bg-red-100 text-red-600'
                    : customer.is_vip
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {customer.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{editing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="border rounded px-2 py-1"
                      />
                    ) : customer.name}</h1>
                    {customer.is_vip && <Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
                    {customer.is_flagged && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </div>
                  {customer.is_business && customer.company_name && (
                    <p className="text-neutral-500 flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {editing ? (
                        <input
                          type="text"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          className="border rounded px-2 py-1 text-sm"
                        />
                      ) : customer.company_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="border rounded px-2 py-1 flex-1"
                    />
                  ) : (
                    <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                      {customer.phone || '-'}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  {editing ? (
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="border rounded px-2 py-1 flex-1"
                    />
                  ) : (
                    <span>{customer.email || '-'}</span>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />
                  {editing ? (
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="border rounded px-2 py-1 flex-1"
                    />
                  ) : (
                    <span>{customer.address || '-'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="font-semibold mb-4">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Total Jobs</p>
                  <p className="text-2xl font-bold">{customer.total_jobs || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Total Spent</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(customer.total_spent_cents)}
                  </p>
                </div>
                {customer.outstanding_balance_cents > 0 && (
                  <div className="col-span-2 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Outstanding Balance</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(customer.outstanding_balance_cents)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="font-semibold mb-2">Notes</h3>
              {editing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-neutral-600">{customer.notes || 'No notes'}</p>
              )}
            </div>
          </div>

          {/* Right Column - Invoices & Bookings */}
          <div className="lg:col-span-2 space-y-6">

            {/* Create Invoice Section */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Invoices
                </h3>
                <button
                  onClick={() => setShowNewInvoice(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </button>
              </div>

              {invoices.length === 0 ? (
                <p className="text-neutral-500 text-sm">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div>
                        <p className="font-medium">{inv.invoice_number}</p>
                        <p className="text-sm text-neutral-500">{formatDate(inv.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm px-2 py-1 rounded ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                          inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-neutral-100 text-neutral-700'
                        }`}>
                          {inv.status}
                        </span>
                        <span className="font-semibold">{formatCurrency(inv.total_cents)}</span>
                        <div className="flex gap-1">
                          {inv.status === 'draft' && (
                            <button
                              onClick={() => sendInvoice(inv.id)}
                              className="p-2 text-primary hover:bg-primary/10 rounded"
                              title="Send Invoice"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                            className="p-2 text-neutral-500 hover:bg-neutral-100 rounded"
                            title="View"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bookings */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-primary" />
                Bookings ({bookings.length})
              </h3>

              {bookings.length === 0 ? (
                <p className="text-neutral-500 text-sm">No bookings yet</p>
              ) : (
                <div className="space-y-2">
                  {bookings.map(booking => (
                    <div
                      key={booking.id}
                      onClick={() => router.push(`/admin/booking/${booking.id}`)}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100"
                    >
                      <div>
                        <p className="font-medium">{booking.dumpster_size} - {booking.address}</p>
                        <p className="text-sm text-neutral-500">
                          {formatDate(booking.delivery_date)} - {booking.status}
                        </p>
                      </div>
                      <span className="font-semibold">{formatCurrency(booking.price_cents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* New Invoice Modal */}
      {showNewInvoice && (
        <NewInvoiceModal
          customer={customer}
          onClose={() => setShowNewInvoice(false)}
          onSubmit={createQuickInvoice}
          loading={creatingInvoice}
        />
      )}
    </div>
  )
}

// New Invoice Modal
function NewInvoiceModal({ customer, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    service_address: customer.address || '',
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.description || !formData.amount) {
      alert('Please fill in description and amount')
      return
    }
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Create Invoice for {customer.name}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., 20 Yard Dumpster - 10 Day Rental"
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Service Address</label>
            <input
              type="text"
              value={formData.service_address}
              onChange={(e) => setFormData({ ...formData, service_address: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:text-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
