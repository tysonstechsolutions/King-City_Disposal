'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import { useToast } from '../../../components/Toast'
import ParsedInvoiceReview from '../../../components/ParsedInvoiceReview'
import ManualReceiptEntry from '../../../components/ManualReceiptEntry'
import { DOCUMENT_CATEGORIES, formatCurrency, formatDate, formatWeight, getDocumentCategory, formatCategoryLabel } from '../../../lib/constants'
import {
  FileText,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  Filter,
  X,
  Calendar,
  Eye,
  RotateCcw,
  RefreshCw,
  Image,
  FileSpreadsheet,
  Scale,
  Sparkles,
  ChevronDown,
  FolderOpen,
  Clock,
  Receipt,
  Upload,
  Camera,
  Plus,
  PenLine
} from 'lucide-react'

export default function DocumentsPage() {
  const router = useRouter()
  const toast = useToast()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date')

  // Invoice parsing state
  const [reviewingDoc, setReviewingDoc] = useState(null)
  const [parsedInvoice, setParsedInvoice] = useState(null)
  const [parsing, setParsing] = useState({})

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploadServiceDate, setUploadServiceDate] = useState('')
  const [uploadCategory, setUploadCategory] = useState('invoice')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      // Always fetch ALL documents so stats remain accurate
      const response = await fetch(
        `${config.supabase.url}/rest/v1/documents?order=created_at.desc`,
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

  // ============================================
  // UPLOAD FUNCTIONS
  // ============================================
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.')
      return
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    const ext = file.name?.toLowerCase().split('.').pop()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'pdf', 'xlsx', 'xls', 'csv']
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      toast.error('Invalid file type. Use image, PDF, Excel, or CSV.')
      return
    }

    setSelectedFile(file)
    setShowUploadModal(true)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', selectedFile.name)
      formData.append('category', uploadCategory)
      if (uploadServiceDate) formData.append('service_date', uploadServiceDate)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        closeUploadModal()

        // If parsing was triggered by upload, poll for completion and auto-open review
        if (data.parsing && data.document?.id) {
          toast.success('Uploaded! AI is analyzing...')
          const docId = data.document.id
          setParsing(prev => ({ ...prev, [docId]: true }))

          // Poll for parsing completion
          const pollForParsed = async (attempts = 0) => {
            if (attempts > 30) { // Max 30 seconds
              setParsing(prev => ({ ...prev, [docId]: false }))
              toast.error('Parsing timed out. Click the document to retry.')
              fetchDocuments()
              return
            }

            try {
              const checkResponse = await fetch(
                `${config.supabase.url}/rest/v1/documents?id=eq.${docId}&select=id,parse_status,title,file_name,file_type,storage_path,category,amount_cents,weight_lbs,service_date,created_at`,
                {
                  headers: {
                    'apikey': config.supabase.anonKey,
                    'Authorization': `Bearer ${config.supabase.anonKey}`,
                  },
                }
              )

              if (checkResponse.ok) {
                const [doc] = await checkResponse.json()
                if (doc?.parse_status === 'parsed' || doc?.parse_status === 'confirmed') {
                  // Parsing complete! Auto-open review modal
                  setParsing(prev => ({ ...prev, [docId]: false }))
                  toast.success('Document analyzed! Review the extracted data.')
                  fetchDocuments()
                  // Auto-open review modal
                  openReview(doc)
                  return
                } else if (doc?.parse_status === 'failed') {
                  setParsing(prev => ({ ...prev, [docId]: false }))
                  toast.error('Parsing failed. Click to retry.')
                  fetchDocuments()
                  return
                }
              }
            } catch (e) {
              console.error('Poll error:', e)
            }

            // Keep polling
            setTimeout(() => pollForParsed(attempts + 1), 1000)
          }

          fetchDocuments()
          pollForParsed()
        } else {
          toast.success('Document uploaded!')
          fetchDocuments()
        }
      } else {
        const err = await response.json()
        toast.error(err.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Failed to upload')
    }

    setUploading(false)
  }

  const closeUploadModal = () => {
    setShowUploadModal(false)
    setSelectedFile(null)
    setPreview(null)
    setUploadServiceDate('')
    setUploadCategory('invoice')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const deleteDocument = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this document?')) return

    try {
      const token = sessionStorage.getItem('adminToken')
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        toast.success('Document deleted')
        fetchDocuments()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to delete document')
      }
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete document')
    }
  }

  // Parse a document with AI
  const parseDocument = async (e, docId) => {
    e.stopPropagation()
    setParsing(prev => ({ ...prev, [docId]: true }))
    try {
      const token = sessionStorage.getItem('adminToken')
      const response = await fetch('/api/documents/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ document_id: docId }),
      })

      if (response.ok) {
        toast.success('Document parsed successfully!')
        fetchDocuments()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to parse document')
      }
    } catch (err) {
      console.error('Parse error:', err)
      toast.error('Failed to parse document')
    }
    setParsing(prev => ({ ...prev, [docId]: false }))
  }

  // Open review modal for a parsed document
  const openReview = async (doc) => {
    setReviewingDoc(doc)
    try {
      const token = sessionStorage.getItem('adminToken')
      const response = await fetch(`/api/documents/parse?document_id=${doc.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
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

  // Handle row click - open review if parsed, otherwise view file
  const handleRowClick = (doc) => {
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
  }

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return Image
    if (type?.includes('spreadsheet') || type?.includes('excel') || type?.includes('csv')) return FileSpreadsheet
    return FileText
  }

  // Stats calculations
  const stats = useMemo(() => ({
    total: documents.length,
    parsed: documents.filter(d => d.parse_status === 'parsed' || d.parse_status === 'confirmed').length,
    pending: documents.filter(d => !d.parse_status || d.parse_status === 'pending').length,
    failed: documents.filter(d => d.parse_status === 'failed').length,
    totalWeight: documents.reduce((sum, d) => sum + (d.weight_lbs || 0), 0),
    totalAmount: documents.reduce((sum, d) => sum + (d.amount_cents || 0), 0),
  }), [documents])

  // Build dynamic category list from actual documents
  const uniqueCategories = useMemo(() => {
    const categories = new Set()
    documents.forEach(doc => {
      if (doc.category) categories.add(doc.category)
    })
    // Convert to array of {id, label} and sort alphabetically
    return Array.from(categories)
      .map(cat => ({
        id: cat,
        label: getDocumentCategory(cat).label
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [documents])

  // Filtered and sorted documents
  const filteredDocs = useMemo(() => {
    return documents
      .filter(doc => {
        // Category filter
        if (filterCategory !== 'all' && doc.category !== filterCategory) return false

        // Status filter
        if (filterStatus !== 'all') {
          if (filterStatus === 'pending') {
            // Pending includes docs with no parse_status or parse_status === 'pending'
            if (doc.parse_status && doc.parse_status !== 'pending') return false
          } else {
            if (doc.parse_status !== filterStatus) return false
          }
        }

        // Search filter
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
          doc.title?.toLowerCase().includes(search) ||
          doc.file_name?.toLowerCase().includes(search)
        )
      })
      .sort((a, b) => {
        if (sortBy === 'amount') {
          return (b.amount_cents || 0) - (a.amount_cents || 0)
        }
        if (sortBy === 'weight') {
          return (b.weight_lbs || 0) - (a.weight_lbs || 0)
        }
        if (sortBy === 'service_date') {
          return new Date(b.service_date || 0) - new Date(a.service_date || 0)
        }
        // Default: newest first
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [documents, searchTerm, sortBy, filterCategory, filterStatus])

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      parsing: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Parsing</span>,
      parsed: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Parsed</span>,
      confirmed: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Confirmed</span>,
      failed: <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Failed</span>,
    }
    return badges[status] || <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-dark-600 text-dark-300 border border-dark-500">Pending</span>
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setFilterCategory('all')
    setFilterStatus('all')
    setSortBy('date')
  }

  const hasActiveFilters = searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || sortBy !== 'date'

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Documents</h1>
                <p className="text-sm text-dark-400">{documents.length} files</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif,application/pdf,.xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                capture="environment"
              />
              <button
                onClick={fetchDocuments}
                disabled={loading}
                className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowManualEntry(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-dark-700 text-white rounded-lg font-medium hover:bg-dark-600 transition-colors border border-dark-600"
                title="Enter receipt details manually"
              >
                <PenLine className="w-4 h-4" />
                <span className="hidden sm:inline">Manual</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => { setFilterStatus('all'); setFilterCategory('all') }}
            className={`bg-dark-800 rounded-xl p-4 border transition-all text-left ${
              filterStatus === 'all' && filterCategory === 'all' ? 'border-primary ring-2 ring-primary/20' : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-dark-400" />
              <span className="text-sm text-dark-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </button>

          <button
            onClick={() => setFilterStatus('parsed')}
            className={`bg-dark-800 rounded-xl p-4 border transition-all text-left ${
              filterStatus === 'parsed' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-dark-400">Parsed</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.parsed}</p>
          </button>

          <button
            onClick={() => setFilterStatus('pending')}
            className={`bg-dark-800 rounded-xl p-4 border transition-all text-left ${
              filterStatus === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-dark-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          </button>

          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-dark-400">Total Weight</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{formatWeight(stats.totalWeight)}</p>
          </div>

          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-dark-400">Total Amount</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                placeholder="Search by title or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-dark-500"
              />
            </div>

            {/* Category Filter - uses dynamic categories from actual documents */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="all">All Types</option>
                {uniqueCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer pr-8 min-w-[130px]"
              >
                <option value="all">All Status</option>
                <option value="parsed">Parsed</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 bg-dark-700 text-white border border-dark-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer pr-8"
              >
                <option value="date">Newest First</option>
                <option value="service_date">Service Date</option>
                <option value="amount">By Amount</option>
                <option value="weight">By Weight</option>
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

        {/* Documents List */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 mb-2">No documents found</p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="text-primary hover:underline">
                  Clear filters
                </button>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline">
                  Upload your first document
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {filteredDocs.map((doc) => {
                const catInfo = getDocumentCategory(doc.category)
                const FileIcon = getFileIcon(doc.file_type)
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleRowClick(doc)}
                    className="p-4 hover:bg-dark-750 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Thumbnail or Icon */}
                      <div className="w-14 h-14 bg-dark-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {doc.file_type?.startsWith('image/') && doc.id ? (
                          <img
                            src={`/api/documents/image/${doc.id}`}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<svg class="w-6 h-6 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>' }}
                          />
                        ) : (
                          <FileIcon className="w-6 h-6 text-dark-500" />
                        )}
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="font-medium text-white group-hover:text-primary truncate">
                            {doc.title || doc.file_name}
                          </span>
                          {getStatusBadge(doc.parse_status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dark-400">
                          <span className={`px-2 py-0.5 rounded text-xs bg-dark-700 text-dark-300`}>
                            {catInfo.label}
                          </span>
                          {doc.service_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(doc.service_date)}
                            </span>
                          )}
                          {doc.weight_lbs > 0 && (
                            <span className="flex items-center gap-1 text-blue-400">
                              <Scale className="w-3.5 h-3.5" />
                              {formatWeight(doc.weight_lbs)}
                            </span>
                          )}
                          <span className="text-dark-500">
                            Uploaded {formatDate(doc.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      {doc.amount_cents > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-white">
                            {formatCurrency(doc.amount_cents)}
                          </p>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {/* Parse/Review/Reparse buttons */}
                        {doc.parse_status === 'parsing' || parsing[doc.id] ? (
                          <div className="px-3 py-2 text-amber-400 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : doc.parse_status === 'parsed' || doc.parse_status === 'confirmed' ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); openReview(doc) }}
                              className="p-2 text-dark-400 hover:text-purple-400 hover:bg-dark-700 rounded-lg transition-colors"
                              title="Review parsed data"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => parseDocument(e, doc.id)}
                              className="p-2 text-dark-400 hover:text-amber-400 hover:bg-dark-700 rounded-lg transition-colors"
                              title="Re-parse with AI"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </>
                        ) : doc.parse_status === 'failed' ? (
                          <button
                            onClick={(e) => parseDocument(e, doc.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Retry parse"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => parseDocument(e, doc.id)}
                            disabled={parsing[doc.id]}
                            className="p-2 text-dark-400 hover:text-amber-400 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Parse with AI"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        )}

                        {doc.storage_path && (
                          <a
                            href={doc.storage_path.startsWith('http')
                              ? doc.storage_path
                              : `${config.supabase.url}/storage/v1/object/public/documents/${doc.storage_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                            onClick={e => e.stopPropagation()}
                            title="Open original file"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={(e) => deleteDocument(e, doc.id)}
                          className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Results count */}
        {!loading && filteredDocs.length > 0 && (
          <p className="text-sm text-dark-500 mt-4 text-center">
            Showing {filteredDocs.length} of {documents.length} documents
          </p>
        )}
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
            toast.success('Document confirmed!')
          }}
          onReparse={() => {
            closeReview()
            parseDocument({ stopPropagation: () => {} }, reviewingDoc.id)
          }}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl max-w-md w-full">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-white">Upload Document</h2>
              </div>
              <button
                onClick={closeUploadModal}
                className="p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* File Preview */}
              <div className="flex items-start gap-4">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-xl" />
                ) : (
                  <div className="w-20 h-20 bg-dark-700 rounded-xl flex items-center justify-center">
                    {selectedFile?.type?.startsWith('image/') ? (
                      <Image className="w-8 h-8 text-dark-500" />
                    ) : selectedFile?.type?.includes('pdf') ? (
                      <FileText className="w-8 h-8 text-dark-500" />
                    ) : (
                      <FileSpreadsheet className="w-8 h-8 text-dark-500" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{selectedFile?.name}</p>
                  <p className="text-sm text-dark-400">
                    {selectedFile && (selectedFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Document Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'invoice', label: 'Invoice' },
                    { value: 'weight_ticket', label: 'Weight Ticket' },
                    { value: 'fuel', label: 'Fuel' },
                    { value: 'disposal', label: 'Disposal' },
                    { value: 'truck_maintenance', label: 'Truck Maint.' },
                    { value: 'office_supplies', label: 'Office Supplies' },
                    { value: 'cleaning_supplies', label: 'Cleaning' },
                    { value: 'meals', label: 'Meals' },
                    { value: 'advertising', label: 'Advertising' },
                    { value: 'misc', label: 'Misc' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setUploadCategory(type.value)}
                      className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                        uploadCategory === type.value
                          ? 'bg-primary text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Date */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Service Date (optional)
                </label>
                <input
                  type="date"
                  value={uploadServiceDate}
                  onChange={(e) => setUploadServiceDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              {/* AI Info */}
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300/80">
                  AI will automatically extract vendor, amounts, and details after upload.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeUploadModal}
                  className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
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
          </div>
        </div>
      )}

      {/* Manual Receipt Entry Modal */}
      {showManualEntry && (
        <ManualReceiptEntry
          onClose={() => setShowManualEntry(false)}
          onSuccess={() => {
            toast.success('Receipt saved successfully!')
            fetchDocuments()
          }}
        />
      )}
    </div>
  )
}
