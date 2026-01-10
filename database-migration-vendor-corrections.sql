-- ============================================
-- VENDOR CORRECTIONS TABLE
-- AI Learning System for Invoice Parsing
-- ============================================
-- Run this in Supabase SQL Editor

-- Create vendor_corrections table
CREATE TABLE IF NOT EXISTS vendor_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  corrected_name TEXT,
  corrected_phone TEXT,
  corrected_address TEXT,
  default_category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vendor name lookups
CREATE INDEX IF NOT EXISTS idx_vendor_corrections_name
ON vendor_corrections USING gin (to_tsvector('english', vendor_name));

-- Create unique index on vendor_name (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_corrections_unique_name
ON vendor_corrections (LOWER(vendor_name));

-- Enable RLS
ALTER TABLE vendor_corrections ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations (admin only via service role key)
CREATE POLICY "Service role can manage vendor corrections"
ON vendor_corrections
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendor_corrections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_vendor_corrections_updated_at ON vendor_corrections;
CREATE TRIGGER trigger_vendor_corrections_updated_at
BEFORE UPDATE ON vendor_corrections
FOR EACH ROW
EXECUTE FUNCTION update_vendor_corrections_updated_at();

-- Grant permissions
GRANT ALL ON vendor_corrections TO authenticated;
GRANT ALL ON vendor_corrections TO service_role;
