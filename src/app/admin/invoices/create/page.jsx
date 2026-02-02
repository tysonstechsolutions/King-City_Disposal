'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { config } from '../../../../config'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Save,
  Loader2,
  User,
  Search,
  FileText,
  Calendar,
  DollarSign,
  Truck,
  Scale,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Printer
} from 'lucide-react'

function CreateInvoiceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState([])
  const [bookings, setBookings] = useState([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const [invoice, setInvoice] = useState({
    customer_id: null,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    booking_id: null,
    service_address: '',
    service_description: '',
    dumpster_size: '20yd',
    rental_duration: '10-day',
    delivery_date: '',
    pickup_date: '',
    weight_lbs: '',
    weight_included_lbs: 6000, // 3 tons default (matches config)
    line_items: [
      { description: '20 Yard Dumpster - 10-Day Rental', amount_cents: 47500 }
    ],
    notes: '',
    payment_terms: 15,
    send_immediately: false,
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchCustomers()
    if (bookingId) {
      fetchBooking(bookingId)
    }
  }, [bookingId])

  const fetchCustomers = async () => {
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/customers?order=name.asc&limit=100`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (response.ok) {
        setCustomers(await response.json())
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
    }
  }

  const fetchBooking = async (id) => {
    setLoading(true)
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/bookings?id=eq.${id}`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (response.ok) {
        const [booking] = await response.json()
        if (booking) {
          prefillFromBooking(booking)
        }
      }
    } catch (err) {
      console.error('Error fetching booking:', err)
    }
    setLoading(false)
  }

  const prefillFromBooking = (booking) => {
    const dumpster = config.dumpsters?.find(d => d.id === booking.dumpster_size)
    const basePrice = dumpster?.pricing?.[booking.rental_duration] || booking.price_cents / 100

    setInvoice(prev => ({
      ...prev,
      booking_id: booking.id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email || '',
      service_address: booking.address,
      dumpster_size: dumpster?.name || booking.dumpster_size,
      rental_duration: booking.rental_duration,
      delivery_date: booking.delivery_date,
      weight_lbs: booking.actual_weight_lbs || '',
      line_items: [
        {
          description: `${dumpster?.name || booking.dumpster_size} - ${booking.rental_duration} Rental`,
          amount_cents: basePrice * 100
        }
      ]
    }))
  }

  const selectCustomer = (customer) => {
    setInvoice(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone || '',
      customer_email: customer.email || '',
      customer_address: [customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', '),
      service_address: prev.service_address || customer.address,
      payment_terms: customer.payment_terms || 15,
    }))
    setShowCustomerSearch(false)
    setCustomerSearch('')
  }

  const addLineItem = () => {
    setInvoice(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: '', amount_cents: null }]
    }))
  }

  const updateLineItem = (index, field, value) => {
    setInvoice(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => 
        i === index ? { ...item, [field]: field === 'amount_cents' ? Math.round(parseFloat(value || 0) * 100) : value } : item
      )
    }))
  }

  const removeLineItem = (index) => {
    if (invoice.line_items.length <= 1) return
    setInvoice(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }))
  }

  const calculateOverage = () => {
    if (!invoice.weight_lbs || !invoice.weight_included_lbs) return 0
    const overageLbs = Math.max(0, parseInt(invoice.weight_lbs) - parseInt(invoice.weight_included_lbs))
    const overageTons = overageLbs / 2000
    const overageRate = config.pricing?.overagePerTon || 75
    return Math.round(overageTons * overageRate * 100)
  }

  const addOverageLineItem = () => {
    const overageCents = calculateOverage()
    if (overageCents <= 0) return

    const overageLbs = parseInt(invoice.weight_lbs) - parseInt(invoice.weight_included_lbs)
    const overageTons = (overageLbs / 2000).toFixed(2)
    setInvoice(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          description: `Weight Overage (${overageTons} tons over limit)`,
          amount_cents: overageCents
        }
      ]
    }))
  }

  const subtotal = invoice.line_items.reduce((sum, item) => sum + (item.amount_cents || 0), 0)

  const handleSubmit = async (sendNow = false) => {
    if (!invoice.customer_name) {
      alert('Customer name is required')
      return
    }

    if (invoice.line_items.every(item => !item.description || item.amount_cents <= 0)) {
      alert('Add at least one line item')
      return
    }

    setSaving(true)

    try {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + invoice.payment_terms)

      const payload = {
        customer_id: invoice.customer_id,
        booking_id: invoice.booking_id,
        customer_name: invoice.customer_name,
        customer_phone: invoice.customer_phone,
        customer_email: invoice.customer_email,
        customer_address: invoice.customer_address,
        service_address: invoice.service_address,
        service_description: invoice.service_description,
        dumpster_size: invoice.dumpster_size,
        rental_duration: invoice.rental_duration,
        delivery_date: invoice.delivery_date || null,
        pickup_date: invoice.pickup_date || null,
        weight_lbs: invoice.weight_lbs ? parseInt(invoice.weight_lbs) : null,
        weight_included_lbs: invoice.weight_included_lbs ? parseInt(invoice.weight_included_lbs) : null,
        line_items: invoice.line_items.filter(item => item.description && item.amount_cents > 0),
        notes: invoice.notes,
        due_date: dueDate.toISOString().split('T')[0],
        subtotal_cents: subtotal,
        total_cents: subtotal,
        status: sendNow ? 'sent' : 'draft',
        sent_at: sendNow ? new Date().toISOString() : null,
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (sendNow && data.invoice?.id) {
          // Send the invoice
          await fetch('/api/invoices/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice_id: data.invoice.id }),
          })
        }

        router.push('/admin/invoices')
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to create invoice')
      }
    } catch (err) {
      console.error('Error creating invoice:', err)
      alert('Error creating invoice')
    }
    setSaving(false)
  }

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.company_name?.toLowerCase().includes(customerSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/invoices" className="text-dark-400 hover:text-dark-200">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Create Invoice</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Customer Section */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Customer
            </h2>

            {/* Customer Search */}
            <div className="relative mb-4">
              <button
                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                className="w-full text-left px-4 py-3 border border-dark-600 rounded-lg hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {invoice.customer_name || 'Select or enter customer...'}
              </button>

              {showCustomerSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-dark-700 z-20 max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-neutral-100">
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-600 rounded-lg text-sm"
                      autoFocus
                    />
                  </div>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.slice(0, 10).map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="w-full text-left px-4 py-2 hover:bg-dark-700"
                      >
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-dark-400">{customer.phone}</p>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-2 text-sm text-dark-400">No customers found</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Name *</label>
                <input
                  type="text"
                  value={invoice.customer_name}
                  onChange={(e) => setInvoice({ ...invoice, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Phone</label>
                <input
                  type="tel"
                  value={invoice.customer_phone}
                  onChange={(e) => setInvoice({ ...invoice, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Email</label>
                <input
                  type="email"
                  value={invoice.customer_email}
                  onChange={(e) => setInvoice({ ...invoice, customer_email: e.target.value })}
                  className="w-full px-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Payment Terms</label>
                <select
                  value={invoice.payment_terms}
                  onChange={(e) => setInvoice({ ...invoice, payment_terms: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value={0}>Due on Receipt</option>
                  <option value={7}>Net 7</option>
                  <option value={15}>Net 15</option>
                  <option value={30}>Net 30</option>
                </select>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Service Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-dark-200 mb-1">Service Address</label>
                <input
                  type="text"
                  value={invoice.service_address}
                  onChange={(e) => setInvoice({ ...invoice, service_address: e.target.value })}
                  className="w-full px-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Dumpster Size</label>
                <input
                  type="text"
                  value={invoice.dumpster_size}
                  onChange={(e) => setInvoice({ ...invoice, dumpster_size: e.target.value })}
                  placeholder="e.g., 20 Yard"
                  className="w-full px-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Rental Duration</label>
                <input
                  type="text"
                  value={invoice.rental_duration}
                  onChange={(e) => setInvoice({ ...invoice, rental_duration: e.target.value })}
                  placeholder="e.g., 10-day"
                  className="w-full px-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Weight & Overage */}
            <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Weight & Overage
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Actual Weight (lbs)</label>
                  <input
                    type="number"
                    value={invoice.weight_lbs}
                    onChange={(e) => setInvoice({ ...invoice, weight_lbs: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Included (lbs)</label>
                  <input
                    type="number"
                    value={invoice.weight_included_lbs}
                    onChange={(e) => setInvoice({ ...invoice, weight_included_lbs: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 text-white border border-dark-600 rounded-lg"
                  />
                </div>
                <div className="flex items-end">
                  {calculateOverage() > 0 && (
                    <button
                      type="button"
                      onClick={addOverageLineItem}
                      className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200"
                    >
                      Add ${(calculateOverage() / 100).toFixed(2)} Overage
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Line Items
            </h2>

            <div className="space-y-3">
              {invoice.line_items.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount_cents ? (item.amount_cents / 100).toFixed(2) : ''}
                      onChange={(e) => updateLineItem(index, 'amount_cents', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={invoice.line_items.length <= 1}
                    className="p-2 text-dark-500 hover:text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLineItem}
              className="mt-3 flex items-center gap-2 text-primary hover:text-primary/80"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>

            {/* Total */}
            <div className="mt-6 pt-4 border-t border-dark-700 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-dark-400">Total</p>
                <p className="text-2xl font-bold">${(subtotal / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <textarea
              value={invoice.notes}
              onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
              placeholder="Notes to appear on invoice..."
              rows={3}
              className="w-full px-3 py-2 border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowPreview(true)}
              disabled={!invoice.customer_name}
              className="flex items-center gap-2 px-6 py-3 bg-dark-600 text-dark-100 rounded-lg font-medium hover:bg-dark-500 disabled:opacity-50"
            >
              <Eye className="w-5 h-5" />
              Preview
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-dark-700 text-dark-200 rounded-lg font-medium hover:bg-dark-600 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Save & Send
            </button>
          </div>
        </div>
      </main>

      {/* Click outside to close customer search */}
      {showCustomerSearch && (
        <div className="fixed inset-0 z-10" onClick={() => setShowCustomerSearch(false)} />
      )}

      {/* Invoice Preview Modal */}
      {showPreview && (
        <InvoicePreviewModal
          invoice={invoice}
          subtotal={subtotal}
          config={config}
          onClose={() => setShowPreview(false)}
          onSendNow={() => {
            setShowPreview(false)
            handleSubmit(true)
          }}
        />
      )}
    </div>
  )
}

// Invoice Preview Modal Component
function InvoicePreviewModal({ invoice, subtotal, config, onClose, onSendNow }) {
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

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (invoice.payment_terms || 15))

  const lineItems = invoice.line_items.filter(item => item.description && item.amount_cents > 0)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice Preview - ${config.businessName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
          .header { background: #f97316; color: white; padding: 24px; margin: -40px -40px 24px; }
          .header h1 { font-size: 24px; margin-bottom: 4px; }
          .header p { opacity: 0.8; }
          .header-right { float: right; text-align: right; }
          .header-right .label { font-size: 12px; opacity: 0.6; }
          .header-right .value { font-size: 20px; font-weight: bold; font-family: monospace; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
          .grid { display: flex; gap: 24px; }
          .grid > div { flex: 1; }
          .service-box { background: #f5f5f5; padding: 16px; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { text-align: left; padding: 12px; border-bottom: 2px solid #e5e5e5; font-size: 12px; color: #666; text-transform: uppercase; }
          th:last-child { text-align: right; }
          td { padding: 12px; border-bottom: 1px solid #e5e5e5; }
          td:last-child { text-align: right; font-weight: 500; }
          .totals { text-align: right; margin-top: 16px; }
          .totals .row { display: flex; justify-content: flex-end; gap: 24px; margin-bottom: 8px; }
          .totals .label { color: #666; }
          .totals .total { font-size: 18px; font-weight: bold; padding-top: 8px; border-top: 2px solid #e5e5e5; }
          .notes { background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 24px; }
          .notes-title { font-size: 12px; color: #666; margin-bottom: 4px; }
          .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5; color: #666; }
          @media print { body { padding: 20px; } .header { margin: -20px -20px 24px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-right">
            <div class="label">INVOICE</div>
            <div class="value">PREVIEW</div>
          </div>
          <h1>${config.businessName}</h1>
          <p>${config.phone}</p>
          ${config.email ? `<p>${config.email}</p>` : ''}
        </div>

        <div class="section">
          <div class="grid">
            <div>
              <div class="section-title">Bill To</div>
              <p style="font-weight: 600; font-size: 18px;">${invoice.customer_name}</p>
              ${invoice.customer_address ? `<p>${invoice.customer_address}</p>` : ''}
              ${invoice.customer_phone ? `<p>📞 ${invoice.customer_phone}</p>` : ''}
              ${invoice.customer_email ? `<p>✉️ ${invoice.customer_email}</p>` : ''}
            </div>
            <div style="text-align: right;">
              <p><span style="color: #666;">Invoice Date:</span> ${formatDate(new Date())}</p>
              <p><span style="color: #666;">Due Date:</span> ${invoice.payment_terms === 0 ? 'Due Upon Receipt' : formatDate(dueDate)}</p>
            </div>
          </div>
        </div>

        ${(invoice.service_address || invoice.dumpster_size) ? `
        <div class="section">
          <div class="service-box">
            <div class="section-title">Service Details</div>
            <div class="grid">
              ${invoice.service_address ? `
              <div>
                <p style="font-size: 12px; color: #666;">Service Address</p>
                <p style="font-weight: 500;">📍 ${invoice.service_address}</p>
              </div>
              ` : ''}
              ${invoice.dumpster_size ? `
              <div>
                <p style="font-size: 12px; color: #666;">Dumpster</p>
                <p style="font-weight: 500;">🚛 ${invoice.dumpster_size}</p>
                ${invoice.rental_duration ? `<p style="font-size: 12px; color: #666;">${invoice.rental_duration}</p>` : ''}
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${formatCurrency(item.amount_cents)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span class="label">Subtotal</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div class="row total">
              <span>Total</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>

        ${invoice.notes ? `
        <div class="notes">
          <div class="notes-title">Notes</div>
          <p>${invoice.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p style="margin-top: 4px;">${config.businessName} • ${config.phone}</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Invoice Preview
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button onClick={onClose} className="text-dark-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Invoice Preview Card */}
          <div className="bg-white text-neutral-900 rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-primary text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">{config.businessName}</h1>
                  <p className="text-white/80">{config.phone}</p>
                  {config.email && <p className="text-white/80">{config.email}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">INVOICE</p>
                  <p className="text-xl font-bold font-mono">PREVIEW</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Bill To & Invoice Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-2">Bill To</h2>
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
                      <span className="text-neutral-400">Invoice Date:</span>
                      <span className="font-medium">{formatDate(new Date())}</span>
                    </div>
                    <div className="flex md:justify-end gap-2">
                      <span className="text-neutral-400">Due Date:</span>
                      <span className="font-medium">
                        {invoice.payment_terms === 0 ? 'Due Upon Receipt' : formatDate(dueDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Details */}
              {(invoice.service_address || invoice.dumpster_size) && (
                <div className="bg-neutral-100 rounded-lg p-4 mb-6">
                  <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Service Details</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {invoice.service_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-neutral-400">Service Address</p>
                          <p className="font-medium">{invoice.service_address}</p>
                        </div>
                      </div>
                    )}
                    {invoice.dumpster_size && (
                      <div className="flex items-start gap-2">
                        <Truck className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-neutral-400">Dumpster</p>
                          <p className="font-medium">{invoice.dumpster_size}</p>
                          {invoice.rental_duration && <p className="text-sm text-neutral-400">{invoice.rental_duration}</p>}
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
                      <th className="text-left py-3 text-sm font-semibold text-neutral-400">Description</th>
                      <th className="text-right py-3 text-sm font-semibold text-neutral-400 w-32">Amount</th>
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
                      <span className="text-neutral-500">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-neutral-200">
                      <span>Total</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-6 p-4 bg-neutral-100 rounded-lg">
                  <p className="text-sm text-neutral-400 mb-1">Notes</p>
                  <p className="text-neutral-700">{invoice.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-neutral-200 text-center text-sm text-neutral-400">
                <p>Thank you for your business!</p>
                <p className="mt-1">{config.businessName} • {config.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 justify-end p-4 border-t border-dark-700 bg-dark-800">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-dark-700 text-dark-200 rounded-lg font-medium hover:bg-dark-600"
          >
            Close
          </button>
          <button
            onClick={onSendNow}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
            Save & Send Invoice
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <CreateInvoiceContent />
    </Suspense>
  )
}
