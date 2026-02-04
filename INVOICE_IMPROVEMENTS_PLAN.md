# King City Disposal Invoice System Improvements Plan

## Overview
This plan addresses 12+ issues and improvements to the invoice creation, viewing, and automation system.

---

## 1. Remove Price from Line Item Dropdown Titles

**Current Behavior:** Dropdown shows "20yd Dumpster - $475", "30yd Dumpster - $575"
**Desired Behavior:** Dropdown shows "20yd Dumpster", "30yd Dumpster" (no price)

**File:** `src/app/admin/invoices/create/page.jsx`
**Lines:** 529-554

**Changes:**
```jsx
// Change from:
<option value="20yd">20yd Dumpster - $475</option>
<option value="30yd">30yd Dumpster - $575</option>
<option value="extended">Extended Use Charge - $50</option>

// To:
<option value="20yd">20yd Dumpster</option>
<option value="30yd">30yd Dumpster</option>
<option value="extended">Extended Use Charge</option>
```

---

## 2. Default to 30yd Dumpster Instead of 20yd

**Current Behavior:** New invoices default to 20yd dumpster
**Desired Behavior:** Default to 30yd dumpster

**File:** `src/app/admin/invoices/create/page.jsx`
**Lines:** 42-64

**Changes:**
```jsx
// Change initial state from:
const [invoice, setInvoice] = useState({
  dumpster_size: '20yd',
  line_items: [
    { description: '20 Yard Dumpster - 10-Day Rental', amount_cents: 47500, quantity: 1 }
  ],
  // ...
})

// To:
const [invoice, setInvoice] = useState({
  dumpster_size: '30yd',
  line_items: [
    { description: '30 Yard Dumpster - 10-Day Rental', amount_cents: 57500, quantity: 1 }
  ],
  // ...
})
```

---

## 3. Fix Price Input Bug (Can't Type 200, Maxes at 20.00)

**Current Behavior:** Typing "200" results in "20.00" because the input intercepts digits incorrectly
**Desired Behavior:** Allow typing full dollar amounts naturally

**File:** `src/app/admin/invoices/create/page.jsx`
**Lines:** 570-578

**Root Cause:** The number input with `step="0.01"` and live conversion to cents causes issues.

**Solution:** Use a text input with currency formatting, or change the UX to input dollars as a string and convert on blur.

**Changes:**
```jsx
// Replace the price input with a controlled text input:
<input
  type="text"
  inputMode="decimal"
  value={formatDollarsForDisplay(item.amount_cents)}
  onChange={(e) => {
    // Allow typing freely, parse on change
    const value = e.target.value.replace(/[^0-9.]/g, '')
    const dollars = parseFloat(value) || 0
    const cents = Math.round(dollars * 100)
    updateLineItem(index, 'amount_cents', cents)
  }}
  placeholder="0.00"
  className="..."
/>

// Add helper function:
const formatDollarsForDisplay = (cents) => {
  if (!cents && cents !== 0) return ''
  return (cents / 100).toFixed(2)
}
```

---

## 4. Add "Date Set" Field for Dumpster Delivery Date

**Current Behavior:** No field to track when dumpster was delivered
**Desired Behavior:** Add selectable "date set" field on invoice

**Database Change Required:**
```sql
ALTER TABLE invoices ADD COLUMN date_set DATE;
```

**File:** `src/app/admin/invoices/create/page.jsx`

**Changes:**
1. Add to initial state:
```jsx
const [invoice, setInvoice] = useState({
  // ... existing fields
  date_set: null,  // New field
})
```

2. Add date picker input in the form (after service date section):
```jsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-dark-300">
    Date Set (Dumpster Delivered)
  </label>
  <input
    type="date"
    value={invoice.date_set || ''}
    onChange={(e) => setInvoice({...invoice, date_set: e.target.value})}
    className="input-field"
  />
</div>
```

3. Include in save payload to Supabase

**Also update:** `src/app/admin/invoices/[id]/page.jsx` to display/edit date_set

---

## 5. Preview Flow with Send and Add Payment Buttons

**Current Behavior:** Preview shows invoice but actions are limited
**Desired Behavior:** Preview → shows customer view → "Send" and "Add Payment" buttons

**File:** `src/app/admin/invoices/create/page.jsx`
**Component:** `InvoicePreviewModal` (lines 676-1011)

**Changes:**

1. Save invoice to draft state first, get invoice ID
2. Update modal footer with two primary actions:

```jsx
<div className="flex gap-4 justify-center mt-6 p-4 border-t border-dark-700">
  <button
    onClick={handleSendInvoice}
    className="btn-primary flex items-center gap-2"
  >
    <Send size={18} />
    Send Invoice
  </button>
  <button
    onClick={handleAddPayment}
    className="btn-secondary flex items-center gap-2"
  >
    <DollarSign size={18} />
    Add Payment
  </button>
</div>
```

