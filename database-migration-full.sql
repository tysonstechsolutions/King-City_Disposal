-- ============================================
-- KING CITY DISPOSAL - FULL DATABASE SCHEMA
-- ============================================
-- 
-- Run this in Supabase SQL Editor
-- Adds: Customers, Invoices, Documents, Transactions
--
-- ============================================

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  
  -- Basic info
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  
  -- Address (default service address)
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'IL',
  zip TEXT,
  
  -- Business info (for contractors, property managers)
  company_name TEXT,
  is_business BOOLEAN DEFAULT FALSE,
  
  -- Payment preferences
  default_payment_method TEXT DEFAULT 'invoice', -- 'upfront', 'invoice', 'cash', 'check'
  payment_terms INTEGER DEFAULT 15, -- Net 15, Net 30, etc.
  
  -- Notes
  notes TEXT, -- "Gate code 1234", "Call before delivery", "Slow payer"
  internal_notes TEXT, -- Staff-only notes
  
  -- Flags
  is_vip BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE, -- Payment issues, etc.
  flag_reason TEXT,
  
  -- Stats (updated by triggers/app)
  total_jobs INTEGER DEFAULT 0,
  total_spent_cents BIGINT DEFAULT 0,
  outstanding_balance_cents BIGINT DEFAULT 0,
  last_job_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  
  -- Invoice number (INV-2025-0001)
  invoice_number TEXT UNIQUE NOT NULL,
  
  -- Links
  booking_id BIGINT REFERENCES bookings(id),
  customer_id BIGINT REFERENCES customers(id),
  
  -- Customer info (denormalized for invoice display)
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  
  -- Service details
  service_address TEXT,
  service_description TEXT,
  dumpster_size TEXT,
  rental_duration TEXT,
  delivery_date DATE,
  pickup_date DATE,
  
  -- Line items stored as JSON
  -- [{ "description": "20 Yard Dumpster - 7 Day", "amount_cents": 40000 }, ...]
  line_items JSONB DEFAULT '[]',
  
  -- Amounts
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER DEFAULT 0,
  balance_due_cents INTEGER GENERATED ALWAYS AS (total_cents - amount_paid_cents) STORED,
  
  -- Weight/overage details
  weight_lbs INTEGER,
  weight_included_lbs INTEGER,
  overage_lbs INTEGER,
  overage_rate_cents INTEGER, -- Per ton or per lb
  
  -- Dates
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void'
  
  -- Reminder tracking
  reminder_count INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  next_reminder_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT, -- Shows on invoice
  internal_notes TEXT, -- Staff only
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- INVOICE PAYMENTS TABLE
-- ============================================
-- Tracks individual payments against invoices (supports partial payments)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id BIGSERIAL PRIMARY KEY,
  
  invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
  transaction_id BIGINT REFERENCES transactions(id),
  
  amount_cents INTEGER NOT NULL,
  payment_method TEXT NOT NULL, -- 'card', 'cash', 'check', 'venmo', 'zelle', 'square', 'other'
  
  -- Check details
  check_number TEXT,
  
  -- Reference
  reference_number TEXT, -- Venmo ID, Zelle confirmation, etc.
  
  notes TEXT,
  
  received_by TEXT, -- Who recorded this payment
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  
  -- What this document is attached to
  booking_id BIGINT REFERENCES bookings(id),
  customer_id BIGINT REFERENCES customers(id),
  invoice_id BIGINT REFERENCES invoices(id),
  
  -- Or global (business documents)
  category TEXT, -- 'landfill_ticket', 'weight_ticket', 'fuel_receipt', 'insurance', 'license', 'contract', 'photo', 'other'
  
  -- File info
  file_name TEXT NOT NULL,
  file_type TEXT, -- 'image/jpeg', 'application/pdf', etc.
  file_size INTEGER,
  storage_path TEXT NOT NULL, -- Supabase storage path
  
  -- Metadata
  title TEXT,
  description TEXT,
  
  -- For weight tickets
  weight_lbs INTEGER,
  
  -- For receipts
  amount_cents INTEGER,
  vendor TEXT,
  
  -- Timestamps
  document_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by TEXT
);

-- ============================================
-- TRANSACTIONS TABLE (if not exists from previous migration)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  booking_id BIGINT REFERENCES bookings(id),
  invoice_id BIGINT REFERENCES invoices(id),
  customer_id BIGINT REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'booking', 'invoice', 'extension', 'overage', 'late_fee', 'custom'
  service_address TEXT,
  dumpster_size TEXT,
  rental_duration TEXT,
  delivery_date DATE,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- ADD CUSTOMER LINK TO BOOKINGS
-- ============================================
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS invoice_id BIGINT REFERENCES invoices(id),
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'upfront', -- 'upfront', 'invoice'
ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- SEQUENCES FOR INVOICE NUMBERS
-- ============================================
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate invoice number like INV-2025-0001
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  seq_num INTEGER;
  year_str TEXT;
BEGIN
  seq_num := nextval('invoice_number_seq');
  year_str := to_char(NOW(), 'YYYY');
  RETURN 'INV-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate receipt number like KCD-2025-0001
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  seq_num INTEGER;
  year_str TEXT;
BEGIN
  seq_num := nextval('receipt_number_seq');
  year_str := to_char(NOW(), 'YYYY');
  RETURN 'KCD-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_documents_booking_id ON documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all access to invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow all access to invoice_payments" ON invoice_payments FOR ALL USING (true);
CREATE POLICY "Allow all access to documents" ON documents FOR ALL USING (true);

-- ============================================
-- STORAGE BUCKET FOR DOCUMENTS
-- ============================================
-- Run this separately in Supabase Dashboard -> Storage -> New Bucket
-- Name: documents
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: image/*, application/pdf

-- ============================================
-- DONE!
-- ============================================
