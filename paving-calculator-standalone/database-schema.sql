-- ============================================
-- PAVING QUOTES DATABASE SCHEMA
-- ============================================
--
-- Optional: Run this in Supabase SQL Editor if you want
-- to save quotes to a database for tracking/CRM purposes
--
-- ============================================

-- Create the paving_quotes table
CREATE TABLE IF NOT EXISTS paving_quotes (
  id SERIAL PRIMARY KEY,

  -- Service details
  service_type VARCHAR(50) NOT NULL,       -- sealcoating, paving, linestriping
  project_type VARCHAR(50),                 -- residential_driveway, commercial_parking, etc.

  -- Measurements
  square_footage INTEGER,                   -- For sealcoating/paving
  num_stalls INTEGER,                       -- For line striping
  num_handicap_symbols INTEGER,             -- For line striping
  linear_feet INTEGER,                      -- For line striping

  -- Location
  address TEXT NOT NULL,
  condition VARCHAR(50),                    -- good, fair, poor, unknown
  notes TEXT,

  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  preferred_contact VARCHAR(20) DEFAULT 'phone',  -- phone, text, email

  -- Estimate
  estimate_low INTEGER,                     -- Low end of range
  estimate_high INTEGER,                    -- High end of range
  final_price INTEGER,                      -- Actual quoted price (filled in by owner)

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',     -- pending, contacted, quoted, won, lost
  contacted_at TIMESTAMP,
  quoted_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX idx_paving_quotes_status ON paving_quotes(status);
CREATE INDEX idx_paving_quotes_created ON paving_quotes(created_at DESC);
CREATE INDEX idx_paving_quotes_service ON paving_quotes(service_type);

-- Enable Row Level Security (recommended for Supabase)
ALTER TABLE paving_quotes ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anonymous users (for the public form)
CREATE POLICY "Allow public inserts" ON paving_quotes
  FOR INSERT
  WITH CHECK (true);

-- Only allow reading with authenticated access (for admin dashboard)
CREATE POLICY "Allow authenticated reads" ON paving_quotes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- OPTIONAL: Create a view for quick stats
-- ============================================
CREATE OR REPLACE VIEW paving_quotes_stats AS
SELECT
  service_type,
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'won' THEN 1 END) as won,
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
  AVG(square_footage) as avg_sqft,
  AVG(estimate_high) as avg_estimate
FROM paving_quotes
GROUP BY service_type;

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================
-- Uncomment to insert test data:
/*
INSERT INTO paving_quotes (service_type, project_type, square_footage, address, condition, customer_name, customer_phone, estimate_low, estimate_high, status)
VALUES
  ('sealcoating', 'residential_driveway', 800, '123 Main St, Mount Vernon, IL', 'fair', 'John Smith', '(618) 555-1234', 128, 192, 'pending'),
  ('paving', 'commercial_parking', 5000, '456 Business Blvd, Fairfield, IL', 'poor', 'ABC Company', '(618) 555-5678', 17000, 26500, 'contacted');
*/
