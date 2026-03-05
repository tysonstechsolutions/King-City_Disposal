# King City Disposal - System Fixes

## Quick Summary

Three critical issues have been identified and fixed:

1. **Invoice Creation Failures** - Invoices fail to create due to missing database function
2. **Customer Creation Failures** - New bookings don't create customer records
3. **Invoice Transparency** - Taxes & fees now shown as separate line items in invoices and emails

## Fix Instructions

### STEP 1: Apply Both Database Fixes

Run these SQL scripts in your Supabase SQL Editor **in order**:

1. **fix-invoice-creation.sql** - Fixes invoice number generation
2. **fix-customer-creation.sql** - Fixes customer creation during booking

**How to run:**
1. Open Supabase Dashboard → SQL Editor → New Query
2. Copy contents of SQL file
3. Paste and click **Run**
4. Verify success messages appear

### STEP 2: Deploy Code Changes

Code improvements have been made to multiple files:

```bash
git add .
git commit -m "Fix invoice creation, customer creation, and add invoice transparency"
git push
```

If using Vercel, this will auto-deploy. Otherwise, run:
```bash
npm run build
# Deploy to your hosting
```

**Files changed:**
- `src/app/api/book/route.js` - Enhanced error logging
- `src/lib/notifications.js` - Updated email template with line items
- `src/lib/invoiceHelpers.js` - NEW: Invoice calculation utilities

## What Was Fixed

### Invoice Creation Fix

**Problem:**
- API calls `generate_invoice_number()` database function
- Function doesn't exist in database
- Causes intermittent invoice creation failures

**Solution:**
- Created `generate_invoice_number()` function
- Creates sequential invoice numbers: INV-2026-0001, INV-2026-0002, etc.
- Added unique constraint to prevent duplicates
- Verified RLS policies allow invoice creation
- Created `generate_receipt_number()` for payments

**Files:**
- `fix-invoice-creation.sql` - Database migration
- `INVOICE_FIX_INSTRUCTIONS.md` - Detailed instructions

### Customer Creation Fix

**Problem:**
- New bookings succeed but customer records not created
- Bookings end up with `customer_id = null` (orphaned)
- Silent failure - no error shown to admin or customer

**Solution:**
- Fixed RLS policies to allow customer creation
- Verified all required columns exist
- Added indexes for faster customer lookups
- Backfilled orphaned bookings (linked to existing customers)
- Enhanced error logging with detailed messages
- SMS notifications now warn if customer creation fails

**Files:**
- `fix-customer-creation.sql` - Database migration
- `CUSTOMER_CREATION_FIX_INSTRUCTIONS.md` - Detailed instructions
- `src/app/api/book/route.js` - Enhanced error handling (already applied)

### Invoice Transparency Improvement

**Problem:**
- Customers receive invoices showing only total amount
- No breakdown of what the charges include
- Taxes and fees hidden in total
- Confusing for customers - leads to payment questions

**Solution:**
- Invoice emails now show itemized breakdown
- Taxes displayed as separate line items
- Fees shown clearly when applicable
- Both HTML and text email formats updated

**Example:**
```
Before:
Total: $621.00

After:
30 Yard Dumpster - 10-Day Rental    $575.00
IL Rental Tax (8%)                   $46.00
                                    --------
Total                               $621.00
```

**Files:**
- `src/lib/notifications.js` - Updated email template
- `src/lib/invoiceHelpers.js` - NEW: Invoice calculation utilities
- `TAX_AND_FEES_IMPLEMENTATION.md` - Complete guide

## Testing After Fixes

### Test Invoice Creation & Email

1. Go to `/admin/invoices/create`
2. Fill out a test invoice
3. Add line items:
   - Base item: "30 Yard Dumpster - 10-Day Rental" → $575
   - Tax: "IL Rental Tax (8%)" → $46
4. Click "Save & Send"
5. Verify invoice is created successfully
6. Check invoice number format: `INV-2026-XXXX`
7. **Check your email** - verify line items show in table format

### Test Customer Creation

1. Go to website booking page
2. Complete a booking with a **new** customer (different phone/email)
3. Check `/admin/customers`
4. Verify new customer appears
5. Check `/admin/bookings`
6. Verify booking is linked to customer (has customer name/ID)

### Check for Orphaned Bookings

Run in Supabase SQL Editor:
```sql
-- Should be 0 or very low
SELECT COUNT(*) as orphaned_bookings
FROM public.bookings
WHERE customer_id IS NULL;
```

## Quick Verification

Run this in Supabase SQL Editor to test everything:

```sql
-- Test invoice number generation
SELECT generate_invoice_number() AS test_invoice;

-- Test receipt number generation
SELECT generate_receipt_number() AS test_receipt;

-- Test customer creation
SELECT get_or_create_customer(
  'Test Customer',
  '618-555-0123',
  'test@example.com',
  '123 Test St',
  'Marion',
  'IL',
  '62959'
) AS customer_id;

-- Check RLS policies
SELECT tablename, policyname, roles
FROM pg_policies
WHERE tablename IN ('invoices', 'customers')
ORDER BY tablename, policyname;
```

## Monitoring Going Forward

### Daily Checks

1. Watch for SMS warnings: "⚠️ WARNING: Customer record not created"
2. Check Supabase logs for errors (Dashboard → Logs)
3. Monitor for invoice creation error toasts

### Weekly Checks

```sql
-- Check for orphaned bookings (should be ~0)
SELECT COUNT(*) FROM public.bookings WHERE customer_id IS NULL;

-- Check recent invoices have proper numbers
SELECT invoice_number, created_at
FROM public.invoices
ORDER BY created_at DESC
LIMIT 10;

-- Check recent customers
SELECT name, phone, created_at
FROM public.customers
ORDER BY created_at DESC
LIMIT 10;
```

## If Issues Persist

### Invoice Creation Still Fails

1. Check Supabase logs for specific error
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables
3. Re-run `fix-invoice-creation.sql`
4. Check that function exists:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'generate_invoice_number';
   ```

### Customer Creation Still Fails

1. Check browser console (F12) for errors
2. Check Supabase logs for RLS policy violations
3. Verify service role key is set
4. Run this diagnostic:
   ```sql
   -- Should show service_role policies
   SELECT * FROM pg_policies
   WHERE tablename = 'customers' AND roles @> ARRAY['service_role'];
   ```

## File Summary

### Database Migrations
- ✅ `fix-invoice-creation.sql` - Creates invoice number generation functions
- ✅ `fix-customer-creation.sql` - Fixes customer creation and RLS policies

### Documentation
- ✅ `INVOICE_FIX_INSTRUCTIONS.md` - Detailed invoice fix guide
- ✅ `CUSTOMER_CREATION_FIX_INSTRUCTIONS.md` - Detailed customer fix guide
- ✅ `TAX_AND_FEES_IMPLEMENTATION.md` - Invoice transparency guide
- ✅ `README_FIXES.md` - This file (master guide)

### Code Changes
- ✅ `src/app/api/book/route.js` - Enhanced error logging for customer creation
- ✅ `src/lib/notifications.js` - Updated invoice email template with line items
- ✅ `src/lib/invoiceHelpers.js` - NEW: Invoice calculation utilities

## Next Steps

1. **Run both SQL migrations** in Supabase
2. **Deploy code changes** to production
3. **Test invoice creation** and **customer creation**
4. **Monitor** for the next few days
5. Report any persistent issues

---

**Created**: March 4, 2026
**Priority**: HIGH - These are critical fixes for core functionality
**Status**: Ready to deploy
**Estimated Fix Time**: 10 minutes