3. Add send logic:
```jsx
const handleSendInvoice = async () => {
  // Save invoice first if not saved
  const savedInvoice = await saveInvoice()

  // Send via email if email exists
  if (invoice.customer_email) {
    await sendInvoiceEmail(savedInvoice.id)
  }

  // Send via SMS if phone exists
  if (invoice.customer_phone) {
    await sendInvoiceSMS(savedInvoice.id)
  }

  // Update status to 'sent'
  await updateInvoiceStatus(savedInvoice.id, 'sent')

  toast.success('Invoice sent!')
  router.push(`/admin/invoices/${savedInvoice.id}`)
}

const handleAddPayment = async () => {
  const savedInvoice = await saveInvoice()
  router.push(`/admin/invoices/${savedInvoice.id}?action=payment`)
}
```

---

## 6. Automatic Late Fees After 30 Days from Date Set

**Current Behavior:** Late fees calculated from invoice_date
**Desired Behavior:** Late fees apply 30 days after date_set

**File:** `src/app/admin/invoices/[id]/page.jsx`
**Lines:** 109-129 (calculateLateFee function)

**Changes:**
```jsx
const calculateLateFee = (inv) => {
  // Use date_set if available, otherwise fall back to invoice_date
  const referenceDate = inv.date_set
    ? new Date(inv.date_set)
    : new Date(inv.invoice_date || inv.created_at)

  const dueDate = new Date(referenceDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  const today = new Date()

  if (today <= dueDate) return 0

  const monthsOverdue = Math.floor((today - dueDate) / (30 * 24 * 60 * 60 * 1000))
  const feeRate = 0.05 // 5% per month
  const baseFee = Math.max(monthsOverdue, 1) * feeRate

  return Math.round(inv.total_cents * baseFee)
}
```

**Also update:** `src/app/api/cron/late-fees/route.js` to use date_set for invoice late fee calculations

---

## 7. Fix Line Item Dropdown (Creates New Line Instead of Populating)

**Current Behavior:** Selecting dropdown option creates new line item
**Desired Behavior:** Dropdown should populate the current line item

**File:** `src/app/admin/invoices/create/page.jsx`
**Lines:** ~520-560 (handlePresetChange function)

**Changes:**
```jsx
const handlePresetChange = (index, preset) => {
  if (preset === 'custom') return

  const presets = {
    '20yd': { description: '20 Yard Dumpster - 10-Day Rental', amount_cents: 47500 },
    '30yd': { description: '30 Yard Dumpster - 10-Day Rental', amount_cents: 57500 },
    'extended': { description: 'Extended Use Charge', amount_cents: 5000 },
    'haul': { description: 'Haul Fee', amount_cents: 0 },
    'overage': { description: 'Weight Overage', amount_cents: 0 },
  }

  const presetData = presets[preset]
  if (presetData) {
    // Update EXISTING line item at index, don't create new one
    const updatedItems = [...invoice.line_items]
    updatedItems[index] = {
      ...updatedItems[index],
      description: presetData.description,
      amount_cents: presetData.amount_cents,
    }
    setInvoice({ ...invoice, line_items: updatedItems })
  }
}
```

Verify the `<select>` onChange calls `handlePresetChange(index, value)` correctly.

---

## 8. View HTML Invoice from Anywhere

**Current Behavior:** Can only view customer invoice from detail page
**Desired Behavior:** Quick access to HTML invoice view from list and other places

**Files to modify:**
1. `src/app/admin/invoices/page.jsx` - Invoice list
2. `src/app/admin/invoices/[id]/page.jsx` - Invoice detail

**Changes:**

1. Add "View Invoice" icon button in invoice list table:
```jsx
<a
  href={`/invoice/${invoice.invoice_number}`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-dark-400 hover:text-primary-400 transition-colors"
  title="View as Customer"
>
  <ExternalLink size={16} />
</a>
```

2. Add prominent "View HTML" button on detail page header:
```jsx
<a
  href={`/invoice/${invoice.invoice_number}`}
  target="_blank"
  rel="noopener noreferrer"
  className="btn-secondary flex items-center gap-2"
>
  <Eye size={18} />
  View as Customer
</a>
```

---

## 9. Automatic Text AND Email Reminder After 30 Days

**Current Behavior:** Only SMS reminders at various intervals
**Desired Behavior:** Both SMS and email after 30 days from date_set

**File:** `src/app/api/cron/invoice-reminders/route.js`

**Changes:**

1. Add email sending capability (using existing Resend/SendGrid if configured):
```javascript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

async function sendReminderEmail(invoice, message) {
  if (!invoice.customer_email) return

  await resend.emails.send({
    from: 'billing@kingcitydisposal.com',
    to: invoice.customer_email,
    subject: `Invoice Reminder - ${invoice.invoice_number}`,
    html: buildEmailTemplate(invoice, message),
  })
}
```

