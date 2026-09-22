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
