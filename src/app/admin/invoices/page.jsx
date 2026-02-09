'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import { useToast } from '../../../components/Toast'
import {
  FileText,
  Plus,
  Search,
  Send,
  Eye,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Calendar,
  FileSpreadsheet,
  Users,
  ChevronDown,
  X,
  Filter,
  ExternalLink
} from 'lucide-react'

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [showActions, setShowActions] = useState(null)
  const [sendingId, setSendingId] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      // Always fetch ALL invoices so stats remain accurate
      const response = await fetch(
        `${config.supabase.url}/rest/v1/invoices?order=created_at.desc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (err) {
      console.error('Error fetching invoices:', err)
    }
    setLoading(false)
  }

  const sendInvoice = async (e, invoice) => {
    e.stopPropagation()
    if (!invoice.customer_phone && !invoice.customer_email) {
      toast.error('No phone or email on this invoice')
      return
    }

    setSendingId(invoice.id)
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
          toast.warning('Invoice updated but delivery failed - check Twilio/Resend config')
        }
        fetchInvoices()
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Failed to send invoice')
      }
    } catch (err) {
      console.error('Error sending invoice:', err)
    }
    setSendingId(null)
    setShowActions(null)
  }

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format((cents || 0) / 100)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Get status badge with improved styling
  const getStatusBadge = (status, dueDate, invoiceDate) => {
    let isOverdue = false

    if (status !== 'paid') {
      if (dueDate) {
        isOverdue = new Date(dueDate) < new Date()
      } else if (invoiceDate) {
        const gracePeriodEnd = new Date(invoiceDate)
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30)
        isOverdue = new Date() > gracePeriodEnd
      }
    }

    if (isOverdue || status === 'overdue') {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Overdue</span>
    }

    const badges = {
      draft: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-dark-600 text-dark-300 border border-dark-500">Draft</span>,
      sent: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Sent</span>,
      viewed: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Viewed</span>,
      partial: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Partial</span>,
      paid: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Paid</span>,
      void: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-dark-600 text-dark-400 border border-dark-500">Void</span>,
    }
    return badges[status] || badges.draft
  }

  // Helper to check if an invoice is overdue with 30-day grace period
  const isInvoiceOverdue = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'overdue') return invoice.status === 'overdue'

    if (invoice.due_date) {
      return new Date(invoice.due_date) < new Date()
    }

    const invoiceDate = new Date(invoice.invoice_date || invoice.created_at)
    const gracePeriodEnd = new Date(invoiceDate)
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30)
    return new Date() > gracePeriodEnd
  }

  // Get unique customers for filter
  const uniqueCustomers = useMemo(() => {
    const customers = new Map()
    invoices.forEach(i => {
      if (i.customer_name) {
        const existing = customers.get(i.customer_name)
        if (existing) {
          existing.count++
        } else {
          customers.set(i.customer_name, { name: i.customer_name, count: 1 })
        }
      }
    })
    return Array.from(customers.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [invoices])

  const stats = {
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => ['sent', 'viewed'].includes(i.status)).length,
    overdue: invoices.filter(i => isInvoiceOverdue(i)).length,
    paid: invoices.filter(i => i.status === 'paid').length,
    totalOutstanding: invoices.filter(i => i.status !== 'paid' && i.status !== 'void').reduce((sum, i) => sum + (i.balance_due_cents || i.total_cents || 0), 0),
  }

  const filteredInvoices = invoices
    .filter(i => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          if (!isInvoiceOverdue(i)) return false
        } else if (statusFilter === 'sent') {
          // "Sent/Pending" includes both sent and viewed
          if (!['sent', 'viewed'].includes(i.status)) return false
        } else {
          if (i.status !== statusFilter) return false
        }
      }

      // Customer filter
      if (customerFilter !== 'all' && i.customer_name !== customerFilter) return false

      // Search filter - match from beginning of name, substring for other fields
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        i.invoice_number?.toLowerCase().includes(search) ||
        i.customer_name?.toLowerCase().startsWith(search) ||
        i.customer_name?.toLowerCase().split(' ').some(part => part.startsWith(search)) ||
        i.customer_phone?.includes(search) ||
        i.service_address?.toLowerCase().includes(search)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'customer') {
        const nameA = (a.customer_name || '').toLowerCase()
        const nameB = (b.customer_name || '').toLowerCase()
        if (nameA !== nameB) {
          return nameA.localeCompare(nameB)
        }
        return new Date(b.created_at) - new Date(a.created_at)
      }
      return 0
    })

  // Navigate to invoice detail
  const handleRowClick = (invoiceId) => {
    router.push(`/admin/invoices/${invoiceId}`)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setCustomerFilter('all')
    setSortBy('date')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || customerFilter !== 'all' || sortBy !== 'date'

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Invoices</h1>
                <p className="text-sm text-dark-400">{invoices.length} total invoices</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchInvoices}
                disabled={loading}
                className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/admin/invoices/import"
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-dark-700 text-white rounded-lg font-medium hover:bg-dark-600 transition-colors border border-dark-600"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Import
              </Link>
              <Link
                href="/admin/invoices/create"
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Invoice</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setStatusFilter('draft')}
            className={`bg-dark-800 rounded-xl p-4 border transition-all text-left ${
              statusFilter === 'draft' ? 'border-primary ring-2 ring-primary/20' : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-dark-400" />
              <span className="text-sm text-dark-400">Drafts</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.draft}</p>
          </button>

          <button
            onClick={() => setStatusFilter('sent')}
            className={`bg-dark-800 rounded-xl p-4 border transition-all text-left ${
              statusFilter === 'sent' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-dark-400">Sent/Pending</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{stats.sent}</p>
          </button>

          <button
            onClick={() => setStatusFilter('overdue')}
            className={`bg-dark-800 rounded-xl p-4 border transition-all text-left ${
              statusFilter === 'overdue' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-dark-400">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
          </button>

          <button
            onClick={() => setStatusFilter('paid')}
            className={`bg-dark-800 rounded-xl p-4 border transition-all text-left ${
              statusFilter === 'paid' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-dark-400">Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.paid}</p>
          </button>

          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-dark-400">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                placeholder="Search by invoice #, customer, phone, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-dark-500"
              />
            </div>

            {/* Customer Filter */}
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="all">All Customers</option>
                {uniqueCustomers.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer pr-8"
              >
                <option value="date">Newest First</option>
                <option value="customer">By Customer</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 mb-2">No invoices found</p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="text-primary hover:underline">
                  Clear filters
                </button>
              ) : (
                <Link href="/admin/invoices/create" className="text-primary hover:underline">
                  Create your first invoice
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => handleRowClick(invoice.id)}
                  className="p-4 hover:bg-dark-750 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    {/* Invoice Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="font-mono font-semibold text-primary group-hover:text-primary/80">
                          {invoice.invoice_number}
                        </span>
                        {getStatusBadge(invoice.status, invoice.due_date, invoice.invoice_date || invoice.created_at)}
                      </div>
                      <p className="font-medium text-white mb-1">{invoice.customer_name}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dark-400">
                        {invoice.service_address && (
                          <span className="truncate max-w-[250px]">{invoice.service_address}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {invoice.due_date ? `Due ${formatDate(invoice.due_date)}` : 'Due Upon Receipt'}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(invoice.total_cents)}
                      </p>
                      {invoice.balance_due_cents > 0 && invoice.balance_due_cents !== invoice.total_cents && (
                        <p className="text-sm text-amber-400 font-medium">
                          {formatCurrency(invoice.balance_due_cents)} due
                        </p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {invoice.status !== 'paid' && (
                        <button
                          onClick={(e) => sendInvoice(e, invoice)}
                          disabled={sendingId === invoice.id}
                          className="p-2 text-dark-400 hover:text-blue-400 hover:bg-dark-700 rounded-lg transition-colors"
                          title={invoice.status === 'draft' ? 'Send Invoice' : 'Send Reminder'}
                        >
                          {sendingId === invoice.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <a
                        href={`/invoice/${invoice.invoice_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                        title="View as Customer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && filteredInvoices.length > 0 && (
          <p className="text-sm text-dark-500 mt-4 text-center">
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </p>
        )}
      </main>
    </div>
  )
}
