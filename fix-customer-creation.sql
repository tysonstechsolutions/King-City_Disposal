-- =============================================
-- FIX CUSTOMER CREATION DURING BOOKING
-- =============================================
-- This script ensures customers are properly created when
-- new bookings are placed through the website.
--
-- Run this in your Supabase SQL Editor.
-- =============================================

-- =============================================
-- 1. VERIFY CUSTOMERS TABLE RLS POLICIES
-- =============================================
-- Ensure service_role has full access to create customers

-- Enable RLS if not already enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop and recreate service role policy to ensure clean state
DROP POLICY IF EXISTS "Service role full access on customers" ON public.customers;
CREATE POLICY "Service role full access on customers"
  ON public.customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Service role full access on customers" ON public.customers IS
  'Allows API (using service_role key) full access to create, read, update, and delete customers';

-- Ensure anon role is blocked from direct customer access
DROP POLICY IF EXISTS "Block anon from customers" ON public.customers;
CREATE POLICY "Block anon from customers"
  ON public.customers
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- =============================================
-- 2. VERIFY REQUIRED COLUMNS EXIST
-- =============================================
-- Add any missing columns that the booking API expects

DO $$
BEGIN
  -- Check for name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN name TEXT NOT NULL;
    RAISE NOTICE 'Added name column to customers table';
  END IF;

  -- Check for phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN phone TEXT;
    RAISE NOTICE 'Added phone column to customers table';
  END IF;

  -- Check for email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to customers table';
  END IF;

  -- Check for address column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN address TEXT;
    RAISE NOTICE 'Added address column to customers table';
  END IF;

  -- Check for city column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'city'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN city TEXT;
    RAISE NOTICE 'Added city column to customers table';
  END IF;

  -- Check for state column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'state'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN state TEXT DEFAULT 'IL';
    RAISE NOTICE 'Added state column to customers table';
  END IF;

  -- Check for zip column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'zip'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN zip TEXT;
    RAISE NOTICE 'Added zip column to customers table';
  END IF;

  -- Check for total_jobs column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'total_jobs'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN total_jobs INTEGER DEFAULT 0;
    RAISE NOTICE 'Added total_jobs column to customers table';
  END IF;

  -- Check for last_job_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'last_job_date'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN last_job_date DATE;
    RAISE NOTICE 'Added last_job_date column to customers table';
  END IF;

  -- Check for notes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN notes TEXT;
    RAISE NOTICE 'Added notes column to customers table';
  END IF;

  -- Check for payment_terms column (used for invoicing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN payment_terms INTEGER DEFAULT 15;
    RAISE NOTICE 'Added payment_terms column to customers table';
  END IF;

  -- Check for credit_balance_cents column (for customer credits)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'credit_balance_cents'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN credit_balance_cents INTEGER DEFAULT 0;
    RAISE NOTICE 'Added credit_balance_cents column to customers table';
  END IF;

  -- Check for company_name column (for business customers)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN company_name TEXT;
    RAISE NOTICE 'Added company_name column to customers table';
  END IF;

  RAISE NOTICE 'Customer table column verification complete';
END $$;


-- =============================================
-- 3. ENABLE TRIGRAM EXTENSION & CREATE INDEXES
-- =============================================
-- Enable trigram extension FIRST (required for gin_trgm_ops indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The booking API searches for existing customers by phone
-- These indexes make those lookups much faster

CREATE INDEX IF NOT EXISTS idx_customers_phone_search
  ON public.customers USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_email_search
  ON public.customers USING gin (email gin_trgm_ops);

-- =============================================
-- 4. VERIFY BOOKINGS TABLE HAS customer_id FK
-- =============================================
-- Ensure bookings can reference customers

DO $$
BEGIN
  -- Check if customer_id column exists in bookings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added customer_id foreign key to bookings table';
  END IF;
END $$;

-- Create index for fast customer lookups from bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);


-- =============================================
-- 5. FIX ORPHANED BOOKINGS (BACKFILL)
-- =============================================
-- Find bookings without customer_id and try to link them to existing customers
-- This is a one-time backfill for past bookings

DO $$
DECLARE
  orphaned_count INTEGER;
  linked_count INTEGER := 0;
  booking_record RECORD;
BEGIN
  -- Count orphaned bookings
  SELECT COUNT(*) INTO orphaned_count
  FROM public.bookings
  WHERE customer_id IS NULL AND customer_phone IS NOT NULL;

  RAISE NOTICE 'Found % orphaned bookings without customer_id', orphaned_count;

  -- Try to link each orphaned booking to an existing customer
  FOR booking_record IN
    SELECT id, customer_name, customer_phone, customer_email, address
    FROM public.bookings
    WHERE customer_id IS NULL AND customer_phone IS NOT NULL
    LIMIT 100 -- Process in batches
  LOOP
    -- Try to find matching customer by phone
    UPDATE public.bookings b
    SET customer_id = c.id
    FROM public.customers c
    WHERE b.id = booking_record.id
      AND c.phone ILIKE '%' || REGEXP_REPLACE(booking_record.customer_phone, '\D', '', 'g') || '%'
    RETURNING b.id INTO booking_record.id;

    IF FOUND THEN
      linked_count := linked_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Linked % orphaned bookings to existing customers', linked_count;
  RAISE NOTICE 'Remaining orphaned bookings: %', orphaned_count - linked_count;
END $$;


-- =============================================
-- 6. CREATE HELPER FUNCTION: get_or_create_customer
-- =============================================
-- Optional: Database-level function for customer creation
-- This can be called from the API for more reliable customer creation

CREATE OR REPLACE FUNCTION public.get_or_create_customer(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT 'IL',
  p_zip TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id BIGINT;
  v_clean_phone TEXT;
BEGIN
  -- Clean phone number
  v_clean_phone := REGEXP_REPLACE(p_phone, '\D', '', 'g');

  -- Try to find existing customer by phone or email
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE (
    phone ILIKE '%' || RIGHT(v_clean_phone, 10) || '%'
    OR (p_email IS NOT NULL AND email ILIKE p_email)
  )
  ORDER BY total_jobs DESC
  LIMIT 1;

  -- If found, update stats and return
  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET
      total_jobs = COALESCE(total_jobs, 0) + 1,
      last_job_date = CURRENT_DATE,
      city = COALESCE(city, p_city),
      zip = COALESCE(zip, p_zip)
    WHERE id = v_customer_id;

    RETURN v_customer_id;
  END IF;

  -- Customer not found, create new one
  INSERT INTO public.customers (
    name,
    phone,
    email,
    address,
    city,
    state,
    zip,
    total_jobs,
    last_job_date,
    notes
  ) VALUES (
    p_name,
    p_phone,
    p_email,
    p_address,
    p_city,
    p_state,
    p_zip,
    1,
    CURRENT_DATE,
    'Auto-created from online booking'
  )
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_or_create_customer TO service_role;

COMMENT ON FUNCTION public.get_or_create_customer IS
  'Find existing customer by phone/email or create new one. Returns customer ID. Used by booking API.';


-- =============================================
-- VERIFICATION & TESTING
-- =============================================

-- Test customer creation
DO $$
DECLARE
  test_customer_id BIGINT;
BEGIN
  -- Test the helper function
  test_customer_id := get_or_create_customer(
    'Test Customer',
    '(618) 555-0123',
    'test@example.com',
    '123 Test St',
    'Marion',
    'IL',
    '62959'
  );

  RAISE NOTICE 'Test customer created/found with ID: %', test_customer_id;

  -- Clean up test customer
  DELETE FROM public.customers WHERE id = test_customer_id;
  RAISE NOTICE 'Test customer deleted';
END $$;

-- Show summary
SELECT
  'Customer Creation Fix' AS component,
  'Complete' AS status,
  'RLS policies verified and service_role has full access' AS notes
UNION ALL
SELECT
  'Table Structure',
  'Verified',
  'All required columns exist in customers table'
UNION ALL
SELECT
  'Helper Function',
  'Created',
  'get_or_create_customer() function available for API use'
UNION ALL
SELECT
  'Indexes',
  'Optimized',
  'Phone and email indexes created for fast lookups'
UNION ALL
SELECT
  'Orphaned Bookings',
  'Backfilled',
  'Attempted to link existing bookings to customers';
