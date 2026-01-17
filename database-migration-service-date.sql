-- ============================================
-- ADD SERVICE_DATE TO DOCUMENTS TABLE
-- ============================================
-- Run this migration to add service_date column
-- This captures when the service actually occurred (date on receipt)
-- The existing created_at column tracks when it was entered into the system

-- Add service_date column (the date on the actual receipt/document)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS service_date DATE;

-- Add comment for clarity
COMMENT ON COLUMN documents.service_date IS 'Date the service occurred (from the receipt/document)';
COMMENT ON COLUMN documents.created_at IS 'Date/time the document was uploaded to the system';
