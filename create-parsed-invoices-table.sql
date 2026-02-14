-- =============================================
-- CREATE PARSED_INVOICES TABLE
-- =============================================
-- This table stores AI-parsed vendor expenses and customer invoice records
-- from uploaded documents (receipts, bills, invoices).

CREATE TABLE IF NOT EXISTS public.parsed_invoices (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES public.documents(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,

  -- Type: vendor_expense or customer_record
  invoice_type TEXT NOT NULL DEFAULT 'vendor_expense',

  -- Sender info
  from_name TEXT,
  from_address TEXT,
  from_phone TEXT,
  from_email TEXT,

  -- Recipient info
  to_name TEXT,
  to_address TEXT,
  to_phone TEXT,
  to_email TEXT,

  -- Invoice details
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  payment_terms TEXT,

  -- Line items (stored as JSON string)
  line_items JSONB DEFAULT '[]',

  -- Financial data (all in cents)
  subtotal_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  fees_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER DEFAULT 0,

  -- Categorization
  expense_category TEXT DEFAULT 'other',
  is_tax_deductible BOOLEAN DEFAULT true,
  tax_year INTEGER,

  -- Workflow status: pending, pending_review, confirmed, rejected
  status TEXT NOT NULL DEFAULT 'pending_review',
  confidence_score NUMERIC(3,2) DEFAULT 0.80,
  confirmed_at TIMESTAMPTZ,
  parsed_at TIMESTAMPTZ DEFAULT now(),

  -- Notes / raw text
  raw_text TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_document_id ON public.parsed_invoices(document_id);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_customer_id ON public.parsed_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_invoice_type ON public.parsed_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_status ON public.parsed_invoices(status);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_tax_year ON public.parsed_invoices(tax_year);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_expense_category ON public.parsed_invoices(expense_category);
CREATE INDEX IF NOT EXISTS idx_parsed_invoices_invoice_date ON public.parsed_invoices(invoice_date);

-- =============================================
-- ENABLE RLS + POLICIES
-- =============================================
ALTER TABLE public.parsed_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on parsed invoices"
  ON public.parsed_invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Block anon from parsed invoices"
  ON public.parsed_invoices
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
