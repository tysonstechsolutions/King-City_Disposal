-- ============================================
-- Add UTM and referrer attribution columns to bookings
-- ============================================
-- These columns let the admin attribute revenue to specific ad campaigns,
-- referrers, and landing pages. The /api/book route saves them
-- automatically when present; without these columns it silently no-ops.
--
-- Run this in Supabase SQL editor when ready to start capturing attribution.
-- ============================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS utm_source     text,
  ADD COLUMN IF NOT EXISTS utm_medium     text,
  ADD COLUMN IF NOT EXISTS utm_campaign   text,
  ADD COLUMN IF NOT EXISTS utm_term       text,
  ADD COLUMN IF NOT EXISTS utm_content    text,
  ADD COLUMN IF NOT EXISTS gclid          text,
  ADD COLUMN IF NOT EXISTS fbclid         text,
  ADD COLUMN IF NOT EXISTS referrer       text,
  ADD COLUMN IF NOT EXISTS landing_page   text;

-- Index for reporting queries: "which campaign drove the most revenue this month?"
CREATE INDEX IF NOT EXISTS idx_bookings_utm_campaign ON bookings (utm_campaign)
  WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_utm_source   ON bookings (utm_source)
  WHERE utm_source IS NOT NULL;
