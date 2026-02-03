'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import { useToast } from '../../../components/Toast'
import {
  Upload,
  FileText,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Sparkles,
  Image,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [recentUploads, setRecentUploads] = useState([])

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploadServiceDate, setUploadServiceDate] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin'
      return
    }
    fetchRecentUploads()
  }, [])

  const fetchRecentUploads = async () => {
    try {
      const response = await fetch(
        `${config.supabase.url}/rest/v1/documents?order=created_at.desc&limit=5`,
        {
          headers: {
            'apikey': config.supabase.anonKey,
            'Authorization': `Bearer ${config.supabase.anonKey}`,
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setRecentUploads(data)
      }
    } catch (err) {
      console.error('Error fetching recent uploads:', err)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.')
      return
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use image, PDF, Excel, or CSV.')
      return
    }

    setSelectedFile(file)
    setShowUploadForm(true)

    // Create preview for images
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
      if (uploadServiceDate) formData.append('service_date', uploadServiceDate)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Uploaded! AI is analyzing...')

        // Reset form
        setSelectedFile(null)
        setPreview(null)
        setUploadServiceDate('')
        setShowUploadForm(false)
        if (fileInputRef.current) fileInputRef.current.value = ''

        // Auto-trigger AI parsing
        if (data.document?.id) {
          try {
            const parseResponse = await fetch('/api/documents/parse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ document_id: data.document.id }),
            })
            if (parseResponse.ok) {
              toast.success('Document analyzed successfully!')
            }
          } catch (parseErr) {
            console.error('Auto-parse error:', parseErr)
          }
        }

        fetchRecentUploads()
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

  const cancelUpload = () => {
    setSelectedFile(null)
    setPreview(null)
    setShowUploadForm(false)
    setUploadServiceDate('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return Image
    if (type?.includes('spreadsheet') || type?.includes('excel') || type?.includes('csv')) return FileSpreadsheet
    return FileText
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <AdminNav />

      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Upload Document</h1>
              <p className="text-dark-400">Upload receipts, invoices, weight tickets & more</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Upload Area */}
        {!showUploadForm ? (
          <div className="mb-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              capture="environment"
            />

            {/* Main Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-16 bg-dark-800 border-2 border-dashed border-dark-600 hover:border-primary rounded-2xl font-semibold text-lg flex flex-col items-center justify-center gap-4 hover:bg-dark-750 active:scale-[0.99] transition-all text-dark-300 hover:text-primary group"
            >
              <div className="p-4 bg-dark-700 group-hover:bg-primary/20 rounded-full transition-colors">
                <Camera className="w-12 h-12" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold">Tap to Upload</p>
                <p className="text-sm text-dark-500 mt-1">Take a photo or choose from gallery</p>
              </div>
            </button>

            {/* Supported formats */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-dark-500">
              <span className="flex items-center gap-1">
                <Image className="w-4 h-4" /> Images
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> PDF
              </span>
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" /> Excel/CSV
              </span>
            </div>
          </div>
        ) : (
          /* Upload Form */
          <div className="mb-8 bg-dark-800 rounded-2xl border border-dark-700 p-6">
            <div className="flex items-start gap-4 mb-6">
              {preview ? (
                <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-xl" />
              ) : (
                <div className="w-24 h-24 bg-dark-700 rounded-xl flex items-center justify-center">
                  {(() => {
                    const Icon = getFileIcon(selectedFile?.type)
                    return <Icon className="w-10 h-10 text-dark-500" />
                  })()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-lg truncate">{selectedFile?.name}</p>
                <p className="text-sm text-dark-400 mt-1">
                  {(selectedFile?.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button onClick={cancelUpload} className="p-2 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Service Date Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Service Date (optional)
              </label>
              <input
                type="date"
                value={uploadServiceDate}
                onChange={(e) => setUploadServiceDate(e.target.value)}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <p className="text-xs text-dark-500 mt-2">
                The date on the receipt/invoice (today's date used for entry tracking)
              </p>
            </div>

            {/* AI Info */}
            <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-medium">AI-Powered Analysis</p>
                <p className="text-amber-300/70 text-sm mt-1">
                  After upload, AI will automatically detect the document type, extract amounts, weights, vendor info, and set a descriptive title.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={cancelUpload}
                className="flex-1 py-4 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
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

        {/* Recent Uploads */}
        {recentUploads.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Uploads</h2>
              <button
                onClick={() => router.push('/admin/documents')}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {recentUploads.map((doc) => {
                const Icon = getFileIcon(doc.file_type)
                return (
                  <div
                    key={doc.id}
                    onClick={() => router.push('/admin/documents')}
                    className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex items-center gap-4 hover:border-dark-600 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {doc.file_type?.startsWith('image/') && doc.id ? (
                        <img
                          src={`/api/documents/image/${doc.id}`}
                          alt=""
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <Icon className="w-6 h-6 text-dark-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{doc.title || doc.file_name}</p>
                      <p className="text-sm text-dark-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {doc.parse_status === 'parsed' && (
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    )}
                    {doc.parse_status === 'parsing' && (
                      <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
