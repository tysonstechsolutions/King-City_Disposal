# Quick Reference: Adding Taxes to Invoices

## When Creating Invoices Manually

### Step-by-Step: Invoice with Taxes

1. **Go to:** `/admin/invoices/create`

2. **Fill in customer details** (name, email, phone)

3. **Add Line Item 1:** Rental charge
   - Description: `30 Yard Dumpster - 10-Day Rental`
   - Amount: `575.00`

4. **Click** "Add Line Item"

5. **Add Line Item 2:** Tax
   - Description: `IL Rental Tax (8%)`
   - Amount: Calculate: $575 × 0.08 = `46.00`

6. **Total will be:** $621.00 (automatic)

7. **Click** "Save & Send" or "Save Draft"

---

## Quick Tax Calculator

| Base Price | Tax (8%) | Total    |
|-----------|---------|----------|
| $475      | $38.00  | $513.00  |
| $525      | $42.00  | $567.00  |
| $575      | $46.00  | $621.00  |

**Formula:** Base Price × 0.08 = Tax

---

## Common Invoice Scenarios

### Scenario 1: Simple Rental
```
Line 1: 30 Yard Dumpster - 10-Day Rental    $575.00
Line 2: IL Rental Tax (8%)                   $46.00
Total:                                       $621.00
```

### Scenario 2: With Weight Overage
```
Line 1: 30 Yard Dumpster - 10-Day Rental                      $575.00
Line 2: Weight Overage (1.5 tons @ $105/ton)                  $157.50
Line 3: IL Rental Tax (8% of $732.50)                          $58.60
Total:                                                         $791.10
```

**Calculation:** ($575 + $157.50) × 0.08 = $58.60

### Scenario 3: With Extension
```
Line 1: 30 Yard Dumpster - 10-Day Rental    $575.00
Line 2: Extended Rental (1 week)             $100.00
Line 3: IL Rental Tax (8% of $675)            $54.00
Total:                                       $729.00
```

---

## Tax Line Item Templates

Copy/paste these descriptions:

### Standard Tax
```
IL Rental Tax (8%)
```

### With Card Processing Fee (if customer paying online)
```
IL Rental Tax (8%)
Card Processing Fee (2.9% + $0.30)
```

---

## Important Notes

✅ **Always include tax** - It's Illinois law for equipment rentals

✅ **Tax applies to total of all rental charges** - Base rental + overage + extensions

✅ **Use consistent description** - "IL Rental Tax (8%)" - customers recognize this

✅ **Calculate on subtotal** - Tax is on the sum of all charges BEFORE tax

❌ **Don't charge tax twice** - Only one tax line item per invoice

❌ **Don't forget weight overage** - Include overage in tax calculation base

---

## Email Preview

When you send the invoice, customer sees:

```
┌─────────────────────────────────────────────────┐
│ Item                           │ Amount         │
├─────────────────────────────────────────────────┤
│ 30 Yard Dumpster - 10-Day      │ $575.00       │
│ IL Rental Tax (8%)             │ $46.00        │
├═════════════════════════════════════════════════┤
│ Total                          │ $621.00       │
└─────────────────────────────────────────────────┘
```

---

## If Tax Rate Changes

If Illinois changes rental tax rate:

1. Open `src/config.js`
2. Find: `salesTaxRate: 0.08`
3. Change to new rate (e.g., `0.09` for 9%)
4. Save and deploy

All future invoices use the new rate.

---

## Need Help?

**Full Documentation:** See `TAX_AND_FEES_IMPLEMENTATION.md`

**Tax Calculation Issues?** Check that you're applying tax to the subtotal (sum of all charges before tax)

**Email Not Showing Line Items?** Make sure you deployed the code changes from `src/lib/notifications.js`

---

**Last Updated:** March 4, 2026
**Tax Rate:** 8% (Illinois equipment rental tax)
