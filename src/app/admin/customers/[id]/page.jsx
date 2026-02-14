'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { config } from '../../../../config'
import AdminNav from '../../../../components/AdminNav'
import { useToast } from '../../../../components/Toast'
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
  ExternalLink,
  Trash2,
  CreditCard,
  Banknote,
  X
} from 'lucide-react'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()

  const [customer, setCustomer] = useState(null)
  const [bookings, setBookings] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({})
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('check')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentCheckNumber, setPaymentCheckNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [recordingPayment, setRecordingPayment] = useState(false)

  const fetchCustomer = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('adminToken')
      const headers = { 'Authorization': `Bearer ${token}` }

      // Fetch customer
      const customerRes = await fetch(`/api/admin/customers?id=${params.id}`, { headers })
      if (customerRes.ok) {
        const data = await customerRes.json()
        const list = Array.isArray(data) ? data : (data.customers || [])
        if (list.length > 0) {
          setCustomer(list[0])
          setFormData(list[0])
        } else {
          console.error('Customer API returned empty list for id:', params.id, data)
        }
      } else {
        console.error('Customer API error:', customerRes.status, await customerRes.text())
      }

      // Fetch customer's bookings & invoices via Supabase REST with service role key
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || config.supabase.anonKey
      const supabaseHeaders = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      }

      const [bookingsRes, invoicesRes] = await Promise.all([
        fetch(`${config.supabase.url}/rest/v1/bookings?customer_id=eq.${params.id}&order=created_at.desc`, { headers: supabaseHeaders }),
        fetch(`${config.supabase.url}/rest/v1/invoices?customer_id=eq.${params.id}&order=created_at.desc`, { headers: supabaseHeaders }),
      ])

      if (bookingsRes.ok) setBookings(await bookingsRes.json())
      if (invoicesRes.ok) setInvoices(await invoicesRes.json())

    } catch (err) {
      console.error('Error fetching customer:', err)
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchCustomer()
  }, [fetchCustomer])

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('adminToken')
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/customers/update?id=${params.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          company_name: formData.company_name,
          notes: formData.notes,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        const updated = Array.isArray(data) && data.length > 0 ? data[0] : formData
        setCustomer(updated)
        setFormData(updated)
        setEditing(false)
        toast.success('Customer updated')
      } else {
        const errData = await response.text()
        console.error('Customer update failed:', errData)
        toast.error('Failed to save changes')
      }
    } catch (err) {
      console.error('Error saving:', err)
      toast.error('Error saving changes')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${customer.name}? This cannot be undone.`)) {
      return
    }
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/customers/update?id=${params.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        toast.success('Customer deleted')
        router.push('/admin/customers')
      } else {
        toast.error('Failed to delete customer')
      }
    } catch (err) {
      console.error('Error deleting:', err)
      toast.error('Error deleting customer')
    }
    setDeleting(false)
  }

  const createQuickInvoice = async (invoiceData) => {
    setCreatingInvoice(true)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`,
        },
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
        toast.success('Invoice created')
        fetchCustomer()
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

  const sendInvoice = async (invoiceId) => {
    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })
      if (response.ok) {
        toast.success('Invoice sent!')
        fetchCustomer()
      } else {
        toast.error('Failed to send invoice')
      }
    } catch (err) {
      console.error('Error sending invoice:', err)
      toast.error('Error sending invoice')
    }
  }

  // Calculate outstanding invoices
  const outstandingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'void')
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => {
    const balance = inv.balance_due_cents ?? (inv.total_cents - (inv.amount_paid_cents || 0))
    return sum + balance
  }, 0)

  // Record bulk payment across all outstanding invoices
  const handleRecordBulkPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.warning('Enter a valid payment amount')
      return
    }

    setRecordingPayment(true)
    try {
      let remainingPayment = Math.round(parseFloat(paymentAmount) * 100)
      const paidAtDate = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString()

      // Sort invoices by date (oldest first) to pay off oldest debts first
      const sortedInvoices = [...outstandingInvoices].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      )

      for (const inv of sortedInvoices) {
        if (remainingPayment <= 0) break

        const invoiceBalance = inv.balance_due_cents ?? (inv.total_cents - (inv.amount_paid_cents || 0))
        if (invoiceBalance <= 0) continue

        const paymentForThisInvoice = Math.min(remainingPayment, invoiceBalance)
        remainingPayment -= paymentForThisInvoice

        const newAmountPaid = (inv.amount_paid_cents || 0) + paymentForThisInvoice
        const newBalanceDue = inv.total_cents - newAmountPaid
        const newStatus = newBalanceDue <= 0 ? 'paid' : 'partial'

        // Build notes
        let fullNotes = inv.notes || ''
        if (paymentCheckNumber && paymentMethod === 'check') {
          fullNotes += `${fullNotes ? '\n' : ''}Payment: Check #${paymentCheckNumber} - ${formatCurrency(paymentForThisInvoice)} on ${new Date(paidAtDate).toLocaleDateString()}`
        } else if (paymentNotes) {
          fullNotes += `${fullNotes ? '\n' : ''}Payment: ${paymentNotes} - ${formatCurrency(paymentForThisInvoice)} on ${new Date(paidAtDate).toLocaleDateString()}`
        }

        const updateData = {
          amount_paid_cents: newAmountPaid,
          balance_due_cents: Math.max(0, newBalanceDue),
          status: newStatus,
          updated_at: new Date().toISOString(),
          notes: fullNotes,
        }

        if (newStatus === 'paid') {
          updateData.paid_at = paidAtDate
        }

        await fetch(`/api/invoices/update?id=${inv.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData),
        })
      }

      // If there's remaining payment after all invoices are paid, add to customer credit
      if (remainingPayment > 0) {
        const newCreditBalance = (customer.credit_balance_cents || 0) + remainingPayment
        await fetch(`/api/admin/customers/update?id=${params.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ credit_balance_cents: newCreditBalance }),
        })
        toast.success(`Payment recorded. ${formatCurrency(remainingPayment)} added to account credit.`)
      } else {
        toast.success('Payment recorded successfully')
      }

      setShowPaymentModal(false)
      setPaymentAmount('')
      setPaymentNotes('')
      setPaymentCheckNumber('')
      setPaymentDate('')
      fetchCustomer()
    } catch (err) {
      console.error('Error recording payment:', err)
      toast.error('Error recording payment')
    }
    setRecordingPayment(false)
  }

  // Toggle customer flagged status
  const toggleFlag = async () => {
    try {
      const newFlaggedStatus = !customer.is_flagged
      const response = await fetch(`/api/admin/customers/update?id=${params.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_flagged: newFlaggedStatus }),
      })
      if (response.ok) {
        setCustomer({ ...customer, is_flagged: newFlaggedStatus })
        setFormData({ ...formData, is_flagged: newFlaggedStatus })
        toast.success(newFlaggedStatus ? 'Customer flagged' : 'Flag removed')
      } else {
        toast.error('Failed to update customer')
      }
    } catch (err) {
      console.error('Error toggling flag:', err)
      toast.error('Error updating customer')
    }
  }

  // Toggle customer VIP status
  const toggleVIP = async () => {
    try {
      const newVIPStatus = !customer.is_vip
      const response = await fetch(`/api/admin/customers/update?id=${params.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_vip: newVIPStatus }),
      })
      if (response.ok) {
        setCustomer({ ...customer, is_vip: newVIPStatus })
        setFormData({ ...formData, is_vip: newVIPStatus })
        toast.success(newVIPStatus ? 'Customer marked as VIP' : 'VIP status removed')
      } else {
        toast.error('Failed to update customer')
      }
    } catch (err) {
      console.error('Error toggling VIP:', err)
      toast.error('Error updating customer')
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
      <div className="min-h-screen bg-dark-900">
        <AdminNav />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-dark-900">
        <AdminNav />
        <div className="max-w-4xl mx-auto p-6 text-center">
          <p className="text-dark-400">Customer not found</p>
          <button onClick={() => router.push('/admin/customers')} className="mt-4 text-primary">
            Back to Customers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/admin/customers')}
              className="flex items-center gap-2 text-dark-400 hover:text-dark-200"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Customers
            </button>

            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => { setEditing(false); setFormData(customer); }}
                    className="px-4 py-2 text-dark-300 hover:text-dark-200"
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
                <>
                  <button
                    onClick={toggleFlag}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      customer.is_flagged
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                    }`}
                    title={customer.is_flagged ? 'Remove flag' : 'Flag customer'}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {customer.is_flagged ? 'Flagged' : 'Flag'}
                  </button>
                  <button
                    onClick={toggleVIP}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      customer.is_vip
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                    }`}
                    title={customer.is_vip ? 'Remove VIP' : 'Mark as VIP'}
                  >
                    <Star className={`w-4 h-4 ${customer.is_vip ? 'fill-white' : ''}`} />
                    VIP
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg flex items-center gap-2 hover:bg-red-200"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-dark-700 text-dark-200 rounded-lg flex items-center gap-2 hover:bg-dark-600"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </>
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
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
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
                    <h1 className="text-xl font-bold text-white">{editing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="border border-dark-600 rounded px-2 py-1 bg-dark-700 text-white"
                      />
                    ) : customer.name}</h1>
                    {customer.is_vip && <Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
                    {customer.is_flagged && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </div>
                  {customer.is_business && customer.company_name && (
                    <p className="text-dark-400 flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {editing ? (
                        <input
                          type="text"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          className="border border-dark-600 rounded px-2 py-1 text-sm bg-dark-700 text-white"
                        />
                      ) : customer.company_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-dark-500" />
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="border border-dark-600 rounded px-2 py-1 flex-1 bg-dark-700 text-white"
                    />
                  ) : (
                    <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                      {customer.phone || '-'}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-dark-500" />
                  {editing ? (
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="border border-dark-600 rounded px-2 py-1 flex-1 bg-dark-700 text-white"
                    />
                  ) : (
                    <span className="text-dark-200">{customer.email || '-'}</span>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-dark-500 mt-0.5" />
                  {editing ? (
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="border border-dark-600 rounded px-2 py-1 flex-1 bg-dark-700 text-white"
                    />
                  ) : (
                    <span className="text-dark-200">{customer.address || '-'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h3 className="font-semibold mb-4 text-white">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-dark-400">Total Jobs</p>
                  <p className="text-2xl font-bold text-white">{bookings.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-dark-400">Total Invoiced</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total_cents || 0), 0))}
                  </p>
                </div>
                {/* Credit Balance - show prominently if customer has credit */}
                {customer.credit_balance_cents > 0 && (
                  <div className="col-span-2 p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-sm text-emerald-400">Account Credit</p>
                        <p className="text-xl font-bold text-emerald-400">
                          {formatCurrency(customer.credit_balance_cents)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {totalOutstanding > 0 && (
                  <div className="col-span-2 p-3 bg-red-900/30 border border-red-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-400">Outstanding Balance ({outstandingInvoices.length} invoice{outstandingInvoices.length !== 1 ? 's' : ''})</p>
                        <p className="text-xl font-bold text-red-400">
                          {formatCurrency(totalOutstanding)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setPaymentAmount((totalOutstanding / 100).toFixed(2))
                          setPaymentDate(new Date().toISOString().split('T')[0])
                          setShowPaymentModal(true)
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                      >
                        <CreditCard className="w-4 h-4" />
                        Make Payment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h3 className="font-semibold mb-2 text-white">Notes</h3>
              {editing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-dark-600 rounded px-3 py-2 text-sm bg-dark-700 text-white"
                  rows={4}
                />
              ) : (
                <p className="text-sm text-dark-300">{customer.notes || 'No notes'}</p>
              )}
            </div>
          </div>

          {/* Right Column - Invoices & Bookings */}
          <div className="lg:col-span-2 space-y-6">

            {/* Create Invoice Section */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Invoices
                </h3>
                <button
                  onClick={() => router.push(`/admin/invoices/create?customer=${customer.id}`)}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm flex items-center gap-2 hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </button>
              </div>

              {invoices.length === 0 ? (
                <p className="text-dark-400 text-sm">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                      <div>
                        <p className="font-medium text-white">{inv.invoice_number}</p>
                        <p className="text-sm text-dark-400">{formatDate(inv.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm px-2 py-1 rounded ${
                          inv.status === 'paid' ? 'bg-green-900/50 text-green-400' :
                          inv.status === 'sent' ? 'bg-blue-900/50 text-blue-400' :
                          inv.status === 'overdue' ? 'bg-red-900/50 text-red-400' :
                          'bg-dark-600 text-dark-200'
                        }`}>
                          {inv.status}
                        </span>
                        <span className="font-semibold text-white">{formatCurrency(inv.total_cents)}</span>
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
                            className="p-2 text-dark-400 hover:bg-dark-600 rounded"
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
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4 text-white">
                <Truck className="w-5 h-5 text-primary" />
                Bookings ({bookings.length})
              </h3>

              {bookings.length === 0 ? (
                <p className="text-dark-400 text-sm">No bookings yet</p>
              ) : (
                <div className="space-y-2">
                  {bookings.map(booking => (
                    <div
                      key={booking.id}
                      onClick={() => router.push(`/admin/booking/${booking.id}`)}
                      className="flex items-center justify-between p-3 bg-dark-700 rounded-lg cursor-pointer hover:bg-dark-600"
                    >
                      <div>
                        <p className="font-medium text-white">{booking.dumpster_size} - {booking.address}</p>
                        <p className="text-sm text-dark-400">
                          {formatDate(booking.delivery_date)} - {booking.status}
                        </p>
                      </div>
                      <span className="font-semibold text-white">{formatCurrency(booking.price_cents)}</span>
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
          onValidationError={(msg) => toast.warning(msg)}
        />
      )}

      {/* Bulk Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-dark-700 rounded-lg">
              <p className="text-sm text-dark-400">Paying {outstandingInvoices.length} outstanding invoice{outstandingInvoices.length !== 1 ? 's' : ''}</p>
              <p className="text-lg font-bold text-white">Total Due: {formatCurrency(totalOutstanding)}</p>
            </div>

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
                      placeholder={`${(totalOutstanding / 100).toFixed(2)}`}
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

              {/* Info about how payment will be applied */}
              <div className="text-xs text-dark-400 p-2 bg-dark-900 rounded">
                Payment will be applied to oldest invoices first.
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordBulkPayment}
                disabled={recordingPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recordingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// New Invoice Modal
function NewInvoiceModal({ customer, onClose, onSubmit, loading, onValidationError }) {
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
      onValidationError?.('Please fill in description and amount')
      return
    }
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-bold text-white">Create Invoice for {customer.name}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-dark-200">Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., 20 Yard Dumpster - 10 Day Rental"
              className="w-full border border-dark-600 rounded-lg px-3 py-2 bg-dark-700 text-white placeholder-dark-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-dark-200">Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full border border-dark-600 rounded-lg px-3 py-2 bg-dark-700 text-white placeholder-dark-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-dark-200">Service Address</label>
            <input
              type="text"
              value={formData.service_address}
              onChange={(e) => setFormData({ ...formData, service_address: e.target.value })}
              className="w-full border border-dark-600 rounded-lg px-3 py-2 bg-dark-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-dark-200">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full border border-dark-600 rounded-lg px-3 py-2 bg-dark-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-dark-200">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-dark-600 rounded-lg px-3 py-2 bg-dark-700 text-white"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-dark-300 hover:text-dark-200"
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
