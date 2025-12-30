'use client'

import { useState, useRef } from 'react'
import { config } from '../config'
import {
  Upload,
  X,
  FileText,
  Image,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Scale,
  Receipt,
  Truck,
  File
} from 'lucide-react'

const CATEGORIES = [
  { id: 'weight_ticket', label: 'Weight/Landfill Ticket', icon: Scale },
  { id: 'fuel_receipt', label: 'Fuel Receipt', icon: Receipt },
  { id: 'photo', label: 'Job Photo', icon: Camera },
  { id: 'contract', label: 'Contract/Agreement', icon: FileText },
  { id: 'insurance', label: 'Insurance Document', icon: FileText },
  { id: 'other', label: 'Other', icon: File },
]

export default function DocumentUpload({ 
  bookingId = null, 
  customerId = null, 
  invoiceId = null,
  onUploadComplete = () => {},
  allowedCategories = null, // If null, show all
  compact = false,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [category, setCategory] = useState('other')
  const [metadata, setMetadata] = useState({
    title: '',
    weight_lbs: '',
    amount: '',
  })
  const fileInputRef = useRef(null)

  const categories = allowedCategories 
    ? CATEGORIES.filter(c => allowedCategories.includes(c.id))
    : CATEGORIES

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an image or PDF.')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }

    // Auto-set category based on file name
    const fileName = file.name.toLowerCase()
    if (fileName.includes('weight') || fileName.includes('landfill') || fileName.includes('ticket')) {
      setCategory('weight_ticket')
    } else if (fileName.includes('fuel') || fileName.includes('gas')) {
      setCategory('fuel_receipt')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('category', category)
      formData.append('title', metadata.title || selectedFile.name)
      if (bookingId) formData.append('booking_id', bookingId)
      if (customerId) formData.append('customer_id', customerId)
      if (invoiceId) formData.append('invoice_id', invoiceId)
      if (metadata.weight_lbs) formData.append('weight_lbs', metadata.weight_lbs)
      if (metadata.amount) formData.append('amount_cents', Math.round(parseFloat(metadata.amount) * 100))

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(true)
        setSelectedFile(null)
        setPreview(null)
        setMetadata({ title: '', weight_lbs: '', amount: '' })
        onUploadComplete(data.document)

        // Reset success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const err = await response.json()
        setError(err.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload file')
    }

    setUploading(false)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (compact) {
    // Compact version - just a button that opens file picker
    return (
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload
        </button>
        {selectedFile && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white rounded-lg shadow-lg border border-neutral-200 z-10">
            <p className="text-sm font-medium truncate mb-2">{selectedFile.name}</p>
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-1.5 bg-primary text-white rounded text-sm"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={clearFile}
                className="px-2 py-1.5 bg-neutral-100 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        Upload Document
      </h3>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          Document uploaded successfully!
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* File Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          selectedFile 
            ? 'border-primary bg-primary/5' 
            : 'border-neutral-300 hover:border-primary hover:bg-neutral-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedFile ? (
          <div>
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-40 mx-auto mb-4 rounded-lg" />
            ) : (
              <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
            )}
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-neutral-500">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="absolute top-2 right-2 p-1 bg-neutral-100 rounded-full hover:bg-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-center gap-2 mb-4">
              <Image className="w-8 h-8 text-neutral-400" />
              <FileText className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-neutral-600">
              <span className="text-primary font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              Images or PDF up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Document Details (shown when file selected) */}
      {selectedFile && (
        <div className="mt-4 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Document Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categories.map(cat => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      category === cat.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              placeholder={selectedFile.name}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Weight (for weight tickets) */}
          {category === 'weight_ticket' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Weight (lbs)
              </label>
              <input
                type="number"
                value={metadata.weight_lbs}
                onChange={(e) => setMetadata({ ...metadata, weight_lbs: e.target.value })}
                placeholder="e.g., 4500"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}

          {/* Amount (for receipts) */}
          {(category === 'fuel_receipt' || category === 'other') && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={metadata.amount}
                onChange={(e) => setMetadata({ ...metadata, amount: e.target.value })}
                placeholder="e.g., 125.50"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Document
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
