-- Add invoice_id column to transactions table
-- Run this in Supabase SQL Editor to link transactions to invoices

-- Add the column (nullable)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS invoice_id BIGINT REFERENCES invoices(id);

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON transactions(invoice_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'invoice_id';
