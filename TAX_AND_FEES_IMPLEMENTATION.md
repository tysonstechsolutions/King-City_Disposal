# Invoice Taxes & Fees Implementation Guide

## Overview

Customers can now see **exactly where extra costs come from** on their invoices and in email notifications. Taxes and fees are now shown as **separate line items** instead of being hidden in the total.

## What Changed

### Before
```
Invoice Total: $621.00
```
Customer doesn't know what $621 includes (rental + tax + fees?)

### After
```
30 Yard Dumpster - 10-Day Rental    $575.00
IL Rental Tax (8%)                   $46.00
                                    --------
Total                               $621.00
```
Customer can see the breakdown clearly.

## Files Modified

### 1. ✅ Email Template Updated
**File:** `src/lib/notifications.js`

The `invoiceEmail()` function now:
- Parses and displays all line items in a table
- Shows itemized breakdown in both HTML and text emails
- Includes taxes and fees as separate line items

### 2. ✅ Invoice Helper Functions Created
**File:** `src/lib/invoiceHelpers.js` (NEW)

New utility functions for consistent invoice calculations:
- `addTaxesAndFees()` - Automatically adds tax and fee line items
- `createDumpsterLineItem()` - Standard rental line item
- `createOverageLineItem()` - Weight overage calculation
- `createExtensionLineItem()` - Extended rental fees
- `createCompleteInvoiceLineItems()` - Full invoice with all charges

### 3. ✅ Code Improvements
**File:** `src/app/api/book/route.js`

Enhanced error logging for customer creation debugging.

## How to Use (Manual Invoice Creation)

When creating invoices in the admin panel, taxes are **automatically calculated** based on your config:

### Current Tax & Fee Settings
From `src/config.js`:
```javascript
payments: {
  salesTaxRate: 0.08,              // 8% Illinois rental tax
  stripeProcessingRate: 0.029,     // 2.9% Stripe fee
  stripeProcessingFlat: 30,        // + $0.30
}
```

### Option 1: Add Tax Manually as Line Item

When creating an invoice at `/admin/invoices/create`:

1. Add your base line items (e.g., "30 Yard Dumpster - 10-Day Rental: $575.00")
2. Click "Add Line Item"
3. Add tax: "IL Rental Tax (8%)" and calculate: $575 × 0.08 = $46.00
4. (Optional) Add card processing fee if customer is paying by card
5. Total will be calculated automatically

**Example:**
```
Line Item 1: 30 Yard Dumpster - 10-Day Rental → $575.00
Line Item 2: IL Rental Tax (8%)                → $46.00
Line Item 3: Card Processing Fee (2.9% + $0.30) → $18.28  (if paying by card)
```

### Option 2: Use Helper Functions (Programmatic)

If you're creating invoices via code or want automatic calculation:

```javascript
import { addTaxesAndFees, createDumpsterLineItem } from './lib/invoiceHelpers';

// Create base line items
const baseItems = [
  createDumpsterLineItem({
    dumpsterSize: '30 Yard Dumpster',
    rentalDuration: '10-Day',
    priceCents: 57500, // $575.00
  })
];

// Add taxes (and optionally fees)
const invoice = addTaxesAndFees(baseItems, {
  includeStripeFee: false, // Set true if customer is paying by card
});

// Result:
// invoice.lineItems = [
//   { description: '30 Yard Dumpster - 10-Day Rental', amount_cents: 57500 },
//   { description: 'IL Rental Tax (8%)', amount_cents: 4600 }
// ]
// invoice.total_cents = 62100 ($621.00)
```

## Automatic Invoice Creation from Bookings

When invoices are created from paid bookings (via Stripe webhook), taxes are already included in the Stripe checkout session. The webhook should create the invoice with itemized line items:

**Recommended approach in `src/app/api/stripe/webhook/route.js`:**

