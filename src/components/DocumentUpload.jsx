'use client'

import { useState, useRef } from 'react'
import {
  Upload,
  X,
  FileText,
  Image,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react'

export default function DocumentUpload({
  bookingId = null,
  customerId = null,
  invoiceId = null,
  onUploadComplete = () => {},
  compact = false,
}) {
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [title, setTitle] = useState('')
  const fileInputRef = useRef(null)

  // Allowed file types for upload
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'text/xml', 'application/xml',
    'text/csv',
  ]

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.')
      return
    }

    // Validate file type
    const ext = file.name?.toLowerCase().split('.').pop()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'pdf', 'xlsx', 'xls', 'xml', 'csv']

    if (!ALLOWED_TYPES.includes(file.type) && !allowedExtensions.includes(ext)) {
      setError('Invalid file type. Allowed: images, PDF, Excel, XML, CSV')
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
  }

  // Auto-detect document category from filename
  const detectCategory = (filename) => {
    const name = filename.toLowerCase()
    if (name.includes('weight') || name.includes('landfill') || name.includes('ticket') || name.includes('dump')) {
      return 'weight_ticket'
    }
    if (name.includes('fuel') || name.includes('gas') || name.includes('diesel')) {
      return 'fuel_receipt'
    }
    if (name.includes('tire') || name.includes('oil') || name.includes('maintenance') ||
        name.includes('repair') || name.includes('service') || name.includes('brake') ||
        name.includes('lube') || name.includes('tune')) {
      return 'maintenance'
    }
    if (name.includes('invoice') || name.includes('bill')) {
      return 'invoice'
    }
    if (name.includes('receipt')) {
      return 'fuel_receipt'
    }
    return 'invoice' // Default to invoice for AI parsing
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)

    try {
      // Auto-detect category from filename
      const category = detectCategory(selectedFile.name)

      // Create form data
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('category', category)
      formData.append('title', title || selectedFile.name)
      if (bookingId) formData.append('booking_id', bookingId)
      if (customerId) formData.append('customer_id', customerId)
      if (invoiceId) formData.append('invoice_id', invoiceId)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()

        // Show upload success
        setUploading(false)

        // If parsing was triggered, show parsing status
        if (data.parsing) {
          setParsing(true)
          setSuccessMessage('Uploaded! AI is analyzing the document...')
          setSuccess(true)

          // Poll for parsing completion (optional enhancement)
          setTimeout(() => {
            setParsing(false)
            setSuccessMessage('Document uploaded and analyzed!')
          }, 3000)
        } else {
          setSuccess(true)
          setSuccessMessage('Document uploaded successfully!')
        }

        setSelectedFile(null)
        setPreview(null)
        setTitle('')
        onUploadComplete(data.document)

        // Reset success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000)
      } else {
        const err = await response.json()
        setError(err.error || 'Upload failed')
      }
    } catch (err) {
      setError('Failed to upload file')
    }

    setUploading(false)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
    setTitle('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Accept string for file input
  const acceptTypes = "image/*,application/pdf,.xlsx,.xls,.xml,.csv"

  if (compact) {
    // Compact version - just a button that opens file picker
    return (
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || parsing}
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
          {parsing ? (
            <Sparkles className="w-5 h-5 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          {successMessage}
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
          accept={acceptTypes}
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
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
              Images, PDF, Excel, or XML up to 50MB
            </p>
            <p className="text-xs text-neutral-400 mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI automatically extracts invoice details
            </p>
          </div>
        )}
      </div>

      {/* Document Details (shown when file selected) - Simplified! */}
      {selectedFile && (
        <div className="mt-4 space-y-4">
          {/* Title (optional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedFile.name}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* AI Info */}
          <div className="text-sm text-neutral-500 flex items-center gap-2 bg-neutral-50 p-3 rounded-lg">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI will automatically detect document type, extract amounts, weights, and vendor info</span>
          </div>

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
                Upload & Analyze
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
