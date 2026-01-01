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
  Scale
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

  const [invoice, setInvoice] = useState({
    customer_id: null,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    booking_id: null,
    service_address: '',
    service_description: '',
    dumpster_size: '',
    rental_duration: '',
    delivery_date: '',
    pickup_date: '',
    weight_lbs: '',
    weight_included_lbs: 4000, // 2 tons default
    line_items: [
      { description: '', amount_cents: 0 }
    ],
    notes: '',
    payment_terms: 15,
    send_immediately: false,
  })

  useEffect(() => {
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
      line_items: [...prev.line_items, { description: '', amount_cents: 0 }]
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
    setInvoice(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          description: `Weight Overage (${overageLbs.toLocaleString()} lbs over limit)`,
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
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/invoices" className="text-neutral-500 hover:text-neutral-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-neutral-900">Create Invoice</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Customer Section */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Customer
            </h2>

            {/* Customer Search */}
            <div className="relative mb-4">
              <button
                onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                className="w-full text-left px-4 py-3 border border-neutral-300 rounded-lg hover:border-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {invoice.customer_name || 'Select or enter customer...'}
              </button>

              {showCustomerSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-neutral-200 z-20 max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-neutral-100">
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                      autoFocus
                    />
                  </div>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.slice(0, 10).map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-50"
                      >
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-neutral-500">{customer.phone}</p>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-2 text-sm text-neutral-500">No customers found</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={invoice.customer_name}
                  onChange={(e) => setInvoice({ ...invoice, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={invoice.customer_phone}
                  onChange={(e) => setInvoice({ ...invoice, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                <input
                  type="email"
                  value={invoice.customer_email}
                  onChange={(e) => setInvoice({ ...invoice, customer_email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Terms</label>
                <select
                  value={invoice.payment_terms}
                  onChange={(e) => setInvoice({ ...invoice, payment_terms: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Service Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Service Address</label>
                <input
                  type="text"
                  value={invoice.service_address}
                  onChange={(e) => setInvoice({ ...invoice, service_address: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Dumpster Size</label>
                <input
                  type="text"
                  value={invoice.dumpster_size}
                  onChange={(e) => setInvoice({ ...invoice, dumpster_size: e.target.value })}
                  placeholder="e.g., 20 Yard"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Rental Duration</label>
                <input
                  type="text"
                  value={invoice.rental_duration}
                  onChange={(e) => setInvoice({ ...invoice, rental_duration: e.target.value })}
                  placeholder="e.g., 10-day"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
                  <label className="block text-sm text-neutral-600 mb-1">Actual Weight (lbs)</label>
                  <input
                    type="number"
                    value={invoice.weight_lbs}
                    onChange={(e) => setInvoice({ ...invoice, weight_lbs: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-600 mb-1">Included (lbs)</label>
                  <input
                    type="number"
                    value={invoice.weight_included_lbs}
                    onChange={(e) => setInvoice({ ...invoice, weight_included_lbs: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
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
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
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
                    disabled={invoice.line_items.length <= 1}
                    className="p-2 text-neutral-400 hover:text-red-500 disabled:opacity-30"
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
            <div className="mt-6 pt-4 border-t border-neutral-200 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-neutral-500">Total</p>
                <p className="text-2xl font-bold">${(subtotal / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <textarea
              value={invoice.notes}
              onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
              placeholder="Notes to appear on invoice..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50"
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
