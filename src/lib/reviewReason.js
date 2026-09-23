// ============================================
// WHY DOES THIS RECEIPT NEED REVIEW?
// ============================================
// parsed_invoices rows with status 'pending_review' are left out of Expenses
// until someone confirms them. The parser (and one-off data fixes) store a
// plain-English reason in parsed_invoices.notes; older rows without one fall
// back to the confidence score, which is why they were held back.

export const AUTO_CONFIRM_CONFIDENCE = 0.95

export function misfiledReason(vendor) {
  return `The AI filed this as an invoice King City Disposal sent to a customer, but it's a bill from ${vendor || 'a vendor'} that you paid. It was moved to expenses — check the amount, date, and category, then confirm.`
}

export function lowConfidenceReason(confidence) {
  const pct = Math.round((Number(confidence) || 0) * 100)
  return `The AI was only ${pct}% sure it read this receipt correctly (it auto-confirms at ${Math.round(AUTO_CONFIRM_CONFIDENCE * 100)}%). Check the amount, date, and vendor against the photo, then confirm.`
}

// Reason to show for a parsed_invoices row, or null if it doesn't need review.
export function getReviewReason(row) {
  if (!row || row.status !== 'pending_review') return null
  if (row.notes) return row.notes
  if (row.confidence_score != null) return lowConfidenceReason(row.confidence_score)
  return 'The AI wasn’t sure about this receipt. Check it against the photo, then confirm.'
}

// ============================================
// CUSTOMERS THAT NEED REVIEW
// ============================================
// Customers the receipt scanner created by mistake (e.g. our own business, or
// a table number off a restaurant receipt). Marked with a prefix on
// customers.notes so no schema change is needed; "Mark reviewed" strips it.

export const CUSTOMER_REVIEW_PREFIX = 'NEEDS REVIEW: '

export function getCustomerReviewReason(customer) {
  const notes = customer?.notes || ''
  if (!notes.startsWith(CUSTOMER_REVIEW_PREFIX)) return null
  return notes.slice(CUSTOMER_REVIEW_PREFIX.length).split('\n')[0]
}

// Notes with the review marker line removed.
export function clearCustomerReview(notes) {
  if (!notes?.startsWith(CUSTOMER_REVIEW_PREFIX)) return notes || ''
  return notes.split('\n').slice(1).join('\n')
}

// ============================================
// RECEIPT SANITY CHECKS
// ============================================
// Anything odd about a parsed receipt holds it for review (out of Expenses)
// with a reason. Used by the parser on every new scan.

export const VALID_EXPENSE_CATEGORIES = [
  'weight_ticket', 'fuel', 'disposal', 'truck_maintenance', 'office_supplies',
  'cleaning_supplies', 'meals', 'advertising', 'phone_internet', 'utilities', 'misc',
]

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`
const vendorKey = (s) => (s || '').split(/[-#(]/)[0].toLowerCase().replace(/[^a-z0-9]/g, '')
// "Hucks" vs "Hucks Store" vs "Hucks Store 259": same vendor if one name starts the other.
const sameVendor = (a, b) => {
  const x = vendorKey(a), y = vendorKey(b)
  return x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))
}

// Other receipts (same date) from the same vendor that could be this one scanned
// again. Different receipt numbers = two real purchases (e.g. two trucks fueled).
export function findSameVendorReceipts(row, sameDateRows = []) {
  const differentReceipt = (o) => row.invoice_number && o.invoice_number && String(o.invoice_number) !== String(row.invoice_number)
  return sameDateRows.filter(o => sameVendor(o.from_name, row.from_name) && !differentReceipt(o))
}

/**
 * @param row parsed_invoices-shaped data for the new receipt
 * @param opts.uploadedAt when the file was uploaded (default now)
 * @param opts.sameDateRows other non-rejected vendor_expense rows with the same invoice_date
 * @returns array of plain-English reasons (empty = nothing odd)
 */
export function findReceiptIssues(row, { uploadedAt = new Date(), sameDateRows = [] } = {}) {
  const issues = []
  const vendor = row.from_name || 'this vendor'

  if (!row.invoice_date) {
    issues.push('No date was read from this receipt, so it may be counted in the wrong tax year. Add the date from the photo.')
  } else {
    const d = new Date(row.invoice_date)
    const up = new Date(uploadedAt)
    if (d > new Date(up.getTime() + 2 * 864e5)) {
      issues.push(`The date read (${row.invoice_date}) is after the day it was uploaded — the year or month was probably misread.`)
    } else if (up - d > 365 * 864e5) {
      issues.push(`The date read (${row.invoice_date}) is over a year before it was uploaded — the year may have been misread.`)
    }
  }

  if (!row.from_name) issues.push('No vendor name was read from this receipt. Add who you paid.')

  if (!row.total_cents) {
    issues.push('No total amount was read from this receipt.')
  } else if (row.total_cents < 0) {
    issues.push(`The amount is negative (${money(row.total_cents)}), so this looks like a return or refund. Make sure the original purchase is also recorded and the category is right.`)
  }

  if (row.expense_category && !VALID_EXPENSE_CATEGORIES.includes(row.expense_category)) {
    issues.push(`The category "${row.expense_category}" isn't a real expense category, so it won't total correctly. Pick the right one.`)
  }

  const calc = (row.subtotal_cents || 0) + (row.tax_cents || 0) + (row.fees_cents || 0) - (row.discount_cents || 0)
  if (row.subtotal_cents && row.total_cents &&
      Math.abs(calc - row.total_cents) > Math.max(100, Math.abs(row.total_cents) * 0.1)) {
    issues.push(`Subtotal + tax (${money(calc)}) doesn't match the total (${money(row.total_cents)}). One of the numbers was probably misread.`)
  }

  const matches = findSameVendorReceipts(row, sameDateRows)
  if (matches.some(o => o.total_cents === row.total_cents)) {
    issues.push(`Looks like a duplicate: another ${vendor} receipt for ${money(row.total_cents)} on the same date is already recorded. If it's the same receipt scanned twice, reject this one.`)
  } else if (matches.length > 0 && Math.abs(row.total_cents || 0) > 50000) {
    issues.push(`There's already a ${vendor} receipt on this date for a different amount (${matches.map(o => money(o.total_cents)).join(', ')}). Make sure they're separate purchases and not the same bill read two ways.`)
  }

  return issues
}
