'use client'

import { useState, useEffect, useRef } from 'react'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import ParsedInvoiceReview from '../../../components/ParsedInvoiceReview'
import { DOCUMENT_CATEGORIES, formatCurrency, formatDate, getDocumentCategory } from '../../../lib/constants'
import {
  Upload,
  FileText,
  Image,
  Scale,
  Receipt,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  Filter,
  Search,
  X,
  File,
  Droplet,
  Calendar,
  Sparkles,
  Eye,
  RotateCcw
} from 'lucide-react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploadCategory, setUploadCategory] = useState('other')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadAmount, setUploadAmount] = useState('')
  const [uploadWeight, setUploadWeight] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)

  // Invoice parsing state
  const [reviewingDoc, setReviewingDoc] = useState(null)
  const [parsedInvoice, setParsedInvoice] = useState(null)
  const [parsing, setParsing] = useState({})

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('adminAuth') !== 'true') {
      window.location.href = '/admin'
      return
    }
    fetchDocuments()
  }, [filterCategory])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      let query = 'order=created_at.desc'
      if (filterCategory !== 'all') {
        query += `&category=eq.${filterCategory}`
      }

      const response = await fetch(
        `${config.supabase.url}/rest/v1/documents?${query}`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
    }
    setLoading(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10MB.')
      return
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Use image, PDF, Excel, or CSV.')
      return
    }

    setSelectedFile(file)
    setError(null)
    setShowUploadForm(true)

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }

    // Auto-detect category from filename
    const fileName = file.name.toLowerCase()
    if (fileName.includes('weight') || fileName.includes('landfill') || fileName.includes('ticket')) {
      setUploadCategory('weight_ticket')
    } else if (fileName.includes('fuel') || fileName.includes('gas')) {
      setUploadCategory('fuel_receipt')
    } else if (fileName.includes('invoice')) {
      setUploadCategory('invoice')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('category', uploadCategory)
      formData.append('title', uploadTitle || selectedFile.name)
      if (uploadWeight) formData.append('weight_lbs', uploadWeight)
      if (uploadAmount) formData.append('amount_cents', Math.round(parseFloat(uploadAmount) * 100))

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setSuccess('Document uploaded!')
        setSelectedFile(null)
        setPreview(null)
        setUploadTitle('')
        setUploadAmount('')
        setUploadWeight('')
        setShowUploadForm(false)
        fetchDocuments()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const err = await response.json()
        setError(err.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload')
    }

    setUploading(false)
  }

  const deleteDocument = async (id) => {
    if (!confirm('Delete this document?')) return

    try {
      await fetch(
        `${config.supabase.url}/rest/v1/documents?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      fetchDocuments()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const cancelUpload = () => {
    setSelectedFile(null)
    setPreview(null)
    setShowUploadForm(false)
    setUploadTitle('')
    setUploadAmount('')
    setUploadWeight('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Parse an invoice with AI
  const parseInvoice = async (docId) => {
    setParsing(prev => ({ ...prev, [docId]: true }))
    try {
      const response = await fetch('/api/documents/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId }),
      })

      if (response.ok) {
        setSuccess('Invoice parsed! Click Review to see results.')
        fetchDocuments()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to parse invoice')
      }
    } catch (err) {
      console.error('Parse error:', err)
      setError('Failed to parse invoice')
    }
    setParsing(prev => ({ ...prev, [docId]: false }))
  }

  // Open review modal for a parsed invoice
  const openReview = async (doc) => {
    setReviewingDoc(doc)
    try {
      const response = await fetch(`/api/documents/parse?document_id=${doc.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          setParsedInvoice(data[0])
        }
      }
    } catch (err) {
      console.error('Error fetching parsed data:', err)
    }
  }

  const closeReview = () => {
    setReviewingDoc(null)
    setParsedInvoice(null)
    fetchDocuments()
  }

  const filteredDocs = documents.filter(doc => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      doc.title?.toLowerCase().includes(search) ||
      doc.file_name?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminNav />

      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-14 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Documents</h1>
                <p className="text-sm text-neutral-500">{documents.length} files</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Button - Big and Mobile Friendly */}
        {!showUploadForm && (
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              capture="environment"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-6 bg-amber-400 rounded-xl font-bold text-xl flex items-center justify-center gap-3 hover:bg-amber-500 active:scale-[0.98] transition-all shadow-lg text-black"
            >
              <Camera className="w-8 h-8" />
              Upload Photo or Document
            </button>
            <p className="text-center text-sm text-neutral-500 mt-2">
              Tap to take a photo or choose from gallery
            </p>
          </div>
        )}

        {/* Upload Form */}
        {showUploadForm && selectedFile && (
          <div className="mb-6 bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
              {preview ? (
                <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
              ) : (
                <div className="w-20 h-20 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-neutral-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 truncate">{selectedFile.name}</p>
                <p className="text-sm text-neutral-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={cancelUpload} className="p-2 text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DOCUMENT_CATEGORIES.slice(0, 6).map(cat => {
                  const Icon = cat.icon
                  const isSelected = uploadCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setUploadCategory(cat.id)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={selectedFile.name}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            {/* Weight (for weight tickets) */}
            {uploadCategory === 'weight_ticket' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  value={uploadWeight}
                  onChange={(e) => setUploadWeight(e.target.value)}
                  placeholder="e.g., 4500"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            )}

            {/* Amount (for receipts) */}
            {(uploadCategory === 'fuel_receipt' || uploadCategory === 'invoice' || uploadCategory === 'other') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={uploadAmount}
                  onChange={(e) => setUploadAmount(e.target.value)}
                  placeholder="e.g., 125.50"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            )}

            {/* Upload Button */}
            <div className="flex gap-3">
              <button
                onClick={cancelUpload}
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-3 bg-primary text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-white border border-neutral-200 text-neutral-700'
            }`}
          >
            All
          </button>
          {DOCUMENT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        {/* Documents List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No documents yet</p>
              <p className="text-sm text-neutral-400">Upload your first document above</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const catInfo = getDocumentCategory(doc.category)
              const Icon = catInfo.icon
              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-4"
                >
                  {/* Thumbnail or Icon */}
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 bg-${catInfo.color}-100`}>
                    {doc.file_type?.startsWith('image/') && doc.id ? (
                      <img
                        src={`/api/documents/image/${doc.id}`}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <Icon className={`w-6 h-6 text-${catInfo.color}-600`} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{doc.title || doc.file_name}</p>
                    <div className="flex items-center gap-3 text-sm text-neutral-500">
                      <span className={`px-2 py-0.5 rounded-full text-xs bg-${catInfo.color}-100 text-${catInfo.color}-700`}>
                        {catInfo.label}
                      </span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                    {doc.weight_lbs && (
                      <p className="text-sm text-blue-600 mt-1">
                        <Scale className="w-3 h-3 inline mr-1" />
                        {doc.weight_lbs.toLocaleString()} lbs
                      </p>
                    )}
                    {doc.amount_cents && (
                      <p className="text-sm text-green-600 mt-1">
                        {formatCurrency(doc.amount_cents)}
                      </p>
                    )}
                    {/* Parse Status Badge */}
                    {doc.category === 'invoice' && doc.parse_status && (
                      <div className="mt-1">
                        {doc.parse_status === 'parsing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Parsing...
                          </span>
                        )}
                        {doc.parse_status === 'parsed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                            <Sparkles className="w-3 h-3" />
                            Parsed - Review
                          </span>
                        )}
                        {doc.parse_status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                            <AlertCircle className="w-3 h-3" />
                            Parse Failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Parse/Review buttons for invoices */}
                    {doc.category === 'invoice' && (
                      <>
                        {doc.parse_status === 'parsed' ? (
                          <button
                            onClick={() => openReview(doc)}
                            className="p-2 text-purple-500 hover:text-purple-700 rounded-lg hover:bg-purple-50"
                            title="Review parsed data"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        ) : doc.parse_status === 'parsing' || parsing[doc.id] ? (
                          <div className="p-2">
                            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                          </div>
                        ) : (
                          <button
                            onClick={() => parseInvoice(doc.id)}
                            disabled={parsing[doc.id]}
                            className="p-2 text-amber-500 hover:text-amber-700 rounded-lg hover:bg-amber-50"
                            title="Parse with AI"
                          >
                            <Sparkles className="w-5 h-5" />
                          </button>
                        )}
                        {doc.parse_status === 'failed' && (
                          <button
                            onClick={() => parseInvoice(doc.id)}
                            className="p-2 text-neutral-400 hover:text-amber-500 rounded-lg hover:bg-neutral-100"
                            title="Retry parse"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}
                    {doc.storage_path && (
                      <a
                        href={doc.storage_path.startsWith('http')
                          ? doc.storage_path
                          : `${config.supabase.url}/storage/v1/object/public/documents/${doc.storage_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-100"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* Parsed Invoice Review Modal */}
      {reviewingDoc && parsedInvoice && (
        <ParsedInvoiceReview
          document={reviewingDoc}
          parsedInvoice={parsedInvoice}
          imageUrl={reviewingDoc.id
            ? `/api/documents/image/${reviewingDoc.id}`
            : null}
          onClose={closeReview}
          onConfirm={() => {
            setSuccess('Invoice confirmed!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onReparse={() => {
            closeReview()
            parseInvoice(reviewingDoc.id)
          }}
        />
      )}
    </div>
  )
}
