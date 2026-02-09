'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import {
  DollarSign,
  Download,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Receipt,
  CreditCard,
  Banknote,
  AlertCircle,
  Users,
  ChevronDown,
  X
} from 'lucide-react'

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    totalCount: 0
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 25

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchTransactions()
  }, [typeFilter, dateRange, currentPage])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      // Build query
      let query = `order=created_at.desc&limit=${perPage}&offset=${(currentPage - 1) * perPage}`

      if (typeFilter !== 'all') {
        query += `&type=eq.${typeFilter}`
      }

      if (dateRange !== 'all') {
        let startDate

        if (dateRange === 'today') {
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
        } else if (dateRange === 'week') {
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
        } else if (dateRange === 'month') {
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 1)
        } else if (dateRange === 'year') {
          startDate = new Date()
          startDate.setFullYear(startDate.getFullYear() - 1)
        }

        if (startDate) {
          query += `&created_at=gte.${startDate.toISOString()}`
        }
      }

      const response = await fetch(
        `${config.supabase.url}/rest/v1/transactions?${query}`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
            'Prefer': 'count=exact'
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setTransactions(data)

        // Get total count from header
        const count = response.headers.get('content-range')
        if (count) {
          const total = parseInt(count.split('/')[1])
          setStats(prev => ({ ...prev, totalCount: total }))
        }
      } else {
        setError('Failed to load transactions')
      }

      // Fetch stats
      await fetchStats()

    } catch (err) {
      setError('Error loading transactions')
      console.error(err)
    }
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

      // Fetch all transactions for the year to calculate stats
      const response = await fetch(
        `${config.supabase.url}/rest/v1/transactions?created_at=gte.${yearStart}&status=eq.completed&select=amount_cents,created_at`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()

        let today = 0, thisWeek = 0, thisMonth = 0, thisYear = 0
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)

        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        const monthStartDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)

        data.forEach(t => {
          const amount = t.amount_cents
          const date = new Date(t.created_at)

          thisYear += amount

          if (date >= monthStartDate) {
            thisMonth += amount
          }
          if (date >= weekAgo) {
            thisWeek += amount
          }
          if (date >= todayDate) {
            today += amount
          }
        })

        setStats(prev => ({
          ...prev,
          today,
          thisWeek,
          thisMonth,
          thisYear
        }))
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getTypeLabel = (type) => {
    const labels = {
      booking: 'Booking',
      extension: 'Extension',
      overage: 'Overage',
      late_fee: 'Late Fee',
      custom: 'Custom'
    }
    return labels[type] || type
  }

  const getTypeColor = (type) => {
    const colors = {
      booking: 'bg-blue-100 text-blue-800',
      extension: 'bg-purple-100 text-purple-800',
      overage: 'bg-orange-100 text-orange-800',
      late_fee: 'bg-red-100 text-red-800',
      custom: 'bg-dark-700 text-dark-200'
    }
    return colors[type] || 'bg-dark-700 text-dark-200'
  }

  const getPaymentIcon = (method) => {
    if (method === 'cash') return <Banknote className="w-4 h-4" />
    if (method === 'check') return <FileText className="w-4 h-4" />
    return <CreditCard className="w-4 h-4" />
  }

  const exportCSV = () => {
    const headers = ['Receipt #', 'Date', 'Customer', 'Type', 'Description', 'Amount', 'Payment Method', 'Status']
    const rows = transactions.map(t => [
      t.receipt_number,
      formatDate(t.created_at),
      t.customer_name,
      getTypeLabel(t.type),
      t.description || '',
      (t.amount_cents / 100).toFixed(2),
      t.payment_method || 'card',
      t.status
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Get unique customers for filter dropdown
  const uniqueCustomers = useMemo(() => {
    const customers = new Map()
    transactions.forEach(t => {
      if (t.customer_name) {
        const existing = customers.get(t.customer_name)
        if (existing) {
          existing.count++
        } else {
          customers.set(t.customer_name, { name: t.customer_name, count: 1 })
        }
      }
    })
    return Array.from(customers.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [transactions])

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setDateRange('all')
    setCustomerFilter('all')
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm || typeFilter !== 'all' || dateRange !== 'all' || customerFilter !== 'all'

  const filteredTransactions = transactions.filter(t => {
    // Customer filter
    if (customerFilter !== 'all' && t.customer_name !== customerFilter) return false

    // Search filter
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      t.receipt_number?.toLowerCase().includes(search) ||
      t.customer_name?.toLowerCase().startsWith(search) ||
      t.customer_name?.toLowerCase().split(' ').some(part => part.startsWith(search)) ||
      t.customer_phone?.includes(search) ||
      t.service_address?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-white">Payments & Receipts</h1>
                <p className="text-sm text-dark-400">Track all sales and transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchTransactions}
                className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm text-dark-400">Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.today)}</p>
          </div>

          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm text-dark-400">This Week</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.thisWeek)}</p>
          </div>

          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-dark-400">This Month</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.thisMonth)}</p>
          </div>

          <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Receipt className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm text-dark-400">This Year</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.thisYear)}</p>
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
                placeholder="Search by receipt #, customer, phone, address..."
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
                onChange={(e) => { setCustomerFilter(e.target.value); setCurrentPage(1); }}
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

            {/* Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="px-4 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer pr-8 min-w-[130px]"
              >
                <option value="all">All Types</option>
                <option value="booking">Bookings</option>
                <option value="extension">Extensions</option>
                <option value="overage">Overages</option>
                <option value="late_fee">Late Fees</option>
                <option value="custom">Custom</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }}
                className="px-4 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer pr-8 min-w-[130px]"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
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

        {/* Transactions Table */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-500">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-dark-400">
              <Receipt className="w-12 h-12 mb-3 text-dark-600" />
              <p className="font-medium">
                {hasActiveFilters ? 'No transactions match your filters' : 'No transactions found'}
              </p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="mt-2 text-primary hover:underline text-sm">
                  Clear filters
                </button>
              ) : (
                <p className="text-sm">Payments will appear here after customers pay</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-700 border-b border-dark-600">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Receipt #</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Date</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Customer</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Type</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Description</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-dark-400">Amount</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-dark-400">Method</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-dark-400">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-dark-700">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm">{t.receipt_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p>{formatDate(t.created_at)}</p>
                            <p className="text-dark-400">{formatTime(t.created_at)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{t.customer_name}</p>
                          {t.customer_phone && (
                            <p className="text-sm text-dark-400">{t.customer_phone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(t.type)}`}>
                            {getTypeLabel(t.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-dark-300 max-w-xs truncate">
                            {t.description || t.service_address || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(t.amount_cents)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center text-dark-400" title={t.payment_method || 'card'}>
                            {getPaymentIcon(t.payment_method)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/receipt/${t.receipt_number}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-dark-700">
                {filteredTransactions.map((t) => (
                  <div key={t.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono text-sm text-dark-400">{t.receipt_number}</span>
                        <p className="font-medium">{t.customer_name}</p>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(t.amount_cents)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(t.type)}`}>
                        {getTypeLabel(t.type)}
                      </span>
                      <span className="text-sm text-dark-400">{formatDate(t.created_at)}</span>
                    </div>
                    {t.description && (
                      <p className="text-sm text-dark-300 mb-2">{t.description}</p>
                    )}
                    <Link
                      href={`/receipt/${t.receipt_number}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-primary-600 text-sm"
                    >
                      View Receipt <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {stats.totalCount > perPage && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700 bg-dark-700">
                  <p className="text-sm text-dark-400">
                    Showing {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, stats.totalCount)} of {stats.totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-dark-300">Page {currentPage}</span>
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage * perPage >= stats.totalCount}
                      className="p-2 rounded-lg border border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-700"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
