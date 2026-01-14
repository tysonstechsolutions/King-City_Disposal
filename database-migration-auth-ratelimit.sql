-- ============================================
-- ADMIN SESSIONS & RATE LIMITING TABLES
-- ============================================
-- Run this in Supabase SQL Editor to enable
-- persistent session storage and rate limiting
-- ============================================

-- Admin Sessions table for persistent authentication
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Auto-cleanup expired sessions (optional - can also use cron)
-- This creates a function to clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Rate Limiting table for cross-instance persistence
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  first_request TIMESTAMPTZ NOT NULL,
  window_ms INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for fast expiration cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);

-- Auto-cleanup expired rate limit records
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) - only service role can access
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access these tables
CREATE POLICY "Service role only" ON admin_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- OPTIONAL: Schedule automatic cleanup
-- ============================================
-- If you have pg_cron extension enabled, uncomment these:
--
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions()');
-- SELECT cron.schedule('cleanup-ratelimits', '*/5 * * * *', 'SELECT cleanup_expired_rate_limits()');

-- ============================================
-- NOTES FOR DEPLOYMENT:
-- ============================================
-- 1. Run this migration in Supabase SQL Editor
-- 2. For bcrypt password hashing, generate a hash:
--    - In Node.js: require('bcryptjs').hashSync('your-password', 12)
--    - Set ADMIN_PASSWORD_HASH in your environment variables
-- 3. The existing ADMIN_PASSWORD will still work as fallback
