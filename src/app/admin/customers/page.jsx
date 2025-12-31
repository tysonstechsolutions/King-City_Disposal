'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Star,
  Building2,
  DollarSign,
  Filter,
  Loader2,
  UserPlus
} from 'lucide-react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'vip', 'flagged', 'business'
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/customers?order=name.asc`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
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

  const filteredCustomers = customers.filter(c => {
    // Apply filter
    if (filter === 'vip' && !c.is_vip) return false
    if (filter === 'flagged' && !c.is_flagged) return false
    if (filter === 'business' && !c.is_business) return false
    
    // Apply search
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      c.name?.toLowerCase().includes(search) ||
      c.company_name?.toLowerCase().includes(search) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.address?.toLowerCase().includes(search)
    )
  })

  const stats = {
    total: customers.length,
    withBalance: customers.filter(c => c.outstanding_balance_cents > 0).length,
    totalOutstanding: customers.reduce((sum, c) => sum + (c.outstanding_balance_cents || 0), 0),
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminNav />

      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Customers</h1>
                <p className="text-sm text-neutral-500">{stats.total} customers</p>
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <p className="text-sm text-neutral-500 mb-1">Total Customers</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <p className="text-sm text-neutral-500 mb-1">With Balance Due</p>
            <p className="text-2xl font-bold text-amber-600">{stats.withBalance}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <p className="text-sm text-neutral-500 mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, phone, email, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'vip', label: '⭐ VIP' },
                { value: 'flagged', label: '⚠️ Flagged' },
                { value: 'business', label: '🏢 Business' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.value
                      ? 'bg-primary text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">
                {searchTerm ? 'No customers match your search' : 'No customers yet'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-primary hover:underline"
              >
                Add your first customer
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors"
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
                      <p className="font-semibold text-neutral-900 truncate">
                        {customer.name}
                      </p>
                      {customer.is_vip && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      {customer.is_flagged && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      {customer.is_business && <Building2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    {customer.company_name && (
                      <p className="text-sm text-neutral-500">{customer.company_name}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
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
                    <p className="text-sm text-neutral-500">{customer.total_jobs || 0} jobs</p>
                    <p className="font-semibold text-neutral-900">
                      {formatCurrency(customer.total_spent_cents)}
                    </p>
                    {customer.outstanding_balance_cents > 0 && (
                      <p className="text-sm text-red-600 font-medium">
                        {formatCurrency(customer.outstanding_balance_cents)} due
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-neutral-400" />
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
        />
      )}
    </div>
  )
}

// Add Customer Modal Component
function AddCustomerModal({ onClose, onSuccess }) {
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
      const response = await fetch(
        `${config.supabase.url}/rest/v1/customers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
          body: JSON.stringify(formData),
        }
      )

      if (response.ok) {
        onSuccess()
      } else {
        alert('Failed to create customer')
      }
    } catch (err) {
      console.error('Error creating customer:', err)
      alert('Error creating customer')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold">Add Customer</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
              <span className="text-sm font-medium text-neutral-700">This is a business/contractor</span>
            </label>
          </div>

          {formData.is_business && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Default Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="ZIP"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Default Payment</label>
              <select
                value={formData.default_payment_method}
                onChange={(e) => setFormData({ ...formData, default_payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="upfront">Pay Upfront</option>
                <option value="invoice">Invoice After</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Terms</label>
              <select
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Gate code, call preferences, etc."
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
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
