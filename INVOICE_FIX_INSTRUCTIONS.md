# Invoice Creation Fix Instructions

## Problem Identified

Your invoice creation is failing intermittently because:

1. **Missing Database Function**: The `generate_invoice_number()` function is called by your API but doesn't exist in the database
2. **Potential Race Conditions**: Without a proper unique constraint, duplicate invoice numbers could cause failures
3. **Missing Receipt Number Function**: The `generate_receipt_number()` function is also referenced but missing

## Solution

I've created a comprehensive SQL migration file that will fix all these issues: `fix-invoice-creation.sql`

### How to Apply the Fix

#### Option 1: Run in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `fix-invoice-creation.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl+Enter`
7. Check the output messages to verify everything was created successfully

#### Option 2: Use Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

## What the Fix Does

### 1. Creates `generate_invoice_number()` Function
- Generates invoice numbers in format: `INV-2026-0001`
- Auto-increments sequence number for each year
- Prevents duplicates with built-in collision detection
- Falls back to random numbers if conflicts occur

### 2. Creates `generate_receipt_number()` Function
- Generates receipt numbers in format: `RCT-2026-0001`
- Same auto-increment logic for payments

### 3. Adds Unique Constraint
- Ensures no duplicate invoice numbers can be created
- Prevents database-level conflicts

### 4. Verifies RLS Policies
- Ensures your API (using `service_role` key) can create invoices
- Maintains security while allowing proper access

### 5. Adds Missing Columns
- Checks for and adds any missing columns like:
  - `purchase_order`
  - `invoice_date`
  - `date_set`

## After Running the Fix

### Test Invoice Creation

1. Go to your admin panel: `/admin/invoices/create`
2. Fill out a test invoice
3. Click "Save & Send" or "Save Draft"
4. Verify the invoice is created successfully
5. Check the invoice number format (should be `INV-2026-XXXX`)

### Monitor for Errors

If you still see errors after applying this fix:

1. Check browser console (F12) for error messages
2. Check Supabase logs:
   - Dashboard → Logs → API Logs
3. Look for specific error messages about:
   - Missing columns
   - RLS policy violations
   - Constraint violations

## Additional Debugging

If issues persist, run this query in Supabase SQL Editor to check function exists:

```sql
-- Verify functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('generate_invoice_number', 'generate_receipt_number');

-- Test invoice number generation
SELECT generate_invoice_number() AS test_invoice_number;

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'invoices';
```

## Code Explanation

The fix addresses the root cause in `src/app/api/invoices/route.js:19`:

```javascript
// This RPC call was failing because the function didn't exist
const response = await fetch(
  `${supabaseUrl}/rest/v1/rpc/generate_invoice_number`,
  // ...
);
```

Now with the function in place:
- ✅ RPC call succeeds
- ✅ Sequential invoice numbers (INV-2026-0001, INV-2026-0002, etc.)
- ✅ No duplicate number conflicts
- ✅ Consistent invoice creation

## Support

If you continue to experience issues after applying this fix:

1. Share the specific error message from the toast notification
2. Check browser console and share any errors
3. Verify the SQL script ran without errors in Supabase

---

**Created**: March 4, 2026
**Issue**: Invoice creation intermittent failures
**Resolution**: Missing database functions and constraints
