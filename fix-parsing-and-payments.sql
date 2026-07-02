-- =====================================================================
-- FIX PARSING + STRIPE PAYMENT STATUS  (run once in Supabase SQL editor)
-- =====================================================================
-- Root causes found on 2026-07-02:
--
-- 1. documents was missing parse_status / parse_started_at / vendor /
--    description. PostgREST rejects an entire UPDATE when any column in
--    the body is unknown, so every parse status write-back failed and
--    documents never advanced to "Parsed".
--
-- 2. documents.parsed_invoice_id was created as UUID, but parsed_invoices.id
--    is BIGINT — the link could never be written (invalid input syntax).
--
-- 3. invoices was missing payment_method / stripe_payment_intent_id. The
--    Stripe webhook and the payment-confirm fallback both include those
--    columns when marking an invoice paid, so the whole update was rejected
--    and paid invoices kept showing "unpaid" on the website.
--
-- The app code has been made resilient to these columns being absent, but
-- running this migration restores full functionality (status tracking,
-- vendor display, Stripe payment references).
-- =====================================================================

-- 1. Documents: parse tracking + display columns
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS parse_status TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS parse_started_at TIMESTAMPTZ;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS vendor TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Documents: fix parsed_invoice_id type (UUID -> BIGINT).
--    Every existing value is NULL (the UUID type made writes impossible),
--    so the cast cannot lose data; the guard keeps this re-runnable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents'
      AND column_name = 'parsed_invoice_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.documents
      ALTER COLUMN parsed_invoice_id TYPE BIGINT USING (NULL::BIGINT);
  END IF;
END $$;

-- 3. Invoices: Stripe payment columns
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- 4. Safety: remove duplicate parsed_invoices rows (keep the latest per
--    document). Duplicates double-counted receipts in expense reports.
--    (A one-time cleanup already ran on 2026-07-02; this is a no-op unless
--    new duplicates appeared before the fixed code deployed.)
DELETE FROM public.parsed_invoices p
WHERE p.document_id IS NOT NULL
  AND p.id NOT IN (
    SELECT DISTINCT ON (document_id) id
    FROM public.parsed_invoices
    WHERE document_id IS NOT NULL
    ORDER BY document_id, parsed_at DESC NULLS LAST, id DESC
  );

-- 5. Backfill documents from their (now unique) parsed rows.
UPDATE public.documents d
SET parse_status      = COALESCE(d.parse_status, 'parsed'),
    parsed_invoice_id = p.id,
    vendor            = COALESCE(d.vendor, p.from_name),
    amount_cents      = COALESCE(d.amount_cents, p.total_cents),
    service_date      = COALESCE(d.service_date, p.invoice_date)
FROM public.parsed_invoices p
WHERE p.document_id = d.id;

-- 6. Verify (both should return counts, not errors)
SELECT count(*) AS documents_parsed FROM public.documents WHERE parse_status = 'parsed';
SELECT count(*) AS invoices_with_stripe_ref FROM public.invoices WHERE stripe_payment_intent_id IS NOT NULL;
