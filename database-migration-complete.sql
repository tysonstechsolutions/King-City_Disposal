-- ============================================
-- KING CITY DISPOSAL - COMPLETE DATABASE SETUP
-- ============================================
--
-- Run this FIRST in Supabase SQL Editor.
-- Creates all tables in the correct order.
--
-- ============================================

-- ============================================
-- BOOKINGS TABLE (must be created first)
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,

  -- Customer info
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,

  -- Service address
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'IL',
  zip TEXT NOT NULL,

  -- Service details
  dumpster_size TEXT NOT NULL, -- '10', '15', '20', '30', '40'
  rental_duration TEXT NOT NULL, -- '3', '7', '14', '30'
  delivery_date DATE NOT NULL,
  pickup_date DATE,

  -- Waste type and special handling
  waste_type TEXT DEFAULT 'general', -- 'general', 'construction', 'roofing', 'concrete', 'yard'
  special_instructions TEXT,

  -- Pricing
  base_price_cents INTEGER NOT NULL,
  delivery_fee_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Payment
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'partial', 'refunded'
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  payment_method TEXT, -- 'card', 'cash', 'check', 'invoice'

  -- Job status
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'delivered', 'in_service', 'picked_up', 'completed', 'cancelled'

  -- Linked records (added later via ALTER)
  -- customer_id, invoice_id

  -- Internal notes
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

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
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  booking_id BIGINT REFERENCES bookings(id),
  -- invoice_id added later
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
-- MISSED CALLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS missed_calls (
  id BIGSERIAL PRIMARY KEY,

  from_number TEXT NOT NULL,
  to_number TEXT,
  call_sid TEXT UNIQUE,

  -- Linked customer if found
  customer_id BIGINT REFERENCES customers(id),
  customer_name TEXT,

  -- Status
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'booked', 'no_answer', 'not_interested'

  notes TEXT,
  followed_up_by TEXT,
  followed_up_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SMS CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sms_conversations (
  id BIGSERIAL PRIMARY KEY,

  phone_number TEXT NOT NULL,
  customer_id BIGINT REFERENCES customers(id),
  customer_name TEXT,

  -- Last message preview
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_direction TEXT, -- 'inbound', 'outbound'

  -- Status
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENT LINKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_links (
  id BIGSERIAL PRIMARY KEY,

  -- Unique link code
  link_code TEXT UNIQUE NOT NULL,

  -- What this is for
  invoice_id BIGINT REFERENCES invoices(id),
  booking_id BIGINT REFERENCES bookings(id),

  -- Custom payment (not tied to invoice/booking)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  description TEXT,

  -- Amount
  amount_cents INTEGER NOT NULL,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'paid', 'expired', 'cancelled'

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Payment tracking
  stripe_session_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- ADD FOREIGN KEY COLUMNS TO BOOKINGS
-- ============================================
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS invoice_id BIGINT REFERENCES invoices(id),
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'upfront', -- 'upfront', 'invoice'
ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMP WITH TIME ZONE;

-- Add invoice_id to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS invoice_id BIGINT REFERENCES invoices(id);

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
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_date ON bookings(delivery_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);

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
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON transactions(booking_id);

CREATE INDEX IF NOT EXISTS idx_missed_calls_from_number ON missed_calls(from_number);
CREATE INDEX IF NOT EXISTS idx_missed_calls_status ON missed_calls(status);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone ON sms_conversations(phone_number);

CREATE INDEX IF NOT EXISTS idx_payment_links_link_code ON payment_links(link_code);
CREATE INDEX IF NOT EXISTS idx_payment_links_invoice_id ON payment_links(invoice_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Allow all access (admin app - adjust for production)
CREATE POLICY "Allow all access to bookings" ON bookings FOR ALL USING (true);
CREATE POLICY "Allow all access to customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all access to invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow all access to invoice_payments" ON invoice_payments FOR ALL USING (true);
CREATE POLICY "Allow all access to documents" ON documents FOR ALL USING (true);
CREATE POLICY "Allow all access to transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all access to missed_calls" ON missed_calls FOR ALL USING (true);
CREATE POLICY "Allow all access to sms_conversations" ON sms_conversations FOR ALL USING (true);
CREATE POLICY "Allow all access to payment_links" ON payment_links FOR ALL USING (true);

-- ============================================
-- DONE!
-- ============================================
-- After running this, run database-migration-storage.sql
-- to create the documents storage bucket.
-- ============================================
