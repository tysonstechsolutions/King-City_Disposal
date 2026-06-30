-- =============================================
-- ADD STRIPE "CARD ON FILE" SUPPORT
-- =============================================
-- Lets the office save a repeat customer's card with Stripe and charge it
-- with one click later (no re-entering the card, no customer present).
--
-- We only store Stripe's *reference IDs* and the last 4 digits for display —
-- the real card number lives in Stripe's vault, never in our database.
--
-- Run this in your Supabase SQL Editor (safe to run more than once).
-- =============================================

DO $$
BEGIN
  -- Stripe Customer ID (cus_xxx) — the vault that holds this customer's cards
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN stripe_customer_id TEXT;
    RAISE NOTICE 'Added stripe_customer_id column to customers';
  END IF;

  -- Default saved card's payment method ID (pm_xxx)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN stripe_payment_method_id TEXT;
    RAISE NOTICE 'Added stripe_payment_method_id column to customers';
  END IF;

  -- Display-only details for the saved card ("Visa •••• 4242, exp 12/27")
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'card_brand'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN card_brand TEXT;
    RAISE NOTICE 'Added card_brand column to customers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'card_last4'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN card_last4 TEXT;
    RAISE NOTICE 'Added card_last4 column to customers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'card_exp'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN card_exp TEXT;
    RAISE NOTICE 'Added card_exp column to customers';
  END IF;
END $$;

-- Fast lookup of our customer from a Stripe customer id (used by the webhook /
-- payment-confirmation path when saving a card after a successful payment).
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id
  ON public.customers(stripe_customer_id);
