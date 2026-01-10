'use client'

import { useState, useEffect } from 'react'
import { config } from '../../../config'
import AdminNav from '../../../components/AdminNav'
import { EXPENSE_CATEGORIES, formatCurrency, formatDate, getExpenseCategory } from '../../../lib/constants'
import {
  Receipt,
  Download,
  Filter,
  Calendar,
  Truck,
  Fuel,
  DollarSign,
  TrendingUp,
  FileText,
  Loader2,
  ChevronDown,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Image,
  User,
  Upload,
  FileSpreadsheet,
  X,
  AlertCircle
} from 'lucide-react'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Excel Import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  // Filters
  const [taxYear, setTaxYear] = useState(new Date().getFullYear())
  const [category, setCategory] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('adminAuth') !== 'true') {
      window.location.href = '/admin'
      return
    }
    fetchExpenses()
  }, [taxYear, category, startDate, endDate])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      let query = `summary=true&tax_year=${taxYear}`
      if (category && category !== 'all') {
        query += `&category=${category}`
      }
      if (startDate) {
        query += `&start_date=${startDate}`
      }
      if (endDate) {
        query += `&end_date=${endDate}`
      }

      const response = await fetch(`/api/expenses?${query}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
        setSummary(data.summary || null)
      }
    } catch (err) {
      console.error('Error fetching expenses:', err)
    }
    setLoading(false)
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_year: taxYear,
          format: 'csv',
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `expenses-${taxYear}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Export error:', err)
    }
    setExporting(false)
  }

  // Import Excel file with multiple sheets
  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/expenses/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setImportResult({
          success: true,
          ...result,
        })
        // Refresh expenses list
        fetchExpenses()
      } else {
        setImportResult({
          success: false,
          error: result.error || 'Import failed',
        })
      }
    } catch (err) {
      console.error('Import error:', err)
      setImportResult({
        success: false,
        error: err.message,
      })
    }

    setImporting(false)
    // Reset file input
    e.target.value = ''
  }

  // Generate year options (current year and past 5 years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminNav />

      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Business Expenses</h1>
                <p className="text-sm text-neutral-500">Tax Year {taxYear} - For Tax Filing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={taxYear}
                onChange={(e) => setTaxYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Import Excel</span>
              </button>
              <button
                onClick={exportCSV}
                disabled={exporting || expenses.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Total Expenses
              </div>
              <p className="text-2xl font-bold text-neutral-900">
                {formatCurrency(summary.grand_total_cents)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
                <FileText className="w-4 h-4" />
                Invoices
              </div>
              <p className="text-2xl font-bold text-neutral-900">
                {summary.total_expenses}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
                <Truck className="w-4 h-4" />
                Landfill Fees
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.by_category?.landfill?.total_cents || 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-2 text-neutral-500 text-sm mb-1">
                <Fuel className="w-4 h-4" />
                Fuel
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(summary.by_category?.fuel?.total_cents || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {summary && summary.by_category && Object.keys(summary.by_category).length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
            <h2 className="font-semibold text-neutral-900 mb-4">Expense Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(summary.by_category).map(([catId, data]) => {
                const catInfo = getExpenseCategory(catId)
                const Icon = catInfo.icon
                const percentage = summary.grand_total_cents > 0
                  ? (data.total_cents / summary.grand_total_cents) * 100
                  : 0

                return (
                  <div key={catId} className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-${catInfo.color}-100`}>
                      <Icon className={`w-4 h-4 text-${catInfo.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{catInfo.label}</span>
                        <span className="text-sm text-neutral-500">{data.count} invoices</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${catInfo.color}-500 rounded-full`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-24 text-right">
                          {formatCurrency(data.total_cents)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {EXPENSE_CATEGORIES.slice(0, 5).map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setCategory('all')
                  setStartDate('')
                  setEndDate('')
                }}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">No confirmed expenses for {taxYear}</p>
              <p className="text-sm text-neutral-400 mt-1">
                Upload invoices in Documents and confirm them to track expenses
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-500">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-500">Vendor</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-500">Invoice #</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-500">Category</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-neutral-500">Amount</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-neutral-500">Customer</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-neutral-500">Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {expenses.map((expense) => {
                    const catInfo = getExpenseCategory(expense.expense_category)
                    const Icon = catInfo.icon
                    return (
                      <tr key={expense.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {formatDate(expense.invoice_date)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-neutral-900">{expense.from_name || '-'}</p>
                          {expense.from_address && (
                            <p className="text-xs text-neutral-500 truncate max-w-xs">{expense.from_address}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {expense.invoice_number || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-${catInfo.color}-100 text-${catInfo.color}-700`}>
                            <Icon className="w-3 h-3" />
                            {catInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-neutral-900">
                            {formatCurrency(expense.total_cents)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {expense.customer_id ? (
                            <a
                              href={`/admin/customers/${expense.customer_id}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              title="View customer"
                            >
                              <User className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-neutral-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {expense.document_id ? (
                            <a
                              href={`/api/documents/image/${expense.document_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800"
                              title="View document"
                            >
                              <Image className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-neutral-300">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-neutral-50 border-t border-neutral-200">
                  <tr>
                    <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-neutral-900">
                      Total ({expenses.length} expenses)
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-neutral-900">
                      {formatCurrency(summary?.grand_total_cents || 0)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Tax Note */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="font-semibold text-amber-900 mb-2">Tax Deduction Note</h3>
          <p className="text-sm text-amber-800">
            These expenses have been categorized as business expenses. Export the CSV file and provide it to your accountant for tax filing.
            Make sure all expenses are confirmed before exporting.
          </p>
        </div>
      </main>

      {/* Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900">Import Excel File</h2>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportResult(null)
                }}
                className="p-2 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!importResult ? (
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h3 className="font-medium text-purple-900 mb-2">Multi-Sheet Invoice Import</h3>
                    <p className="text-sm text-purple-800">
                      Upload an Excel file (.xlsx) with multiple sheets. Each sheet should contain one invoice.
                      The system will parse vendor name, date, amounts, and categorize expenses automatically.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelImport}
                      className="hidden"
                      id="excel-import"
                      disabled={importing}
                    />
                    <label
                      htmlFor="excel-import"
                      className={`cursor-pointer block ${importing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-spin" />
                          <p className="text-neutral-700 font-medium">Processing sheets...</p>
                          <p className="text-sm text-neutral-500">This may take a moment</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                          <p className="text-neutral-700 font-medium">Click to upload Excel file</p>
                          <p className="text-sm text-neutral-500">.xlsx or .xls files supported</p>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="text-sm text-neutral-500">
                    <p className="font-medium mb-1">Tips for best results:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Each sheet should have invoice number, date, vendor, and total</li>
                      <li>Common labels like "Invoice", "Date", "Total" are auto-detected</li>
                      <li>Imported invoices appear as "Pending" for review</li>
                      <li>You can review and confirm each one in Documents</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {importResult.success ? (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-green-900">Import Complete</h3>
                          <p className="text-sm text-green-800">
                            Successfully imported {importResult.imported} of {importResult.total_sheets} sheets
                          </p>
                        </div>
                      </div>

                      {importResult.invoices && importResult.invoices.length > 0 && (
                        <div className="border border-neutral-200 rounded-xl overflow-hidden">
                          <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                            <p className="font-medium text-sm text-neutral-700">Imported Invoices</p>
                          </div>
                          <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100">
                            {importResult.invoices.slice(0, 10).map((inv, idx) => (
                              <div key={idx} className="px-3 py-2 text-sm flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-neutral-900">{inv.vendor || 'Unknown'}</p>
                                  <p className="text-xs text-neutral-500">{inv.date || 'No date'} - {inv.category}</p>
                                </div>
                                <span className="font-semibold text-neutral-900">${inv.total?.toFixed(2)}</span>
                              </div>
                            ))}
                            {importResult.invoices.length > 10 && (
                              <p className="px-3 py-2 text-sm text-neutral-500">
                                And {importResult.invoices.length - 10} more...
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {importResult.skipped > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-sm text-amber-800">
                            <strong>{importResult.skipped}</strong> sheets were skipped (empty or couldn't parse)
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-900">Import Failed</h3>
                        <p className="text-sm text-red-800">{importResult.error}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowImportModal(false)
                      setImportResult(null)
                    }}
                    className="w-full py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
