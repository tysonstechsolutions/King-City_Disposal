-- ============================================
-- KING CITY DISPOSAL - INVOICE PARSING SCHEMA
-- ============================================
--
-- Run this in Supabase SQL Editor to create
-- the parsed_invoices table for OCR data.
--
-- ============================================

-- ============================================
-- PARSED INVOICES TABLE
-- ============================================
-- Stores extracted data from invoice images
-- Supports both vendor expenses and customer invoice records

CREATE TABLE IF NOT EXISTS parsed_invoices (
  id BIGSERIAL PRIMARY KEY,

  -- Link to uploaded document
  document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,

  -- Link to customer (auto-created or matched)
  customer_id BIGINT REFERENCES customers(id),

  -- Invoice Type
  invoice_type TEXT NOT NULL DEFAULT 'vendor_expense', -- 'vendor_expense' or 'customer_record'

  -- From (Sender) Info
  from_name TEXT,
  from_address TEXT,
  from_phone TEXT,
  from_email TEXT,

  -- To (Recipient) Info
  to_name TEXT,
  to_address TEXT,
  to_phone TEXT,
  to_email TEXT,

  -- Invoice Details
  invoice_number TEXT,
  invoice_date DATE,
  due_date TEXT,
  payment_terms TEXT,

  -- Line Items (JSON array)
  -- Format: [{"description": "...", "quantity": 1, "unit_price_cents": 100, "total_cents": 100}]
  line_items JSONB DEFAULT '[]',

  -- Amounts (stored in cents to avoid floating point issues)
  subtotal_cents INTEGER,
  tax_cents INTEGER DEFAULT 0,
  fees_cents INTEGER DEFAULT 0, -- credit card fees, late fees, etc.
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER,

  -- For Expense Tracking
  expense_category TEXT, -- 'landfill', 'fuel', 'parts', 'repairs', 'supplies', 'other'
  is_tax_deductible BOOLEAN DEFAULT TRUE,
  tax_year INTEGER, -- For filtering by tax year

  -- Review Status
  status TEXT DEFAULT 'pending_review', -- 'pending_review', 'confirmed', 'rejected'
  confidence_score FLOAT, -- AI confidence 0.0-1.0

  -- Raw extraction for debugging/reference
  raw_text TEXT,

  -- Timestamps
  parsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_document_id ON parsed_invoices(document_id);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_customer_id ON parsed_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_invoice_type ON parsed_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_status ON parsed_invoices(status);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_expense_category ON parsed_invoices(expense_category);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_invoice_date ON parsed_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_tax_year ON parsed_invoices(tax_year);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE parsed_invoices ENABLE ROW LEVEL SECURITY;

-- Allow all access (admin-only table)
CREATE POLICY "Allow all access to parsed_invoices"
ON parsed_invoices FOR ALL USING (true);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_parsed_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_parsed_invoices_updated_at ON parsed_invoices;
CREATE TRIGGER trigger_parsed_invoices_updated_at
  BEFORE UPDATE ON parsed_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_parsed_invoices_updated_at();

-- ============================================
-- ADD parse_status TO DOCUMENTS TABLE
-- ============================================
-- Track parsing status on the document itself
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS parse_status TEXT DEFAULT NULL; -- NULL, 'parsing', 'parsed', 'failed'

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS parsed_invoice_id BIGINT REFERENCES parsed_invoices(id);

-- ============================================
-- DONE!
-- ============================================
