'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  Users,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react'

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Check auth
  useEffect(() => {
    if (sessionStorage.getItem('adminAuth') !== 'true') {
      router.push('/admin')
    }
  }, [router])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const headers = {
          'apikey': config.supabase.anonKey,
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        }

        const [bookingsRes, invoicesRes, expensesRes] = await Promise.all([
          fetch(`${config.supabase.url}/rest/v1/bookings?order=created_at.desc`, { headers }),
          fetch(`${config.supabase.url}/rest/v1/invoices?order=created_at.desc`, { headers }),
          fetch(`${config.supabase.url}/rest/v1/expenses?order=date.desc`, { headers }),
        ])

        if (bookingsRes.ok) setBookings(await bookingsRes.json())
        if (invoicesRes.ok) setInvoices(await invoicesRes.json())
        if (expensesRes.ok) setExpenses(await expensesRes.json())
      } catch (error) {
        console.error('Error fetching data:', error)
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  // Filter data by selected month
  const filterByMonth = (items, dateField) => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    return items.filter(item => {
      if (!item[dateField]) return false
      const itemDate = new Date(item[dateField])
      return itemDate.getFullYear() === year && itemDate.getMonth() === month
    })
  }

  const monthlyBookings = filterByMonth(bookings, 'created_at')
  const monthlyInvoices = filterByMonth(invoices, 'created_at')
  const monthlyExpenses = filterByMonth(expenses, 'date')

  // Calculate metrics
  const calculateRevenue = () => {
    // From bookings (price_cents)
    const bookingRevenue = monthlyBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.price_cents || 0), 0)

    // From paid invoices
    const invoiceRevenue = monthlyInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total_cents || 0), 0)

    return (bookingRevenue + invoiceRevenue) / 100
  }

  const calculateExpenses = () => {
    return monthlyExpenses.reduce((sum, e) => sum + (e.amount_cents || 0), 0) / 100
  }

  const revenue = calculateRevenue()
  const totalExpenses = calculateExpenses()
  const profit = revenue - totalExpenses

  // Size popularity
  const getSizeStats = () => {
    const sizeCounts = {}
    monthlyBookings.forEach(b => {
      if (b.dumpster_size) {
        sizeCounts[b.dumpster_size] = (sizeCounts[b.dumpster_size] || 0) + 1
      }
    })
    return Object.entries(sizeCounts)
      .map(([size, count]) => ({
        size,
        name: config.dumpsters.find(d => d.id === size)?.name || size,
        count,
        percentage: monthlyBookings.length > 0 ? Math.round((count / monthlyBookings.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
  }

  // Status breakdown
  const getStatusStats = () => {
    const statusCounts = {}
    monthlyBookings.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
    })
    return statusCounts
  }

  // Overdue invoices
  const getOverdueInvoices = () => {
    const today = new Date()
    return invoices.filter(i => {
      if (i.status === 'paid' || !i.due_date) return false
      return new Date(i.due_date) < today
    })
  }

  // Average booking value
  const avgBookingValue = monthlyBookings.length > 0
    ? monthlyBookings.reduce((sum, b) => sum + (b.price_cents || 0), 0) / monthlyBookings.length / 100
    : 0

  // Navigation
  const prevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))
  }

  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const sizeStats = getSizeStats()
  const statusStats = getStatusStats()
  const overdueInvoices = getOverdueInvoices()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900">
        <AdminNav />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
              <p className="text-dark-400">Business performance overview</p>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center gap-3 bg-dark-800 rounded-lg p-1">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-dark-300" />
              </button>
              <span className="text-white font-medium px-4">{monthName}</span>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-dark-300" />
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
                <DollarSign className="w-4 h-4" />
                Revenue
              </div>
              <p className="text-2xl font-bold text-green-400">${revenue.toLocaleString()}</p>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
                <TrendingDown className="w-4 h-4" />
                Expenses
              </div>
              <p className="text-2xl font-bold text-red-400">${totalExpenses.toLocaleString()}</p>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
                <TrendingUp className="w-4 h-4" />
                Profit
              </div>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${profit.toLocaleString()}
              </p>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
                <Package className="w-4 h-4" />
                Bookings
              </div>
              <p className="text-2xl font-bold text-white">{monthlyBookings.length}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Size Popularity */}
            <div className="bg-dark-800 rounded-xl p-5 border border-dark-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-400" />
                Popular Sizes
              </h3>
              {sizeStats.length === 0 ? (
                <p className="text-dark-400 text-sm">No bookings this month</p>
              ) : (
                <div className="space-y-3">
                  {sizeStats.map((stat) => (
                    <div key={stat.size}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white">{stat.name}</span>
                        <span className="text-dark-400">{stat.count} ({stat.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Breakdown */}
            <div className="bg-dark-800 rounded-xl p-5 border border-dark-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary-400" />
                Booking Status
              </h3>
              {Object.keys(statusStats).length === 0 ? (
                <p className="text-dark-400 text-sm">No bookings this month</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(statusStats).map(([status, count]) => {
                    const colors = {
                      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                      confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      delivered: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
                      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
                    }
                    return (
                      <div
                        key={status}
                        className={`p-3 rounded-lg border ${colors[status] || 'bg-dark-700 text-dark-300 border-dark-600'}`}
                      >
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-sm capitalize">{status}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
                <DollarSign className="w-4 h-4" />
                Avg. Booking Value
              </div>
              <p className="text-xl font-bold text-white">${avgBookingValue.toFixed(0)}</p>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
                <Users className="w-4 h-4" />
                Unique Customers
              </div>
              <p className="text-xl font-bold text-white">
                {new Set(monthlyBookings.map(b => b.customer_phone)).size}
              </p>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
                <Clock className="w-4 h-4" />
                Completion Rate
              </div>
              <p className="text-xl font-bold text-white">
                {monthlyBookings.length > 0
                  ? Math.round((statusStats.completed || 0) / monthlyBookings.length * 100)
                  : 0}%
              </p>
            </div>
          </div>

          {/* Overdue Invoices */}
          {overdueInvoices.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Overdue Invoices ({overdueInvoices.length})
              </h3>
              <div className="space-y-2">
                {overdueInvoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => router.push(`/admin/invoices/${invoice.id}`)}
                    className="bg-dark-800 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-dark-700 transition-colors"
                  >
                    <div>
                      <p className="text-white font-medium">{invoice.customer_name}</p>
                      <p className="text-dark-400 text-sm">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-red-400 font-bold">
                      ${((invoice.total_cents || 0) / 100).toFixed(0)}
                    </p>
                  </div>
                ))}
                {overdueInvoices.length > 5 && (
                  <p className="text-dark-400 text-sm text-center mt-2">
                    +{overdueInvoices.length - 5} more overdue invoices
                  </p>
                )}
              </div>
            </div>
          )}

          {/* All-Time Stats */}
          <div className="mt-6 bg-dark-800 rounded-xl p-5 border border-dark-700">
            <h3 className="text-lg font-semibold text-white mb-4">All-Time Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-dark-400 text-sm">Total Bookings</p>
                <p className="text-xl font-bold text-white">{bookings.length}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Total Revenue</p>
                <p className="text-xl font-bold text-green-400">
                  ${(bookings.reduce((sum, b) => sum + (b.price_cents || 0), 0) / 100).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Total Invoices</p>
                <p className="text-xl font-bold text-white">{invoices.length}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">Unpaid Invoices</p>
                <p className="text-xl font-bold text-yellow-400">
                  {invoices.filter(i => i.status !== 'paid').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
