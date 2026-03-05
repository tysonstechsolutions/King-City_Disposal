# Customer Creation Fix Instructions

## Problem Identified

When new customers book through your website, the system sometimes fails to create them as customer records in the database. This results in:

- ✅ Booking is created successfully
- ❌ Customer record is NOT created
- ❌ Booking has `customer_id = null` (orphaned booking)
- ⚠️ No error shown to the customer (silent failure)

### Root Causes

1. **RLS Policy Blocking**: Row Level Security policies may be preventing the API from creating customers
2. **Missing Columns**: Required columns might be missing from the customers table
3. **Silent Failures**: When customer creation fails, the code logs an error but continues with the booking
4. **No Visibility**: You don't get notified when customer creation fails

## Solution

I've created fixes in two parts:

### 1. Database Fix: `fix-customer-creation.sql`

Comprehensive SQL migration that:
- ✅ Verifies and fixes RLS policies for customer creation
- ✅ Ensures all required columns exist in the customers table
- ✅ Creates database indexes for fast customer lookups (by phone/email)
- ✅ Links orphaned bookings to existing customers (backfill)
- ✅ Creates a helper function `get_or_create_customer()` for more reliable customer creation

### 2. Code Improvements: `src/app/api/book/route.js`

Enhanced error handling:
- ✅ Better error logging with full details when customer creation fails
- ✅ SMS notification includes a warning if customer wasn't created
- ✅ Console errors for debugging

## How to Apply the Fix

### Step 1: Run the SQL Migration

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `fix-customer-creation.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl+Enter`
7. Check the output for success messages

Expected output should show:
```
NOTICE: Customer table column verification complete
NOTICE: Found X orphaned bookings without customer_id
NOTICE: Linked Y orphaned bookings to existing customers
NOTICE: Test customer created/found with ID: ...
NOTICE: Test customer deleted
```

### Step 2: Deploy Code Changes

The code changes in `src/app/api/book/route.js` are already applied. You need to deploy them:

```bash
# If using Vercel
git add .
git commit -m "Fix customer creation with enhanced error logging"
git push

# Or if deploying manually
npm run build
# Deploy to your hosting
```

## What the Fix Does

### Database Changes

1. **RLS Policies**
   - Ensures `service_role` can create customers (your API uses this role)
   - Blocks anonymous users from accessing customers table
   - Fixes policy conflicts that may be preventing creation

2. **Table Structure**
   - Verifies these columns exist:
     - `name`, `phone`, `email`, `address`
     - `city`, `state`, `zip`
     - `total_jobs`, `last_job_date`
     - `notes`, `payment_terms`, `credit_balance_cents`, `company_name`

3. **Search Optimization**
   - Creates indexes on `phone` and `email` for fast lookups
   - Enables trigram search for fuzzy matching
   - Makes customer lookups much faster (important for checking duplicates)

4. **Orphaned Bookings Backfill**
   - Finds bookings without `customer_id`
   - Attempts to link them to existing customers by matching phone numbers
   - Reports how many were successfully linked

5. **Helper Function** (Optional)
   - Creates `get_or_create_customer()` database function
   - Can be called directly from API for more reliable customer creation
   - Returns customer ID, creating new customer if needed

### Code Changes

1. **Enhanced Error Logging**
   - Captures full error response from Supabase
   - Logs customer data that failed to save
   - Outputs to console for debugging

2. **Team Notification**
   - SMS notification now includes warning: "⚠️ WARNING: Customer record not created - please add manually!"
   - You'll know immediately if customer creation failed
   - Can manually create customer before fulfilling booking

## Testing the Fix

### After Running SQL Migration

1. **Test New Booking**
   - Go to your website booking page
   - Complete a booking with a brand new customer
   - Check the admin panel → Customers
   - Verify the new customer was created

2. **Check Orphaned Bookings**
   - Go to admin panel → Bookings
   - Look for any bookings without customer names linked
   - These should now be linked if matching customers exist

3. **Monitor Errors**
   - Watch for the warning in SMS notifications
   - Check browser console when testing bookings
   - Review Supabase logs for any customer creation errors

### Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check RLS policies on customers table
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'customers';

-- Count orphaned bookings (should be 0 or very low after backfill)
SELECT COUNT(*) as orphaned_bookings
FROM public.bookings
WHERE customer_id IS NULL;

-- Test the helper function
SELECT get_or_create_customer(
  'Test Customer',
  '618-555-0123',
  'test@example.com',
  '123 Main St',
  'Marion',
  'IL',
  '62959'
) AS customer_id;

-- Check recent customers
SELECT
  id,
  name,
  phone,
  email,
  total_jobs,
  last_job_date,
  created_at
FROM public.customers
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### If Customer Creation Still Fails

1. **Check Supabase Logs**
   - Dashboard → Logs → API Logs
   - Look for POST requests to `/rest/v1/customers`
   - Check for error messages

2. **Check Console Errors**
   - Open browser console (F12)
   - Place a test booking
   - Look for "Customer creation failed:" messages

3. **Verify Service Role Key**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
   - This key is required for bypassing RLS policies

4. **Check Missing Columns**
   - Run this query to see all customer columns:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'customers'
   ORDER BY ordinal_position;
   ```

### Common Error Messages

**"permission denied for table customers"**
- RLS policy is blocking creation
- Re-run the RLS policy section of the SQL migration
- Verify you're using service_role key in the API

**"null value in column 'name' violates not-null constraint"**
- Customer name is required
- Check that booking form is capturing customer name correctly

**"duplicate key value violates unique constraint"**
- Phone/email already exists (this is normal)
- The API should find and update existing customer instead

## Monitoring Going Forward

### Expected Behavior After Fix

- ✅ Every new booking creates/updates a customer
- ✅ Duplicate customers are prevented (matched by phone/email)
- ✅ Bookings are linked to customers via `customer_id`
- ✅ You receive SMS notification if customer creation fails
- ✅ Error logs show detailed information for debugging

### Weekly Check

Once a week, run this query to check for orphaned bookings:

```sql
SELECT
  COUNT(*) as orphaned_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_orphaned
FROM public.bookings
WHERE customer_id IS NULL;
```

If you see orphaned bookings:
1. Check error logs for pattern
2. Manually link booking to customer in admin panel
3. Report persistent issues

## Alternative: Use Database Function (Optional)

If you continue to have issues, you can modify the API to use the database function instead:

In `src/app/api/book/route.js`, replace the `findOrCreateCustomer` call:

```javascript
// OLD:
const customer = await findOrCreateCustomer({
  name: customerName,
  phone: customerPhone,
  email: customerEmail,
  address: address,
  city: city,
  zip: zip,
});

// NEW: Use database function via RPC
const response = await fetch(
  `${supabaseUrl}/rest/v1/rpc/get_or_create_customer`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': getSupabaseKey(),
      'Authorization': `Bearer ${getSupabaseKey()}`,
    },
    body: JSON.stringify({
      p_name: customerName,
      p_phone: customerPhone,
      p_email: customerEmail,
      p_address: address,
      p_city: city,
      p_zip: zip,
    }),
  }
);
const customerId = await response.json();
const customer = customerId ? { id: customerId } : null;
```

This approach:
- Moves customer creation logic to database
- More reliable (database guarantees)
- Simpler error handling
- Better performance

---

**Created**: March 4, 2026
**Issue**: Customers not created during booking
**Resolution**: RLS policies, missing columns, and enhanced error handling
