'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Send,
  Eye,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Calendar,
  Phone,
  MoreVertical,
  Mail,
  MessageSquare
} from 'lucide-react'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date') // 'date' or 'customer'
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showActions, setShowActions] = useState(null)

  useEffect(() => {
    fetchInvoices()
  }, [statusFilter])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      let query = 'order=created_at.desc'
      if (statusFilter !== 'all') {
        query += `&status=eq.${statusFilter}`
      }

      const response = await fetch(
        `${config.supabase.url}/rest/v1/invoices?${query}`,
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

  const sendInvoice = async (invoice) => {
    if (!invoice.customer_phone && !invoice.customer_email) {
      alert('No phone or email on this invoice')
      return
    }

    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoice.id }),
      })

      if (response.ok) {
        alert('Invoice sent!')
        fetchInvoices()
      } else {
        alert('Failed to send invoice')
      }
    } catch (err) {
      console.error('Error sending invoice:', err)
    }
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

  const getStatusBadge = (status, dueDate) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'paid'
    
    if (isOverdue || status === 'overdue') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Overdue</span>
    }
    
    const badges = {
      draft: <span className="px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-700">Draft</span>,
      sent: <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Sent</span>,
      viewed: <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Viewed</span>,
      partial: <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Partial</span>,
      paid: <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Paid</span>,
      void: <span className="px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-500">Void</span>,
    }
    return badges[status] || badges.draft
  }

  const stats = {
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => ['sent', 'viewed'].includes(i.status)).length,
    overdue: invoices.filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < new Date() && i.status !== 'paid')).length,
    totalOutstanding: invoices.filter(i => i.status !== 'paid' && i.status !== 'void').reduce((sum, i) => sum + (i.balance_due_cents || 0), 0),
  }

  const filteredInvoices = invoices
    .filter(i => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        i.invoice_number?.toLowerCase().includes(search) ||
        i.customer_name?.toLowerCase().includes(search) ||
        i.customer_phone?.includes(search) ||
        i.service_address?.toLowerCase().includes(search)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'customer') {
        // Sort by customer name alphabetically, then by date within same customer
        const nameA = (a.customer_name || '').toLowerCase()
        const nameB = (b.customer_name || '').toLowerCase()
        if (nameA !== nameB) {
          return nameA.localeCompare(nameB)
        }
        // Same customer, sort by date descending
        return new Date(b.created_at) - new Date(a.created_at)
      }
      // Default: sort by date descending (already sorted from API)
      return 0
    })

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminNav />

      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Invoices</h1>
                <p className="text-sm text-neutral-500">{invoices.length} total</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchInvoices}
                className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/admin/invoices/create"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Invoice
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-neutral-400" />
              <span className="text-sm text-neutral-500">Drafts</span>
            </div>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-neutral-500">Sent/Pending</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-neutral-500">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-neutral-500">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="partial">Partial Payment</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="customer">Sort by Customer</option>
            </select>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No invoices found</p>
              <Link href="/admin/invoices/create" className="mt-4 inline-block text-primary hover:underline">
                Create your first invoice
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Invoice Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Link
                          href={`/admin/invoices/${invoice.id}`}
                          className="font-mono font-semibold text-primary hover:underline"
                        >
                          {invoice.invoice_number}
                        </Link>
                        {getStatusBadge(invoice.status, invoice.due_date)}
                      </div>
                      <p className="font-medium text-neutral-900">{invoice.customer_name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
                        {invoice.service_address && (
                          <span className="truncate max-w-[200px]">{invoice.service_address}</span>
                        )}
                        {invoice.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due {formatDate(invoice.due_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-neutral-900">
                        {formatCurrency(invoice.total_cents)}
                      </p>
                      {invoice.balance_due_cents > 0 && invoice.balance_due_cents !== invoice.total_cents && (
                        <p className="text-sm text-amber-600">
                          {formatCurrency(invoice.balance_due_cents)} due
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="relative">
                      <button
                        onClick={() => setShowActions(showActions === invoice.id ? null : invoice.id)}
                        className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {showActions === invoice.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-10">
                          <Link
                            href={`/admin/invoices/${invoice.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </Link>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => sendInvoice(invoice)}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50 w-full text-left"
                            >
                              <Send className="w-4 h-4" />
                              Send Invoice
                            </button>
                          )}
                          {invoice.customer_phone && (
                            <button
                              onClick={() => sendInvoice(invoice)}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50 w-full text-left"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Send Reminder
                            </button>
                          )}
                          <Link
                            href={`/invoice/${invoice.invoice_number}`}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50"
                          >
                            <FileText className="w-4 h-4" />
                            View as Customer
                          </Link>
                          {invoice.status !== 'paid' && (
                            <Link
                              href={`/admin/invoices/${invoice.id}/payment`}
                              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50 text-green-600"
                            >
                              <DollarSign className="w-4 h-4" />
                              Record Payment
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Click outside to close actions */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(null)}
        />
      )}
    </div>
  )
}
