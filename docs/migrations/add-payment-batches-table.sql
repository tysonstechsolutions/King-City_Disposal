-- Payment batches: pay multiple existing invoices with one link.
-- Run this in the Supabase SQL Editor.
--
-- A batch references existing invoices (by id) and does NOT duplicate amounts.
-- When the batch is paid (via Stripe webhook), each underlying invoice is marked paid.

CREATE TABLE IF NOT EXISTS payment_batches (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token             TEXT UNIQUE NOT NULL,
  customer_name     TEXT,
  customer_phone    TEXT,
  customer_email    TEXT,
  invoice_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents       INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | void
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at           TIMESTAMPTZ
);

-- Public pay page looks batches up by token
CREATE INDEX IF NOT EXISTS idx_payment_batches_token ON payment_batches(token);

-- Webhook idempotency check is by stripe_session_id
CREATE INDEX IF NOT EXISTS idx_payment_batches_session ON payment_batches(stripe_session_id);

-- ============================================
-- Row Level Security
-- ============================================
-- This table is ONLY accessed server-side via the API routes, which use the
-- service role key (SUPABASE_SERVICE_ROLE_KEY) — and the service role BYPASSES RLS.
-- So we enable RLS and add NO policies: the public anon key (shipped in the browser)
-- gets zero access, while the server routes keep full access.
--
-- The row holds the pay token + customer name/phone/email (PII), so it must NOT be
-- readable by the public anon key. Do not add an anon/authenticated policy here.
ALTER TABLE payment_batches ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_batches'
ORDER BY ordinal_position;
