'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, FileSpreadsheet, Check, X, ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';

export default function ImportInvoicesPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('adminToken')) {
      window.location.href = '/admin';
      return;
    }
  }, []);
  // Step: 'upload' | 'review' | 'complete'
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Parsed invoices from Excel
  const [parsedInvoices, setParsedInvoices] = useState([]);
  const [skippedSheets, setSkippedSheets] = useState([]);

  // Current invoice being reviewed
  const [currentIndex, setCurrentIndex] = useState(0);

  // Edited invoices (user modifications)
  const [editedInvoices, setEditedInvoices] = useState([]);

  // Import results
  const [importResults, setImportResults] = useState(null);

  // Format currency
  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format((cents || 0) / 100);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  // Parse the Excel file
  const handleParse = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/invoices/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse file');
      }

      if (data.invoices.length === 0) {
        setError('No valid invoices found in the file');
        return;
      }

      setParsedInvoices(data.invoices);
      setSkippedSheets(data.skipped_sheets || []);
      setEditedInvoices(data.invoices.map(inv => ({ ...inv })));
      setCurrentIndex(0);
      setStep('review');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update current invoice
  const updateCurrentInvoice = (field, value) => {
    setEditedInvoices(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        [field]: value,
      };
      return updated;
    });
  };

  // Navigate to previous invoice
  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Navigate to next invoice
  const goNext = () => {
    if (currentIndex < editedInvoices.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Import all reviewed invoices
  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/invoices/import-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: editedInvoices }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import invoices');
      }

      setImportResults(data);
      setStep('complete');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Current invoice being edited
  const currentInvoice = editedInvoices[currentIndex] || {};

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="border-b border-dark-700 bg-dark-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/invoices" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold">Import Invoices</h1>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-4 mt-4">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-primary-500' : step !== 'upload' ? 'bg-green-600' : 'bg-dark-600'}`}>
                {step !== 'upload' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span>Upload</span>
            </div>
            <div className="flex-1 h-px bg-dark-600" />
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary-400' : step === 'complete' ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-primary-500' : step === 'complete' ? 'bg-green-600' : 'bg-dark-600'}`}>
                {step === 'complete' ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span>Review</span>
            </div>
            <div className="flex-1 h-px bg-dark-600" />
            <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-green-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'complete' ? 'bg-green-600' : 'bg-dark-600'}`}>
                {step === 'complete' ? <Check className="w-4 h-4" /> : '3'}
              </div>
              <span>Complete</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-8">
              <div className="text-center mb-6">
                <FileSpreadsheet className="w-16 h-16 mx-auto text-primary-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Upload Excel File</h2>
                <p className="text-gray-400">
                  Select an Excel file (.xlsx or .xls) containing your invoices. Each sheet will be parsed as a separate invoice.
                </p>
              </div>

              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-dark-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
                  onClick={() => document.getElementById('file-input').click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-green-400" />
                      <span className="text-white">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                      <p className="text-gray-400">Click to select a file</p>
                    </>
                  )}
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  onClick={handleParse}
                  disabled={!file || loading}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 disabled:text-gray-500 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Parsing...' : 'Parse Invoices'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div>
            {/* Navigation bar */}
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Invoice</span>
                    <select
                      value={currentIndex}
                      onChange={(e) => setCurrentIndex(Number(e.target.value))}
                      className="bg-dark-700 border border-dark-600 rounded px-3 py-1 text-white"
                    >
                      {editedInvoices.map((inv, idx) => (
                        <option key={idx} value={idx}>
                          {idx + 1} - {inv.invoice_number || `Invoice ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400">of {editedInvoices.length}</span>
                  </div>

                  <button
                    onClick={goNext}
                    disabled={currentIndex === editedInvoices.length - 1}
                    className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Importing...' : `Import All (${editedInvoices.length})`}
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex gap-1">
                  {editedInvoices.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`flex-1 h-2 rounded cursor-pointer transition-colors ${
                        idx === currentIndex
                          ? 'bg-primary-500'
                          : idx < currentIndex
                          ? 'bg-green-600'
                          : 'bg-dark-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Invoice editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column - Invoice details */}
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Invoice Number</label>
                      <input
                        type="text"
                        value={currentInvoice.invoice_number || ''}
                        onChange={(e) => updateCurrentInvoice('invoice_number', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Invoice Date</label>
                      <input
                        type="date"
                        value={currentInvoice.invoice_date || ''}
                        onChange={(e) => updateCurrentInvoice('invoice_date', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={currentInvoice.due_date || ''}
                        onChange={(e) => updateCurrentInvoice('due_date', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Dumpster Size</label>
                      <input
                        type="text"
                        value={currentInvoice.dumpster_size || ''}
                        onChange={(e) => updateCurrentInvoice('dumpster_size', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                        placeholder="e.g., 20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Service Description</label>
                    <input
                      type="text"
                      value={currentInvoice.service_description || ''}
                      onChange={(e) => updateCurrentInvoice('service_description', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Notes</label>
                    <textarea
                      value={currentInvoice.notes || ''}
                      onChange={(e) => updateCurrentInvoice('notes', e.target.value)}
                      rows={2}
                      className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                    />
                  </div>

                  {/* Totals */}
                  <div className="border-t border-dark-600 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Subtotal</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(currentInvoice.subtotal_cents || 0) / 100}
                          onChange={(e) => updateCurrentInvoice('subtotal_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                          className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Tax</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(currentInvoice.tax_cents || 0) / 100}
                          onChange={(e) => updateCurrentInvoice('tax_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                          className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm text-gray-400 mb-1">Total</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(currentInvoice.total_cents || 0) / 100}
                        onChange={(e) => updateCurrentInvoice('total_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                        className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white text-xl font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column - Customer & Payment */}
              <div className="space-y-6">
                {/* Customer info */}
                <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
                  <h3 className="text-lg font-semibold mb-4">Customer Information</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Customer Name</label>
                      <input
                        type="text"
                        value={currentInvoice.customer_name || ''}
                        onChange={(e) => updateCurrentInvoice('customer_name', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Phone</label>
                        <input
                          type="text"
                          value={currentInvoice.customer_phone || ''}
                          onChange={(e) => updateCurrentInvoice('customer_phone', e.target.value)}
                          className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input
                          type="text"
                          value={currentInvoice.customer_email || ''}
                          onChange={(e) => updateCurrentInvoice('customer_email', e.target.value)}
                          placeholder="Separate multiple with commas"
                          className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Address</label>
                      <input
                        type="text"
                        value={currentInvoice.customer_address || ''}
                        onChange={(e) => updateCurrentInvoice('customer_address', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Service Address</label>
                      <input
                        type="text"
                        value={currentInvoice.service_address || ''}
                        onChange={(e) => updateCurrentInvoice('service_address', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment status */}
                <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Status</h3>

                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentInvoice.is_paid || false}
                        onChange={(e) => updateCurrentInvoice('is_paid', e.target.checked)}
                        className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-green-500 focus:ring-green-500"
                      />
                      <span className="text-lg">
                        {currentInvoice.is_paid ? (
                          <span className="text-green-400 font-medium">Paid</span>
                        ) : (
                          <span className="text-yellow-400 font-medium">Unpaid</span>
                        )}
                      </span>
                      {currentInvoice.is_paid && (
                        <span className="text-sm text-gray-400">(auto-detected from Excel)</span>
                      )}
                    </label>

                    {currentInvoice.is_paid && (
                      <div className="space-y-4 pl-8 border-l-2 border-green-600">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Date Paid</label>
                            <input
                              type="date"
                              value={currentInvoice.date_paid || ''}
                              onChange={(e) => updateCurrentInvoice('date_paid', e.target.value)}
                              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Payment Method</label>
                            <select
                              value={currentInvoice.payment_method || ''}
                              onChange={(e) => updateCurrentInvoice('payment_method', e.target.value)}
                              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                            >
                              <option value="">Select...</option>
                              <option value="check">Check</option>
                              <option value="ach">ACH Transfer</option>
                              <option value="card">Credit/Debit Card</option>
                              <option value="paypal">PayPal</option>
                              <option value="venmo">Venmo</option>
                              <option value="zelle">Zelle</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                        {(currentInvoice.payment_method === 'check' || currentInvoice.check_number) && (
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Check Number</label>
                            <input
                              type="text"
                              value={currentInvoice.check_number || ''}
                              onChange={(e) => updateCurrentInvoice('check_number', e.target.value)}
                              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-white"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Line items preview */}
                {currentInvoice.line_items && currentInvoice.line_items.length > 0 && (
                  <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
                    <h3 className="text-lg font-semibold mb-4">Line Items</h3>
                    <div className="space-y-2">
                      {currentInvoice.line_items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-dark-700 rounded px-3 py-2">
                          <span className="text-gray-300">{item.description}</span>
                          <span className="text-white font-medium">{formatCurrency(item.amount_cents)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && importResults && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-8 text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Import Complete!</h2>
              <p className="text-gray-400 mb-6">{importResults.message}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-dark-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{importResults.imported}</div>
                  <div className="text-sm text-gray-400">Imported</div>
                </div>
                <div className="bg-dark-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400">{importResults.duplicates}</div>
                  <div className="text-sm text-gray-400">Duplicates</div>
                </div>
                <div className="bg-dark-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">{importResults.customers_created}</div>
                  <div className="text-sm text-gray-400">New Customers</div>
                </div>
                <div className="bg-dark-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">{importResults.customers_matched}</div>
                  <div className="text-sm text-gray-400">Matched</div>
                </div>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 text-left">
                  <h3 className="text-red-400 font-medium mb-2">Errors ({importResults.errors.length})</h3>
                  <div className="max-h-40 overflow-y-auto text-sm">
                    {importResults.errors.map((err, idx) => (
                      <div key={idx} className="text-gray-300">
                        {err.invoice}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Link
                  href="/admin/invoices"
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium"
                >
                  View Invoices
                </Link>
                <button
                  onClick={() => {
                    setStep('upload');
                    setFile(null);
                    setParsedInvoices([]);
                    setEditedInvoices([]);
                    setImportResults(null);
                  }}
                  className="px-6 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium"
                >
                  Import More
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Skipped sheets info */}
        {step === 'review' && skippedSheets.length > 0 && (
          <div className="mt-6 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <h3 className="text-yellow-400 font-medium mb-2">
              Skipped Sheets ({skippedSheets.length})
            </h3>
            <div className="text-sm text-gray-300">
              {skippedSheets.map((s, idx) => (
                <div key={idx}>{s.sheet}: {s.reason}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
