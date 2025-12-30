-- ============================================
-- KING CITY DISPOSAL - TRANSACTIONS TABLE
-- ============================================
-- 
-- Run this in Supabase SQL Editor to add
-- transaction tracking for payments/receipts.
--
-- ============================================

-- Create transactions table for tracking all payments
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  
  -- Receipt info
  receipt_number TEXT UNIQUE NOT NULL,
  
  -- Link to booking (optional - custom invoices may not have one)
  booking_id BIGINT REFERENCES bookings(id),
  
  -- Customer info (denormalized for receipt display)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Payment details
  amount_cents INTEGER NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'booking', 'extension', 'overage', 'late_fee', 'custom'
  
  -- Service details (for receipt)
  service_address TEXT,
  dumpster_size TEXT,
  rental_duration TEXT,
  delivery_date DATE,
  
  -- Stripe info
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  payment_method TEXT, -- 'card', 'cash', 'check'
  
  -- Status
  status TEXT DEFAULT 'completed', -- 'completed', 'refunded', 'disputed'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- Create sequence for receipt numbers (starts at 1)
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- Function to generate receipt number like KCD-2025-0001
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

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_phone ON transactions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_number ON transactions(receipt_number);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for access
CREATE POLICY "Allow all access to transactions" ON transactions FOR ALL USING (true);

-- ============================================
-- DONE! Transactions table is ready.
-- ============================================
