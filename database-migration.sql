-- ============================================
-- KING CITY DISPOSAL - DATABASE MIGRATION
-- ============================================
-- 
-- Run this in Supabase SQL Editor to add
-- columns needed for all features.
--
-- ============================================

-- Add all new columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS delivery_reminder_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pickup_reminder_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_request_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pickup_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pickup_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website',
ADD COLUMN IF NOT EXISTS photos TEXT[],
ADD COLUMN IF NOT EXISTS actual_weight_lbs INTEGER,
ADD COLUMN IF NOT EXISTS weight_recorded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pending_overage_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pending_overage_link TEXT,
ADD COLUMN IF NOT EXISTS overage_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS late_fee_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_late_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS extension_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extension_paid_at TIMESTAMP WITH TIME ZONE;

-- Create missed_calls table for tracking
CREATE TABLE IF NOT EXISTS missed_calls (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  call_status TEXT,
  texted_back BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sms_conversations table for tracking SMS threads
CREATE TABLE IF NOT EXISTS sms_conversations (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL,
  message TEXT NOT NULL,
  booking_id BIGINT REFERENCES bookings(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_links table for tracking Stripe links
CREATE TABLE IF NOT EXISTS payment_links (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id),
  stripe_link_id TEXT,
  stripe_link_url TEXT,
  amount_cents INTEGER,
  type TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_date ON bookings(delivery_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_missed_calls_phone ON missed_calls(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone ON sms_conversations(phone_number);

-- Enable Row Level Security
ALTER TABLE missed_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Allow all access to missed_calls" ON missed_calls FOR ALL USING (true);
CREATE POLICY "Allow all access to sms_conversations" ON sms_conversations FOR ALL USING (true);
CREATE POLICY "Allow all access to payment_links" ON payment_links FOR ALL USING (true);

-- ============================================
-- DONE! Your database is ready.
-- ============================================