2. Update reminder logic to use date_set:
```javascript
const referenceDate = invoice.date_set
  ? new Date(invoice.date_set)
  : new Date(invoice.invoice_date || invoice.created_at)

const dueDate = new Date(referenceDate.getTime() + 30 * 24 * 60 * 60 * 1000)
const daysOverdue = Math.floor((now - dueDate) / (24 * 60 * 60 * 1000))

// Send both SMS and email at 30 days
if (daysOverdue >= 0) {
  await sendReminderSMS(invoice, message)
  await sendReminderEmail(invoice, message)
}
```

3. Include payment link in messages:
```javascript
const invoiceUrl = `${config.websiteUrl}/invoice/${invoice.invoice_number}`
const paymentUrl = invoice.stripe_payment_link || invoiceUrl

const message = `Your invoice ${invoice.invoice_number} for $${(invoice.total_cents/100).toFixed(2)} is ${daysOverdue} days overdue. View: ${invoiceUrl} Pay now: ${paymentUrl}`
```

---

## 10. Add Billing Information to Invoice

**Current Behavior:** Invoice footer shows business name and phone only
**Desired Behavior:** Add "King City Disposal Billing 6182318380" section

**File:** `src/app/invoice/[id]/page.jsx`
**Lines:** 412-415 (footer section)

**Changes:**
```jsx
{/* Billing Information Section */}
<div className="mt-8 pt-6 border-t border-dark-700">
  <div className="text-center">
    <h3 className="text-lg font-semibold text-white mb-2">Billing Information</h3>
    <p className="text-dark-300">King City Disposal Billing</p>
    <p className="text-primary-400 font-bold text-xl">(618) 231-8481</p>
  </div>
</div>

{/* Thank You Section */}
<div className="mt-6 pt-4 border-t border-dark-700 text-center text-sm text-dark-400">
  <p>Thank you for your business!</p>
  <p className="mt-1">{config.businessName} • {config.phone}</p>
</div>
```

**Also update:** Preview modal in `create/page.jsx` to show the same billing section.

---

## 11. Due Date Logic: On Receipt or Date Set (Whichever Earlier)

**Current Behavior:** Due date is invoice_date + 30 days
**Desired Behavior:** Due on receipt OR date_set, whichever is earlier

**Interpretation:**
- "Due on receipt" = immediately upon invoice creation
- "Date set" = dumpster delivery date
- So effectively: due date = MIN(invoice_date, date_set) or just "Due on Receipt"

**Files to modify:**
1. `src/app/admin/invoices/create/page.jsx`
2. `src/app/admin/invoices/[id]/page.jsx`
3. `src/app/invoice/[id]/page.jsx`

**Changes:**

1. Calculate due_date on save:
```jsx
const calculateDueDate = (invoiceDate, dateSet) => {
  const receipt = new Date(invoiceDate)
  const setDate = dateSet ? new Date(dateSet) : null

  // Due on whichever is earlier
  if (setDate && setDate < receipt) {
    return setDate.toISOString().split('T')[0]
  }
  return receipt.toISOString().split('T')[0]  // Due on receipt
}
```

2. Display on customer invoice:
```jsx
<div>
  <span className="text-dark-400">Due Date:</span>
  <span className="ml-2 font-semibold">
    {invoice.due_date
      ? formatDate(invoice.due_date)
      : 'Due on Receipt'}
  </span>
</div>
```

---

## Implementation Order (Priority)

### Phase 1: Critical Fixes (Blocking Issues)
1. **Fix Price Input Bug** - Currently prevents entering prices correctly
2. **Fix Line Item Dropdown** - Core functionality broken
3. **Default to 30yd** - Quick config change

### Phase 2: New Fields & Data
4. **Add Date Set Field** - Requires DB migration
5. **Due Date Logic** - Depends on date_set
6. **Late Fee Calculation Update** - Depends on date_set

### Phase 3: UI/UX Improvements
7. **Remove Prices from Dropdown** - Simple text change
8. **Preview Flow (Send/Add Payment)** - Major UX improvement
9. **View HTML Invoice Anywhere** - Add links
10. **Billing Information Section** - Add to invoice display

### Phase 4: Automation
11. **30-Day Auto Reminder (SMS + Email)** - Cron job update
12. **Late Fee Automation** - Cron job update

---

## Database Migration Required

```sql
-- Add date_set column to invoices table
ALTER TABLE invoices ADD COLUMN date_set DATE;

-- Optional: Add index for queries
CREATE INDEX idx_invoices_date_set ON invoices(date_set);
```

---

## Testing Checklist

- [ ] Create invoice with 30yd default
- [ ] Type "200" in price field → shows $200.00
- [ ] Select dropdown preset → updates current line (not new line)
- [ ] Set date_set field and verify it saves
- [ ] Preview invoice shows customer view with Send/Add Payment buttons
- [ ] Send button sends to email and/or phone
- [ ] View HTML invoice link works from list and detail pages
- [ ] Billing information shows on customer invoice
- [ ] Due date shows correctly based on receipt/date_set logic
- [ ] Late fees calculate from date_set after 30 days
- [ ] Cron sends both SMS and email at 30 days overdue