```javascript
import { createDumpsterLineItem, addTaxesAndFees } from '../../../lib/invoiceHelpers';

// In your webhook handler when payment succeeds:
const baseLineItems = [
  createDumpsterLineItem({
    dumpsterSize: booking.dumpster_size,
    rentalDuration: booking.rental_duration,
    priceCents: booking.price_cents,
  })
];

// Add taxes
const invoiceData = addTaxesAndFees(baseLineItems);

// Create invoice in database with itemized line_items
await createInvoice({
  line_items: invoiceData.lineItems,
  subtotal_cents: invoiceData.subtotal_cents,
  tax_cents: invoiceData.tax_cents,
  total_cents: invoiceData.total_cents,
  // ... other fields
});
```

## Email Display

When you send an invoice via email, customers will see:

### HTML Email (Pretty Table)
```
┌──────────────────────────────────────────────────────┐
│ Item                              │ Amount           │
├──────────────────────────────────────────────────────┤
│ 30 Yard Dumpster - 10-Day Rental  │ $575.00         │
│ IL Rental Tax (8%)                │ $46.00          │
├══════════════════════════════════════════════════════┤
│ Total                             │ $621.00         │
└──────────────────────────────────────────────────────┘
```

### Text Email (Plain Text)
```
  30 Yard Dumpster - 10-Day Rental: $575.00
  IL Rental Tax (8%): $46.00

Total: $621.00
```

## Common Scenarios

### Scenario 1: Simple Rental (No Overage, No Extension)
```
30 Yard Dumpster - 10-Day Rental    $575.00
IL Rental Tax (8%)                   $46.00
                                    --------
Total                               $621.00
```

### Scenario 2: With Weight Overage
```
30 Yard Dumpster - 10-Day Rental                         $575.00
Weight Overage (1.5 tons over 3 ton limit @ $105/ton)    $157.50
IL Rental Tax (8%)                                        $58.60
                                                        ---------
Total                                                    $791.10
```

### Scenario 3: With Extension
```
30 Yard Dumpster - 10-Day Rental               $575.00
Extended Rental (2 weeks @ $100/week)          $200.00
IL Rental Tax (8%)                              $62.00
                                              --------
Total                                          $837.00
```

### Scenario 4: Card Payment (Online)
```
30 Yard Dumpster - 10-Day Rental               $575.00
IL Rental Tax (8%)                              $46.00
Card Processing Fee (2.9% + $0.30)              $18.28
                                              --------
Total                                          $639.28
```

## Best Practices

### ✅ DO:
- Always include IL Rental Tax (8%) as a separate line item
- Use descriptive names: "IL Rental Tax (8%)" not just "Tax"
- Show percentage in parentheses for transparency
- Include card processing fees if customer is paying online
- Use helper functions for consistency

### ❌ DON'T:
- Don't hide taxes in the base price
- Don't add fees without explanation
- Don't use vague descriptions like "Additional Charges"
- Don't forget to update tax rate if Illinois law changes

## Testing

### Test Invoice Creation with Taxes

1. Go to `/admin/invoices/create`
2. Fill in customer details
3. Add line item: "30 Yard Dumpster - 10-Day Rental" → $575
4. Add line item: "IL Rental Tax (8%)" → $46
5. Click "Save & Send"
6. Check your email to verify line items display correctly

### Expected Email Output

The email should show a formatted table with:
- Each line item on its own row
- Dollar amounts right-aligned
- Total highlighted at the bottom

## Updating Tax Rate

If Illinois changes the rental tax rate:

1. Open `src/config.js`
2. Find `payments.salesTaxRate`
3. Update value (e.g., `0.08` for 8%, `0.09` for 9%)
4. Save and deploy

All new invoices will use the updated rate automatically.

## Future Enhancements

### Automatic Tax Calculation Button
Add a button in the invoice creation form:
- "Auto-Calculate Tax" button
- Reads base line items
- Calculates 8% tax
- Adds as new line item automatically

### Location-Based Tax Rates
For multi-state operations:
- Detect customer location
- Apply correct state tax rate
- Update line item description accordingly

### Tax Exemption Handling
For commercial customers with tax exemption:
- Add "Tax Exempt" flag to customer record
- Skip tax line item if customer is exempt
- Note exemption certificate number on invoice

---

**Implementation Status:** ✅ Complete
**Files Modified:** 2 files updated, 1 file created
**Testing Required:** Manual invoice creation + email verification
**Deploy Required:** Yes - push code changes to production
