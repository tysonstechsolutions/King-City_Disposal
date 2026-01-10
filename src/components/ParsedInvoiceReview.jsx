'use client'

import { useState, useEffect } from 'react'
import { config } from '../config'
import { CATEGORY_ICONS, CATEGORY_LABELS, formatWeight } from '../lib/constants'
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  Loader2,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  RotateCcw,
  Receipt,
  HelpCircle,
  Search,
  Link2,
  Unlink,
  Scale,
  Truck
} from 'lucide-react'

export default function ParsedInvoiceReview({ document, parsedInvoice, imageUrl, onClose, onConfirm, onReparse }) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState(null)
  const [originalData, setOriginalData] = useState(null) // Track original values for learning
  const [customer, setCustomer] = useState(null)

  // Customer search state
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)

  useEffect(() => {
    if (parsedInvoice) {
      const data = {
        invoice_type: parsedInvoice.invoice_type || 'vendor_expense',
        from_name: parsedInvoice.from_name || '',
        from_address: parsedInvoice.from_address || '',
        from_phone: parsedInvoice.from_phone || '',
        from_email: parsedInvoice.from_email || '',
        to_name: parsedInvoice.to_name || '',
        to_address: parsedInvoice.to_address || '',
        to_phone: parsedInvoice.to_phone || '',
        to_email: parsedInvoice.to_email || '',
        invoice_number: parsedInvoice.invoice_number || '',
        invoice_date: parsedInvoice.invoice_date || '',
        due_date: parsedInvoice.due_date || '',
        payment_terms: parsedInvoice.payment_terms || '',
        subtotal_cents: parsedInvoice.subtotal_cents || 0,
        tax_cents: parsedInvoice.tax_cents || 0,
        fees_cents: parsedInvoice.fees_cents || 0,
        total_cents: parsedInvoice.total_cents || 0,
        expense_category: parsedInvoice.expense_category || 'other',
        is_tax_deductible: parsedInvoice.is_tax_deductible !== false,
        line_items: parsedInvoice.line_items || [],
        weight_lbs: parsedInvoice.weight_lbs || null,
        customer_id: parsedInvoice.customer_id || null,
      }
      setFormData(data)
      setOriginalData({ ...data }) // Store original for comparison

      // Fetch linked customer if exists
      if (parsedInvoice.customer_id) {
        fetchCustomer(parsedInvoice.customer_id)
      }
    }
  }, [parsedInvoice])

  const fetchCustomer = async (customerId) => {
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/customers?id=eq.${customerId}`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setCustomer(data[0])
        }
      }
    } catch (err) {
      console.error('Error fetching customer:', err)
    }
  }

  // Search customers
  const searchCustomers = async (query) => {
    if (!query || query.length < 2) {
      setCustomerResults([])
      return
    }

    setSearchingCustomers(true)
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/customers?or=(name.ilike.%${query}%,phone.ilike.%${query}%)&limit=10`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setCustomerResults(data)
      }
    } catch (err) {
      console.error('Error searching customers:', err)
    }
    setSearchingCustomers(false)
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch])

  const linkCustomer = (cust) => {
    setCustomer(cust)
    setFormData(prev => ({ ...prev, customer_id: cust.id }))
    setShowCustomerSearch(false)
    setCustomerSearch('')
    setCustomerResults([])
  }

  const unlinkCustomer = () => {
    setCustomer(null)
    setFormData(prev => ({ ...prev, customer_id: null }))
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/parse/${parsedInvoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setEditing(false)
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to save changes')
      }
    } catch (err) {
      setError('Error saving changes')
      console.error(err)
    }
    setLoading(false)
  }

  // Save vendor corrections for AI learning
  const saveVendorCorrections = async () => {
    // Only save corrections for vendor expenses with a from_name
    if (formData.invoice_type !== 'vendor_expense' || !formData.from_name) {
      return
    }

    // Check if any vendor info was changed
    const hasChanges =
      (originalData.from_name && formData.from_name !== originalData.from_name) ||
      (originalData.from_phone && formData.from_phone !== originalData.from_phone) ||
      (originalData.from_address && formData.from_address !== originalData.from_address) ||
      (originalData.expense_category && formData.expense_category !== originalData.expense_category)

    if (!hasChanges) {
      return
    }

    try {
      // Use the original (AI-parsed) vendor name as the key
      const vendorKey = originalData.from_name || formData.from_name

      await fetch('/api/vendor-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: vendorKey,
          corrected_name: formData.from_name !== originalData.from_name ? formData.from_name : null,
          corrected_phone: formData.from_phone !== originalData.from_phone ? formData.from_phone : null,
          corrected_address: formData.from_address !== originalData.from_address ? formData.from_address : null,
          default_category: formData.expense_category !== originalData.expense_category ? formData.expense_category : null,
        }),
      })

      console.log('Vendor correction saved for:', vendorKey)
    } catch (err) {
      console.error('Error saving vendor correction:', err)
      // Don't block confirmation if corrections fail to save
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    try {
      // Save any pending changes first
      if (editing) {
        await handleSave()
      }

      // Also save customer_id if set
      if (formData.customer_id !== parsedInvoice.customer_id) {
        await fetch(`/api/documents/parse/${parsedInvoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: formData.customer_id }),
        })
      }

      // Save vendor corrections for AI learning (before confirming)
      await saveVendorCorrections()

      const response = await fetch(`/api/documents/parse/${parsedInvoice.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      })

      if (response.ok) {
        if (onConfirm) onConfirm()
        onClose()
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to confirm invoice')
      }
    } catch (err) {
      setError('Error confirming invoice')
      console.error(err)
    }
    setLoading(false)
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/documents/parse/${parsedInvoice.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })

      if (response.ok) {
        onClose()
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format((cents || 0) / 100)
  }

  if (!formData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  const CategoryIcon = CATEGORY_ICONS[formData.expense_category] || HelpCircle
  const isWeightTicket = document?.category === 'weight_ticket' || formData.weight_lbs

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isWeightTicket ? 'bg-blue-100' :
              formData.invoice_type === 'vendor_expense' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              {isWeightTicket ? (
                <Scale className="w-5 h-5 text-blue-600" />
              ) : (
                <Receipt className={`w-5 h-5 ${
                  formData.invoice_type === 'vendor_expense' ? 'text-red-600' : 'text-blue-600'
                }`} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                {isWeightTicket ? 'Weight Ticket' :
                 formData.invoice_type === 'vendor_expense' ? 'Vendor Expense' : 'Customer Invoice Record'}
              </h2>
              <p className="text-sm text-neutral-500">
                {parsedInvoice.confidence_score
                  ? `${Math.round(parsedInvoice.confidence_score * 100)}% confidence`
                  : 'Review extracted data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-3 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
            {onReparse && (
              <button
                onClick={onReparse}
                className="flex items-center gap-2 px-3 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Re-parse
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content - Side by Side */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Image Preview */}
          <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-neutral-200 bg-neutral-100 p-4 overflow-auto">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Document"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">
                No image preview available
              </div>
            )}
          </div>

          {/* Right: Extracted Data */}
          <div className="md:w-1/2 overflow-y-auto p-4 space-y-4">

            {/* Customer Link Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Link to Customer
              </h3>

              {customer ? (
                <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{customer.name}</p>
                      <p className="text-sm text-neutral-500">{customer.phone}</p>
                    </div>
                  </div>
                  <button
                    onClick={unlinkCustomer}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="Unlink customer"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  {!showCustomerSearch ? (
                    <button
                      onClick={() => setShowCustomerSearch(true)}
                      className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Search & Link Customer
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="Search by name or phone..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                          autoFocus
                        />
                        {searchingCustomers && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-neutral-400" />
                        )}
                      </div>

                      {customerResults.length > 0 && (
                        <div className="bg-white border border-neutral-200 rounded-lg max-h-40 overflow-y-auto">
                          {customerResults.map((cust) => (
                            <button
                              key={cust.id}
                              onClick={() => linkCustomer(cust)}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-neutral-100 last:border-0"
                            >
                              <User className="w-4 h-4 text-neutral-400" />
                              <div>
                                <p className="font-medium text-sm">{cust.name}</p>
                                <p className="text-xs text-neutral-500">{cust.phone}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowCustomerSearch(false)
                          setCustomerSearch('')
                          setCustomerResults([])
                        }}
                        className="text-sm text-neutral-500 hover:text-neutral-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Weight Section (for weight tickets) */}
            {isWeightTicket && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Weight Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500">Weight (lbs)</label>
                    {editing ? (
                      <input
                        type="number"
                        value={formData.weight_lbs || ''}
                        onChange={(e) => setFormData({ ...formData, weight_lbs: parseInt(e.target.value) || null })}
                        className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                        placeholder="e.g., 4500"
                      />
                    ) : (
                      <p className="text-lg font-bold text-blue-700">
                        {formData.weight_lbs ? `${formData.weight_lbs.toLocaleString()} lbs` : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Weight (tons)</label>
                    <p className="text-lg font-bold text-blue-700">
                      {formData.weight_lbs ? formatWeight(formData.weight_lbs) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Type */}
            {!isWeightTicket && (
              <div className="flex gap-2">
                <button
                  onClick={() => editing && setFormData({ ...formData, invoice_type: 'vendor_expense' })}
                  disabled={!editing}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    formData.invoice_type === 'vendor_expense'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-neutral-200 text-neutral-500'
                  } ${editing ? 'cursor-pointer hover:border-red-300' : ''}`}
                >
                  Vendor Expense
                </button>
                <button
                  onClick={() => editing && setFormData({ ...formData, invoice_type: 'customer_record' })}
                  disabled={!editing}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                    formData.invoice_type === 'customer_record'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-neutral-200 text-neutral-500'
                  } ${editing ? 'cursor-pointer hover:border-blue-300' : ''}`}
                >
                  Customer Record
                </button>
              </div>
            )}

            {/* From Section */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                From (Sender)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500">Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.from_name}
                      onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium">{formData.from_name || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Phone</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.from_phone}
                      onChange={(e) => setFormData({ ...formData, from_phone: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm">{formData.from_phone || '-'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-neutral-500">Address</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.from_address}
                      onChange={(e) => setFormData({ ...formData, from_address: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm">{formData.from_address || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {isWeightTicket ? 'Ticket Details' : 'Invoice Details'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500">{isWeightTicket ? 'Ticket #' : 'Invoice #'}</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium">{formData.invoice_number || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Date</label>
                  {editing ? (
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm">{formData.invoice_date || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            {formData.line_items?.length > 0 && (
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold text-neutral-900 mb-3">Line Items</h3>
                <div className="space-y-2">
                  {formData.line_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-neutral-200 last:border-0">
                      <span className="text-neutral-700">{item.description}</span>
                      <span className="font-medium">{formatCurrency(item.total_cents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amounts */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Amounts
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={(formData.subtotal_cents / 100).toFixed(2)}
                      onChange={(e) => setFormData({ ...formData, subtotal_cents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                      className="w-24 px-2 py-1 border border-neutral-300 rounded text-sm text-right"
                    />
                  ) : (
                    <span>{formatCurrency(formData.subtotal_cents)}</span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Tax</span>
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={(formData.tax_cents / 100).toFixed(2)}
                      onChange={(e) => setFormData({ ...formData, tax_cents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                      className="w-24 px-2 py-1 border border-neutral-300 rounded text-sm text-right"
                    />
                  ) : (
                    <span>{formatCurrency(formData.tax_cents)}</span>
                  )}
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-neutral-200">
                  <span>Total</span>
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={(formData.total_cents / 100).toFixed(2)}
                      onChange={(e) => setFormData({ ...formData, total_cents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                      className="w-24 px-2 py-1 border border-neutral-300 rounded text-sm text-right font-semibold"
                    />
                  ) : (
                    <span className="text-lg">{formatCurrency(formData.total_cents)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Expense Category (for vendor expenses) */}
            {formData.invoice_type === 'vendor_expense' && (
              <div className="bg-amber-50 rounded-lg p-4">
                <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Expense Category
                </h3>
                {editing ? (
                  <select
                    value={formData.expense_category}
                    onChange={(e) => setFormData({ ...formData, expense_category: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-5 h-5 text-amber-600" />
                    <span className="font-medium">{CATEGORY_LABELS[formData.expense_category] || 'Other'}</span>
                  </div>
                )}

                <label className="flex items-center gap-2 mt-3 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.is_tax_deductible}
                    onChange={(e) => editing && setFormData({ ...formData, is_tax_deductible: e.target.checked })}
                    disabled={!editing}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  Tax Deductible
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            {customer && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Linked to {customer.name}
              </span>
            )}
          </div>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  )
}
