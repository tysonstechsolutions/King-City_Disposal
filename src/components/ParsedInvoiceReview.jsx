'use client'

import { useState, useEffect } from 'react'
import { config } from '../config'
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
  Truck,
  Fuel,
  Wrench,
  Package,
  HelpCircle
} from 'lucide-react'

const categoryIcons = {
  landfill: Truck,
  fuel: Fuel,
  parts: Package,
  repairs: Wrench,
  supplies: Package,
  dumpster_rental: Truck,
  other: HelpCircle,
}

const categoryLabels = {
  landfill: 'Landfill/Dump Fees',
  fuel: 'Fuel',
  parts: 'Parts',
  repairs: 'Repairs',
  supplies: 'Supplies',
  dumpster_rental: 'Dumpster Rental',
  other: 'Other',
}

export default function ParsedInvoiceReview({ document, parsedInvoice, imageUrl, onClose, onConfirm, onReparse }) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState(null)
  const [customer, setCustomer] = useState(null)

  useEffect(() => {
    if (parsedInvoice) {
      setFormData({
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
      })

      // Fetch linked customer if exists
      if (parsedInvoice.customer_id) {
        fetch(`/api/admin/customers/${parsedInvoice.customer_id}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => setCustomer(data))
          .catch(() => {})
      }
    }
  }, [parsedInvoice])

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

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    try {
      // Save any pending changes first
      if (editing) {
        await handleSave()
      }

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

  const CategoryIcon = categoryIcons[formData.expense_category] || HelpCircle

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              formData.invoice_type === 'vendor_expense' ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <Receipt className={`w-5 h-5 ${
                formData.invoice_type === 'vendor_expense' ? 'text-red-600' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                {formData.invoice_type === 'vendor_expense' ? 'Vendor Expense' : 'Customer Invoice Record'}
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
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Image Preview */}
          <div className="w-1/2 border-r border-neutral-200 bg-neutral-100 p-4 overflow-auto">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Invoice"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">
                No image preview available
              </div>
            )}
          </div>

          {/* Right: Extracted Data */}
          <div className="w-1/2 overflow-y-auto p-4 space-y-4">
            {/* Invoice Type */}
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

            {/* Linked Customer/Vendor */}
            {(parsedInvoice.customer_id || customer) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Linked to {formData.invoice_type === 'vendor_expense' ? 'Vendor' : 'Customer'}
                      </p>
                      <p className="text-sm text-green-700">
                        {customer?.name || formData.invoice_type === 'vendor_expense' ? formData.from_name : formData.to_name}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/admin/customers?id=${parsedInvoice.customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:text-green-900 underline"
                  >
                    View Profile
                  </a>
                </div>
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
                <div className="col-span-2">
                  <label className="text-xs text-neutral-500">Email</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.from_email}
                      onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm">{formData.from_email || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* To Section */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                To (Recipient)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500">Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.to_name}
                      onChange={(e) => setFormData({ ...formData, to_name: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium">{formData.to_name || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Phone</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.to_phone}
                      onChange={(e) => setFormData({ ...formData, to_phone: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm">{formData.to_phone || '-'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-neutral-500">Address</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.to_address}
                      onChange={(e) => setFormData({ ...formData, to_address: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm">{formData.to_address || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-neutral-50 rounded-lg p-4">
              <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Invoice Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500">Invoice #</label>
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
                <div>
                  <label className="text-xs text-neutral-500">Due Date</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm">{formData.due_date || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Terms</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    />
                  ) : (
                    <p className="text-sm">{formData.payment_terms || '-'}</p>
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
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Fees</span>
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={(formData.fees_cents / 100).toFixed(2)}
                      onChange={(e) => setFormData({ ...formData, fees_cents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                      className="w-24 px-2 py-1 border border-neutral-300 rounded text-sm text-right"
                    />
                  ) : (
                    <span>{formatCurrency(formData.fees_cents)}</span>
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
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="w-5 h-5 text-amber-600" />
                    <span className="font-medium">{categoryLabels[formData.expense_category] || 'Other'}</span>
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
