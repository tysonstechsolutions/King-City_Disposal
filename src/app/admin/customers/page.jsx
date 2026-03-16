'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import { useToast } from '../../../components/Toast'
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Star,
  Building2,
  DollarSign,
  Loader2,
  UserPlus,
  ChevronDown,
  Filter,
  X,
  MapPin as MapPinIcon
} from 'lucide-react'

export default function CustomersPage() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'vip', 'flagged', 'business'
  const [cityFilter, setCityFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const token = sessionStorage.getItem('adminToken')
      const response = await fetch('/api/admin/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || data || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch customers:', response.status, errorData)
        if (response.status === 401) {
          // Session expired - redirect to login
          sessionStorage.removeItem('adminToken')
          window.location.href = '/admin'
          return
        }
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
    }
    setLoading(false)
  }

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format((cents || 0) / 100)
  }

  // Get unique cities for filter dropdown
  const uniqueCities = useMemo(() => {
    const cities = new Map()
    customers.forEach(c => {
      if (c.city) {
        const city = c.city.trim()
        const existing = cities.get(city)
        if (existing) {
          existing.count++
        } else {
          cities.set(city, { name: city, count: 1 })
        }
      }
    })
    return Array.from(cities.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [customers])

  // Build unique customer names for the dropdown
  const uniqueCustomerNames = useMemo(() => {
    const names = new Map()
    customers.forEach(c => {
      if (c.name) {
        const name = c.name.trim()
        if (!names.has(name)) {
          names.set(name, { name, id: c.id })
        }
      }
    })
    return Array.from(names.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [customers])

  const clearFilters = () => {
    setSearchTerm('')
    setFilter('all')
    setCityFilter('all')
    setCustomerFilter('all')
  }

  const hasActiveFilters = searchTerm || filter !== 'all' || cityFilter !== 'all' || customerFilter !== 'all'

  const filteredCustomers = customers.filter(c => {
    // Apply type filter
    if (filter === 'vip' && !c.is_vip) return false
    if (filter === 'flagged' && !c.is_flagged) return false
    if (filter === 'business' && !c.is_business) return false

    // Apply customer name filter
    if (customerFilter !== 'all' && c.name?.trim() !== customerFilter) return false

    // Apply city filter
    if (cityFilter !== 'all' && c.city?.trim() !== cityFilter) return false

    // Apply search - match from beginning of name/company, substring for other fields
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      c.name?.toLowerCase().startsWith(search) ||
      c.name?.toLowerCase().split(' ').some(part => part.startsWith(search)) ||
      c.company_name?.toLowerCase().startsWith(search) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.address?.toLowerCase().includes(search) ||
      c.city?.toLowerCase().startsWith(search) ||
      c.zip?.startsWith(search)
    )
  })

  const stats = {
    total: customers.length,
    withBalance: customers.filter(c => c.outstanding_balance_cents > 0).length,
    totalOutstanding: customers.reduce((sum, c) => sum + (c.outstanding_balance_cents || 0), 0),
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Customers</h1>
                <p className="text-sm text-dark-400">{stats.total} customers</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Customer
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-sm text-dark-400 mb-1">Total Customers</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-sm text-dark-400 mb-1">With Balance Due</p>
            <p className="text-2xl font-bold text-amber-600">{stats.withBalance}</p>
          </div>
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <p className="text-sm text-dark-400 mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                placeholder="Search by name, phone, email, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
                {uniqueCustomerNames.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="vip">VIP</option>
                <option value="flagged">Flagged</option>
                <option value="business">Business</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
            </div>

            {/* City Filter */}
            <div className="relative">
              <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="all">All Cities</option>
                {uniqueCities.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
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

        {/* Customer List */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">
                {hasActiveFilters ? 'No customers match your filters' : 'No customers yet'}
              </p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="mt-4 text-primary hover:underline">
                  Clear filters
                </button>
              ) : (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 text-primary hover:underline"
                >
                  Add your first customer
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {filteredCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-dark-700 transition-colors"
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    customer.is_flagged
                      ? 'bg-red-100 text-red-600'
                      : customer.is_vip
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {customer.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">
                        {customer.name}
                      </p>
                      {customer.is_vip && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      {customer.is_flagged && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      {customer.is_business && <Building2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    {customer.company_name && (
                      <p className="text-sm text-dark-400">{customer.company_name}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-sm text-dark-400">
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right hidden md:block">
                    <p className="text-sm text-dark-400">{customer.total_jobs || 0} jobs</p>
                    <p className="font-semibold text-white">
                      {formatCurrency(customer.total_spent_cents)}
                    </p>
                    {customer.credit_balance_cents > 0 && (
                      <p className="text-sm text-emerald-500 font-medium">
                        {formatCurrency(customer.credit_balance_cents)} credit
                      </p>
                    )}
                    {customer.outstanding_balance_cents > 0 && (
                      <p className="text-sm text-red-500 font-medium">
                        {formatCurrency(customer.outstanding_balance_cents)} due
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-dark-500" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchCustomers()
          }}
          toast={toast}
        />
      )}
    </div>
  )
}

// Add Customer Modal Component
function AddCustomerModal({ onClose, onSuccess, toast }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company_name: '',
    is_business: false,
    address: '',
    city: '',
    state: 'IL',
    zip: '',
    notes: '',
    default_payment_method: 'invoice',
    payment_terms: 15,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to create customer')
      }
    } catch (err) {
      console.error('Error creating customer:', err)
      toast.error('Error creating customer')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-dark-700">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-bold text-white">Add Customer</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Business */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_business}
                onChange={(e) => setFormData({ ...formData, is_business: e.target.checked })}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm font-medium text-dark-200">This is a business/contractor</span>
            </label>
          </div>

          {formData.is_business && (
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Default Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="ZIP"
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">Default Payment</label>
              <select
                value={formData.default_payment_method}
                onChange={(e) => setFormData({ ...formData, default_payment_method: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="upfront">Pay Upfront</option>
                <option value="invoice">Invoice After</option>
                <option value="check">Check</option>
                <option value="ach">ACH Transfer</option>
                <option value="card">Credit/Debit Card</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">Payment Terms</label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value={0}>Due on Receipt</option>
                <option value={7}>Net 7</option>
                <option value={15}>Net 15</option>
                <option value={30}>Net 30</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Gate code, call preferences, etc."
              rows={2}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 text-white placeholder-dark-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            {loading ? 'Adding...' : 'Add Customer'}
          </button>
        </form>
      </div>
    </div>
  )
}
