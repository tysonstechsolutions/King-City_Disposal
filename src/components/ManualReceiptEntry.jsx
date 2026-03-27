'use client'

import { useState, useRef } from 'react'
import { config } from '../config'
import { CATEGORY_LABELS } from '../lib/constants'
import {
  X,
  Upload,
  Camera,
  Image,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  Tag,
  Loader2,
  CheckCircle2,
  Scale,
  Hash,
  Plus,
  Trash2
} from 'lucide-react'

export default function ManualReceiptEntry({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    vendor_name: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    category: 'invoice',
    total: '',
    subtotal: '',
    tax: '',
    weight_lbs: '',
    notes: '',
    line_items: []
  })

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum 50MB.')
      return
    }

    setSelectedFile(file)
    setError(null)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: '', amount: '' }]
    }))
  }

  const updateLineItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const removeLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.vendor_name.trim()) {
      setError('Vendor name is required')
      return
    }
    if (!formData.total || parseFloat(formData.total) <= 0) {
      setError('Total amount is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = sessionStorage.getItem('adminToken')
      let documentId = null

      // Step 1: Upload file if provided
      if (selectedFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', selectedFile)
        uploadFormData.append('category', formData.category)
        uploadFormData.append('title', `${formData.vendor_name} - ${formData.invoice_date}`)

        const uploadResponse = await fetch('/api/documents/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const err = await uploadResponse.json()
          throw new Error(err.error || 'Failed to upload file')
        }

        const uploadData = await uploadResponse.json()
        documentId = uploadData.document?.id
      } else {
        // Create document record without file
        const docResponse = await fetch(
          `${config.supabase.url}/rest/v1/documents`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': config.supabase.anonKey,
              'Authorization': `Bearer ${config.supabase.anonKey}`,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              category: formData.category,
              title: `${formData.vendor_name} - ${formData.invoice_date}`,
              vendor: formData.vendor_name,
              amount_cents: Math.round(parseFloat(formData.total) * 100),
              weight_lbs: formData.weight_lbs ? parseInt(formData.weight_lbs) : null,
              service_date: formData.invoice_date,
              parse_status: 'confirmed', // Manual entry is pre-confirmed
            }),
          }
        )

        if (!docResponse.ok) {
          throw new Error('Failed to create document record')
        }

        const [doc] = await docResponse.json()
        documentId = doc.id
      }

      // Step 2: Create parsed_invoices record with manual data
      const totalCents = Math.round(parseFloat(formData.total || 0) * 100)
      const subtotalCents = formData.subtotal
        ? Math.round(parseFloat(formData.subtotal) * 100)
        : totalCents
      const taxCents = formData.tax
        ? Math.round(parseFloat(formData.tax) * 100)
        : 0

      const lineItems = formData.line_items
        .filter(item => item.description && item.amount)
        .map(item => ({
          description: item.description,
          quantity: 1,
          total_cents: Math.round(parseFloat(item.amount) * 100)
        }))

      const parsedInvoiceData = {
        document_id: documentId,
        invoice_type: 'vendor_expense',
        from_name: formData.vendor_name,
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        expense_category: formData.category,
        line_items: JSON.stringify(lineItems.length > 0 ? lineItems : [{
          description: `${formData.category} expense`,
          quantity: 1,
          total_cents: totalCents
        }]),
        raw_text: formData.notes || null,
        status: 'confirmed',
        confidence_score: 1.0, // Manual entry = 100% confidence
        confirmed_at: new Date().toISOString(),
        tax_year: new Date(formData.invoice_date).getFullYear(),
      }

      const parseResponse = await fetch(
        `${config.supabase.url}/rest/v1/parsed_invoices`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(parsedInvoiceData),
        }
      )

      if (!parseResponse.ok) {
        const errText = await parseResponse.text()
        console.error('Parse insert error:', errText)
        throw new Error('Failed to save receipt details')
      }

      const [parsedInvoice] = await parseResponse.json()

      // Step 3: Update document with parsed_invoice_id
      await fetch(
        `${config.supabase.url}/rest/v1/documents?id=eq.${documentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
          body: JSON.stringify({
            parsed_invoice_id: parsedInvoice.id,
            parse_status: 'confirmed',
            vendor: formData.vendor_name,
            amount_cents: totalCents,
            weight_lbs: formData.weight_lbs ? parseInt(formData.weight_lbs) : null,
            service_date: formData.invoice_date,
          }),
        }
      )

      if (onSuccess) onSuccess()
      onClose()

    } catch (err) {
      console.error('Manual entry error:', err)
      setError(err.message || 'Failed to save receipt')
    }

    setLoading(false)
  }

  const isWeightCategory = ['weight_ticket', 'disposal', 'landfill'].includes(formData.category)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Manual Receipt Entry</h2>
              <p className="text-sm text-dark-400">Enter receipt details manually</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Photo Upload (Optional) */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Receipt Photo (Optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              capture="environment"
            />

            {selectedFile ? (
              <div className="relative bg-dark-700 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-dark-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-8 h-8 text-dark-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{selectedFile.name}</p>
                    <p className="text-sm text-dark-400">
                      {(selectedFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-4 border-2 border-dashed border-dark-600 rounded-xl text-dark-400 hover:text-white hover:border-dark-500 flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current.removeAttribute('capture')
                    fileInputRef.current?.click()
                  }}
                  className="flex-1 py-4 border-2 border-dashed border-dark-600 rounded-xl text-dark-400 hover:text-white hover:border-dark-500 flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Upload File
                </button>
              </div>
            )}
          </div>

          {/* Vendor Name */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              Vendor / Company Name *
            </label>
            <input
              type="text"
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              placeholder="e.g., Shell Gas Station, Republic Services"
              className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder:text-dark-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Category & Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Invoice Number (Optional) */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Receipt/Invoice # (Optional)
            </label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              placeholder="e.g., INV-12345"
              className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder:text-dark-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Weight (for weight tickets) */}
          {isWeightCategory && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Scale className="w-4 h-4 inline mr-1" />
                Weight (lbs)
              </label>
              <input
                type="number"
                value={formData.weight_lbs}
                onChange={(e) => setFormData({ ...formData, weight_lbs: e.target.value })}
                placeholder="e.g., 4500"
                className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder:text-dark-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              {formData.weight_lbs && (
                <p className="text-sm text-dark-400 mt-1">
                  = {(parseInt(formData.weight_lbs) / 2000).toFixed(2)} tons
                </p>
              )}
            </div>
          )}

          {/* Amounts */}
          <div className="bg-dark-700/50 rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Amounts
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Subtotal</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder:text-dark-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Tax</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder:text-dark-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Total *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder:text-dark-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items (Optional) */}
          <div className="bg-dark-700/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">Line Items (Optional)</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            {formData.line_items.length > 0 ? (
              <div className="space-y-2">
                {formData.line_items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder:text-dark-500 text-sm"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-dark-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-2 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white placeholder:text-dark-500 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="p-2 text-dark-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-500">No line items added</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder:text-dark-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Save Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
