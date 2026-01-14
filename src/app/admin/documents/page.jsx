'use client'

import { useState, useEffect, useRef } from 'react'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import ParsedInvoiceReview from '../../../components/ParsedInvoiceReview'
import { DOCUMENT_CATEGORIES, formatCurrency, formatDate, formatWeight, getDocumentCategory } from '../../../lib/constants'
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
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
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
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 sticky top-14 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Documents</h1>
                <p className="text-sm text-dark-400">{documents.length} files</p>
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
              className="w-full py-6 bg-amber-400 rounded-xl font-bold text-xl flex items-center justify-center gap-3 hover:bg-amber-500 active:scale-[0.98] transition-all shadow-lg text-white"
            >
              <Camera className="w-8 h-8" />
              Upload Photo or Document
            </button>
            <p className="text-center text-sm text-dark-400 mt-2">
              Tap to take a photo or choose from gallery
            </p>
          </div>
        )}

        {/* Upload Form - Simplified (AI extracts all details) */}
        {showUploadForm && selectedFile && (
          <div className="mb-6 bg-dark-800 rounded-xl border border-dark-700 p-4 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
              {preview ? (
                <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
              ) : (
                <div className="w-20 h-20 bg-dark-700 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-dark-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-sm text-dark-400">{(selectedFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={cancelUpload} className="p-2 text-dark-500 hover:text-dark-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title (optional) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-200 mb-1">Title (optional)</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={selectedFile.name}
                className="w-full px-3 py-2 border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-dark-700 text-white"
              />
            </div>

            {/* AI Info */}
            <div className="mb-4 text-sm text-dark-400 flex items-center gap-2 bg-dark-700 p-3 rounded-lg">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI will automatically detect type, extract amounts, weights & vendor info</span>
            </div>

            {/* Upload Button */}
            <div className="flex gap-3">
              <button
                onClick={cancelUpload}
                className="flex-1 py-3 bg-dark-700 text-dark-200 rounded-lg font-medium"
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
                    Upload & Analyze
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
                : 'bg-white border border-dark-700 text-dark-200'
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
                  : 'bg-white border border-dark-700 text-dark-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-dark-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        {/* Documents List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 bg-dark-800 rounded-xl border border-dark-700">
              <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">No documents yet</p>
              <p className="text-sm text-dark-500">Upload your first document above</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const catInfo = getDocumentCategory(doc.category)
              const Icon = catInfo.icon
              return (
                <div
                  key={doc.id}
                  className="bg-dark-800 rounded-xl border border-dark-700 p-4 flex items-center gap-4 hover:border-dark-600 transition-colors"
                >
                  {/* Thumbnail or Icon - Clickable to view/review */}
                  <button
                    onClick={() => {
                      if (doc.parse_status === 'parsed' || doc.parse_status === 'confirmed') {
                        openReview(doc)
                      } else if (doc.storage_path) {
                        window.open(
                          doc.storage_path.startsWith('http')
                            ? doc.storage_path
                            : `${config.supabase.url}/storage/v1/object/public/documents/${doc.storage_path}`,
                          '_blank'
                        )
                      }
                    }}
                    className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 bg-${catInfo.color}-100 hover:bg-${catInfo.color}-200 transition-colors cursor-pointer`}
                  >
                    {doc.file_type?.startsWith('image/') && doc.id ? (
                      <img
                        src={`/api/documents/image/${doc.id}`}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <Icon className={`w-7 h-7 text-${catInfo.color}-600`} />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{doc.title || doc.file_name}</p>
                    <div className="flex items-center gap-3 text-sm text-dark-400">
                      <span className={`px-2 py-0.5 rounded-full text-xs bg-${catInfo.color}-100 text-${catInfo.color}-700`}>
                        {catInfo.label}
                      </span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                    {doc.weight_lbs && (
                      <p className="text-sm text-blue-600 mt-1">
                        <Scale className="w-3 h-3 inline mr-1" />
                        {formatWeight(doc.weight_lbs)}
                      </p>
                    )}
                    {doc.amount_cents && (
                      <p className="text-sm text-green-600 mt-1">
                        {formatCurrency(doc.amount_cents)}
                      </p>
                    )}
                    {/* Parse Status Badge */}
                    {doc.parse_status && (
                      <div className="mt-1">
                        {doc.parse_status === 'parsing' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            AI Parsing...
                          </span>
                        )}
                        {doc.parse_status === 'parsed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Parsed - Click Review
                          </span>
                        )}
                        {doc.parse_status === 'confirmed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmed
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
                  <div className="flex items-center gap-2">
                    {/* Parse/Review/Reparse buttons for ALL document types */}
                    {doc.parse_status === 'parsing' || parsing[doc.id] ? (
                      <div className="px-3 py-2 bg-amber-50 text-amber-600 rounded-lg flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Parsing...</span>
                      </div>
                    ) : doc.parse_status === 'parsed' || doc.parse_status === 'confirmed' ? (
                      <>
                        <button
                          onClick={() => openReview(doc)}
                          className="px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg flex items-center gap-2 font-medium text-sm"
                          title="Review parsed data"
                        >
                          <Eye className="w-5 h-5" />
                          <span className="hidden sm:inline">Review</span>
                        </button>
                        <button
                          onClick={() => parseInvoice(doc.id)}
                          className="p-2 text-dark-500 hover:text-amber-600 rounded-lg hover:bg-dark-700"
                          title="Re-parse with AI"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      </>
                    ) : doc.parse_status === 'failed' ? (
                      <button
                        onClick={() => parseInvoice(doc.id)}
                        className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex items-center gap-2 font-medium text-sm"
                        title="Retry parse"
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span className="hidden sm:inline">Retry</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => parseInvoice(doc.id)}
                        disabled={parsing[doc.id]}
                        className="px-3 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg flex items-center gap-2 font-medium text-sm"
                        title="Parse with AI"
                      >
                        <Sparkles className="w-5 h-5" />
                        <span className="hidden sm:inline">Parse</span>
                      </button>
                    )}
                    {doc.storage_path && (
                      <a
                        href={doc.storage_path.startsWith('http')
                          ? doc.storage_path
                          : `${config.supabase.url}/storage/v1/object/public/documents/${doc.storage_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-dark-500 hover:text-primary rounded-lg hover:bg-dark-700"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-2 text-dark-500 hover:text-red-500 rounded-lg hover:bg-dark-700"
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
