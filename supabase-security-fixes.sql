-- =============================================
-- 1. ENABLE RLS ON PAYMENTS TABLE
-- =============================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (your API uses service role key)
DROP POLICY IF EXISTS "Service role full access on payments" ON public.payments;
CREATE POLICY "Service role full access on payments"
  ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Block anon from payments entirely
DROP POLICY IF EXISTS "Block anon from payments" ON public.payments;
CREATE POLICY "Block anon from payments"
  ON public.payments
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);


-- =============================================
-- 2. FIX MUTABLE SEARCH_PATH ON ALL FUNCTIONS
-- =============================================
ALTER FUNCTION public.generate_invoice_number SET search_path = public;
ALTER FUNCTION public.generate_receipt_number SET search_path = public;
ALTER FUNCTION public.update_vendor_corrections_updated_at SET search_path = public;
ALTER FUNCTION public.cleanup_expired_sessions SET search_path = public;
ALTER FUNCTION public.cleanup_expired_rate_limits SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;


-- =============================================
-- 3. REPLACE OVERLY PERMISSIVE RLS POLICIES
-- =============================================

-- --- BOOKINGS ---
DROP POLICY IF EXISTS "Allow anon inserts" ON public.bookings;
DROP POLICY IF EXISTS "Anon can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anon can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role full access on bookings" ON public.bookings;

CREATE POLICY "Anon can insert bookings"
  ON public.bookings
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read bookings"
  ON public.bookings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role full access on bookings"
  ON public.bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --- CUSTOMERS ---
DROP POLICY IF EXISTS "Allow all customers" ON public.customers;
DROP POLICY IF EXISTS "Block anon from customers" ON public.customers;
DROP POLICY IF EXISTS "Service role full access on customers" ON public.customers;

CREATE POLICY "Block anon from customers"
  ON public.customers
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role full access on customers"
  ON public.customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --- DOCUMENTS ---
DROP POLICY IF EXISTS "Allow all documents" ON public.documents;
DROP POLICY IF EXISTS "Anon can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Anon can read documents" ON public.documents;
DROP POLICY IF EXISTS "Service role full access on documents" ON public.documents;

CREATE POLICY "Anon can insert documents"
  ON public.documents
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read documents"
  ON public.documents
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role full access on documents"
  ON public.documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --- INVOICES ---
DROP POLICY IF EXISTS "Allow all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anon can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Service role full access on invoices" ON public.invoices;

CREATE POLICY "Anon can read invoices"
  ON public.invoices
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role full access on invoices"
  ON public.invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --- TRANSACTIONS ---
DROP POLICY IF EXISTS "Allow all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anon can read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role full access on transactions" ON public.transactions;

CREATE POLICY "Anon can read transactions"
  ON public.transactions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role full access on transactions"
  ON public.transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- --- VENDOR CORRECTIONS ---
DROP POLICY IF EXISTS "Service role can manage vendor corrections" ON public.vendor_corrections;
DROP POLICY IF EXISTS "Block anon from vendor corrections" ON public.vendor_corrections;
DROP POLICY IF EXISTS "Service role full access on vendor corrections" ON public.vendor_corrections;

CREATE POLICY "Block anon from vendor corrections"
  ON public.vendor_corrections
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role full access on vendor corrections"
  ON public.vendor_corrections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- NOTE: parsed_invoices and missed_calls policies are handled
-- in their own table creation scripts (create-parsed-invoices-table.sql)
