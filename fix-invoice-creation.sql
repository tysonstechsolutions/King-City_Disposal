-- =============================================
-- FIX INVOICE CREATION ISSUES
-- =============================================
-- This script creates the missing generate_invoice_number function
-- and ensures proper RLS policies for invoice creation.
--
-- Run this in your Supabase SQL Editor to fix invoice creation failures.
-- =============================================

-- =============================================
-- 1. CREATE INVOICE NUMBER GENERATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix TEXT;
  sequence_num INTEGER;
  new_invoice_number TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Get current year (e.g., "2026")
  year_prefix := TO_CHAR(NOW(), 'YYYY');

  -- Loop to find next available invoice number
  LOOP
    attempt := attempt + 1;

    -- Get the highest sequence number for this year
    SELECT COALESCE(
      MAX(
        CAST(
          SUBSTRING(invoice_number FROM 'INV-[0-9]{4}-([0-9]+)')
          AS INTEGER
        )
      ), 0
    ) + 1
    INTO sequence_num
    FROM public.invoices
    WHERE invoice_number ~ ('^INV-' || year_prefix || '-[0-9]+$');

    -- Format as INV-YYYY-NNNN (e.g., INV-2026-0001)
    new_invoice_number := 'INV-' || year_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');

    -- Check if this number already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices WHERE invoice_number = new_invoice_number
    ) THEN
      RETURN new_invoice_number;
    END IF;

    -- Prevent infinite loop
    IF attempt >= max_attempts THEN
      -- Fallback to random number if we can't find a sequential one
      new_invoice_number := 'INV-' || year_prefix || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      RETURN new_invoice_number;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.generate_invoice_number() IS
  'Generates unique invoice numbers in format INV-YYYY-NNNN with auto-incrementing sequence per year';


-- =============================================
-- 2. VERIFY INVOICES TABLE EXISTS
-- =============================================
-- Check if invoices table needs invoice_number to be unique
DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_invoice_number_unique'
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique
    UNIQUE (invoice_number);

    RAISE NOTICE 'Added unique constraint to invoices.invoice_number';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on invoices.invoice_number';
  END IF;
END $$;


-- =============================================
-- 3. VERIFY RLS POLICIES
-- =============================================
-- Ensure service_role can create invoices
DO $$
BEGIN
  -- Check if RLS is enabled
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'invoices'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on invoices table';
  END IF;
END $$;

-- Recreate service role policy to ensure it has full access
DROP POLICY IF EXISTS "Service role full access on invoices" ON public.invoices;
CREATE POLICY "Service role full access on invoices"
  ON public.invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Service role full access on invoices" ON public.invoices IS
  'Allows API (using service_role key) full access to create, read, update, and delete invoices';


-- =============================================
-- 4. CREATE RECEIPT NUMBER GENERATION FUNCTION (IF MISSING)
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix TEXT;
  sequence_num INTEGER;
  new_receipt_number TEXT;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Get current year
  year_prefix := TO_CHAR(NOW(), 'YYYY');

  -- Loop to find next available receipt number
  LOOP
    attempt := attempt + 1;

    -- Get the highest sequence number for this year from payments table
    SELECT COALESCE(
      MAX(
        CAST(
          SUBSTRING(receipt_number FROM 'RCT-[0-9]{4}-([0-9]+)')
          AS INTEGER
        )
      ), 0
    ) + 1
    INTO sequence_num
    FROM public.payments
    WHERE receipt_number ~ ('^RCT-' || year_prefix || '-[0-9]+$');

    -- Format as RCT-YYYY-NNNN
    new_receipt_number := 'RCT-' || year_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');

    -- Check if this number already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.payments WHERE receipt_number = new_receipt_number
    ) THEN
      RETURN new_receipt_number;
    END IF;

    -- Prevent infinite loop
    IF attempt >= max_attempts THEN
      new_receipt_number := 'RCT-' || year_prefix || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      RETURN new_receipt_number;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_receipt_number() TO service_role;

COMMENT ON FUNCTION public.generate_receipt_number() IS
  'Generates unique receipt numbers in format RCT-YYYY-NNNN with auto-incrementing sequence per year';


-- =============================================
-- 5. VERIFY ALL REQUIRED COLUMNS EXIST
-- =============================================
-- Check if purchase_order column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'purchase_order'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN purchase_order TEXT;
    RAISE NOTICE 'Added purchase_order column to invoices table';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'invoice_date'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN invoice_date DATE;
    RAISE NOTICE 'Added invoice_date column to invoices table';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
    AND column_name = 'date_set'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN date_set DATE;
    RAISE NOTICE 'Added date_set column to invoices table';
  END IF;
END $$;


-- =============================================
-- VERIFICATION
-- =============================================
-- Test the function
DO $$
DECLARE
  test_invoice_num TEXT;
BEGIN
  test_invoice_num := generate_invoice_number();
  RAISE NOTICE 'Test invoice number generated: %', test_invoice_num;
END $$;

-- Show summary
SELECT
  'Invoice Creation Fix' AS component,
  'Complete' AS status,
  'generate_invoice_number() function created and tested' AS notes
UNION ALL
SELECT
  'RLS Policies',
  'Verified',
  'Service role has full access to invoices table'
UNION ALL
SELECT
  'Receipt Numbers',
  'Complete',
  'generate_receipt_number() function created for payments';
