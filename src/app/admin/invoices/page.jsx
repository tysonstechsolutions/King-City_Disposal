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
  MessageSquare,
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle
} from 'lucide-react'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date') // 'date' or 'customer'
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showActions, setShowActions] = useState(null)

  // Excel Import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [markImportAsPaid, setMarkImportAsPaid] = useState(false) // Default to NOT marking as paid

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
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

  // Import Excel file with historical invoices
  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mark_as_paid', markImportAsPaid ? 'true' : 'false')

      const response = await fetch('/api/invoices/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setImportResult({
          success: true,
          ...result,
        })
        // Refresh invoices list
        fetchInvoices()
      } else {
        setImportResult({
          success: false,
          error: result.error || 'Import failed',
        })
      }
    } catch (err) {
      console.error('Import error:', err)
      setImportResult({
        success: false,
        error: err.message,
      })
    }

    setImporting(false)
    e.target.value = ''
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

  // Get status badge - account for 30-day grace period when no due date
  const getStatusBadge = (status, dueDate, invoiceDate) => {
    let isOverdue = false

    if (status !== 'paid') {
      if (dueDate) {
        isOverdue = new Date(dueDate) < new Date()
      } else if (invoiceDate) {
        // No due date = Due Upon Receipt, with 30 day grace period before overdue
        const gracePeriodEnd = new Date(invoiceDate)
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30)
        isOverdue = new Date() > gracePeriodEnd
      }
    }

    if (isOverdue || status === 'overdue') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Overdue</span>
    }

    const badges = {
      draft: <span className="px-2 py-1 text-xs font-medium rounded-full bg-dark-700 text-dark-200">Draft</span>,
      sent: <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Sent</span>,
      viewed: <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Viewed</span>,
      partial: <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Partial</span>,
      paid: <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Paid</span>,
      void: <span className="px-2 py-1 text-xs font-medium rounded-full bg-dark-700 text-dark-400">Void</span>,
    }
    return badges[status] || badges.draft
  }

  // Helper to check if an invoice is overdue with 30-day grace period
  const isInvoiceOverdue = (invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'overdue') return invoice.status === 'overdue'

    if (invoice.due_date) {
      return new Date(invoice.due_date) < new Date()
    }

    // No due date = Due Upon Receipt, with 30 day grace period
    const invoiceDate = new Date(invoice.invoice_date || invoice.created_at)
    const gracePeriodEnd = new Date(invoiceDate)
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30)
    return new Date() > gracePeriodEnd
  }

  const stats = {
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => ['sent', 'viewed'].includes(i.status)).length,
    overdue: invoices.filter(i => isInvoiceOverdue(i)).length,
    totalOutstanding: invoices.filter(i => i.status !== 'paid' && i.status !== 'void').reduce((sum, i) => sum + (i.balance_due_cents || i.total_cents || 0), 0),
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
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Invoices</h1>
                <p className="text-sm text-dark-400">{invoices.length} total</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchInvoices}
                className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Import Excel</span>
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
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-dark-500" />
              <span className="text-sm text-dark-400">Drafts</span>
            </div>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-dark-400">Sent/Pending</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-dark-400">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-dark-400">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
              className="px-4 py-2 border bg-dark-700 text-white border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="customer">Sort by Customer</option>
            </select>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">No invoices found</p>
              <Link href="/admin/invoices/create" className="mt-4 inline-block text-primary hover:underline">
                Create your first invoice
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 hover:bg-dark-700 transition-colors">
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
                        {getStatusBadge(invoice.status, invoice.due_date, invoice.invoice_date || invoice.created_at)}
                      </div>
                      <p className="font-medium text-white">{invoice.customer_name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-dark-400">
                        {invoice.service_address && (
                          <span className="truncate max-w-[200px]">{invoice.service_address}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {invoice.due_date ? `Due ${formatDate(invoice.due_date)}` : 'Due Upon Receipt'}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
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
                        className="p-2 text-dark-500 hover:text-dark-300 hover:bg-dark-700 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {showActions === invoice.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-dark-800 rounded-lg shadow-lg border border-dark-600 py-1 z-10">
                          <Link
                            href={`/admin/invoices/${invoice.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-dark-700"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </Link>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => sendInvoice(invoice)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-dark-700 w-full text-left"
                            >
                              <Send className="w-4 h-4" />
                              Send Invoice
                            </button>
                          )}
                          {invoice.customer_phone && (
                            <button
                              onClick={() => sendInvoice(invoice)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-dark-700 w-full text-left"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Send Reminder
                            </button>
                          )}
                          <Link
                            href={`/invoice/${invoice.invoice_number}`}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-dark-700"
                          >
                            <FileText className="w-4 h-4" />
                            View as Customer
                          </Link>
                          {invoice.status !== 'paid' && (
                            <Link
                              href={`/admin/invoices/${invoice.id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-dark-700"
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

      {/* Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-white">Import Customer Invoices</h2>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
                className="p-2 hover:bg-dark-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!importResult ? (
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h3 className="font-medium text-purple-900 mb-2">Import Historical Invoices</h3>
                    <p className="text-sm text-purple-800">
                      Upload an Excel file (.xlsx) with multiple sheets. Each sheet should contain one customer invoice.
                      The system will parse customer name, invoice number, date, and amounts automatically.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelImport}
                      className="hidden"
                      id="invoice-import"
                      disabled={importing}
                    />
                    <label
                      htmlFor="invoice-import"
                      className={`cursor-pointer block ${importing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-spin" />
                          <p className="text-dark-200 font-medium">Processing invoices...</p>
                          <p className="text-sm text-dark-400">This may take a moment</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                          <p className="text-dark-200 font-medium">Click to upload Excel file</p>
                          <p className="text-sm text-dark-400">.xlsx or .xls files supported</p>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Mark as Paid checkbox */}
                  <div className="bg-dark-700 rounded-xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markImportAsPaid}
                        onChange={(e) => setMarkImportAsPaid(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-dark-500 text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-dark-200">Mark all imported invoices as paid</p>
                        <p className="text-sm text-dark-400">
                          Check this if these are historical invoices that have already been paid.
                          Leave unchecked to import as unpaid invoices.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="text-sm text-dark-400">
                    <p className="font-medium mb-1">Your invoice format is supported:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Invoice No., Date, Customer ID auto-detected</li>
                      <li>Customer name from Job field or company header</li>
                      <li>Line items from Description/Quantity/Price/Total columns</li>
                      <li>Payment status: Due Upon Receipt (no late fee for 30 days)</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {importResult.success ? (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-green-900">Import Complete</h3>
                          <p className="text-sm text-green-800">
                            Successfully imported {importResult.imported} of {importResult.total_sheets} invoices
                          </p>
                        </div>
                      </div>

                      {importResult.invoices && importResult.invoices.length > 0 && (
                        <div className="border border-dark-700 rounded-xl overflow-hidden">
                          <div className="bg-dark-700 px-3 py-2 border-b border-dark-700">
                            <p className="font-medium text-sm text-dark-200">Imported Invoices</p>
                          </div>
                          <div className="max-h-48 overflow-y-auto divide-y divide-dark-700">
                            {importResult.invoices.slice(0, 10).map((inv, idx) => (
                              <div key={idx} className="px-3 py-2 text-sm flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-white">{inv.invoice_number}</p>
                                  <p className="text-xs text-dark-400">{inv.customer} - {inv.date || 'No date'}</p>
                                </div>
                                <span className="font-semibold text-white">${inv.total?.toFixed(2)}</span>
                              </div>
                            ))}
                            {importResult.invoices.length > 10 && (
                              <p className="px-3 py-2 text-sm text-dark-400">
                                And {importResult.invoices.length - 10} more...
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {(importResult.customers_created > 0 || importResult.customers_matched > 0) && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <p className="text-sm text-green-800">
                            {importResult.customers_created > 0 && (
                              <><strong>{importResult.customers_created}</strong> new customers created. </>
                            )}
                            {importResult.customers_matched > 0 && (
                              <><strong>{importResult.customers_matched}</strong> matched to existing customers.</>
                            )}
                          </p>
                        </div>
                      )}

                      {importResult.duplicates > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-sm text-blue-800">
                            <strong>{importResult.duplicates}</strong> invoices already existed and were skipped
                          </p>
                        </div>
                      )}

                      {importResult.skipped > 0 && importResult.skipped !== importResult.duplicates && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-sm text-amber-800">
                            <strong>{importResult.skipped - (importResult.duplicates || 0)}</strong> sheets were skipped (empty or couldn't parse)
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-900">Import Failed</h3>
                        <p className="text-sm text-red-800">{importResult.error}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowImportModal(false)
                      setImportResult(null)
                    }}
                    className="w-full py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
