// ============================================
// INVOICE HELPER FUNCTIONS
// ============================================
// Single source of truth for all invoice calculations
// Backend uses these - frontend should send raw line items only

import { config } from '../config';

// ============================================
// CONFIGURATION (from config.js)
// ============================================
const TAX_CENTS = config.payments?.flatRentalTaxCents ?? 1688; // $16.88 flat tax
const STRIPE_RATE = config.payments?.stripeProcessingRate ?? 0.029; // 2.9%
const STRIPE_FLAT = config.payments?.stripeProcessingFlat ?? 30; // $0.30 in cents
const OVERAGE_RATE_PER_TON = config.pricing?.overagePerTon ?? 105; // $105/ton
const EXTENSION_RATE_PER_WEEK = 100; // $100/week

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================
/**
 * Calculate invoice totals from line items
 * This is the SINGLE SOURCE OF TRUTH for invoice math
 *
 * @param {Array} lineItems - Service line items (NO tax/fees)
 * @param {Object} options
 * @param {boolean} options.includeCardFee - Whether to add CC processing fee
 * @param {number} options.discountCents - Discount amount in cents
 * @param {number} options.lateFeesCents - Late fees in cents (already calculated)
 * @returns {Object} Calculated totals
 */
export function calculateInvoiceTotals(lineItems, options = {}) {
  const {
    includeCardFee = false,
    discountCents = 0,
    lateFeesCents = 0,
  } = options;

  // Step 1: Sum service line items (filter out any tax/fee items that snuck in)
  const serviceItems = lineItems.filter(item => !item.is_tax && !item.is_fee);
  const subtotalCents = serviceItems.reduce((sum, item) => sum + (item.amount_cents || 0), 0);

  // Step 2: Tax is flat $16.88
  const taxCents = TAX_CENTS;

  // Step 3: Calculate running total before CC fee
  let runningTotal = subtotalCents + taxCents + lateFeesCents - discountCents;

  // Step 4: Calculate CC fee if needed
  // Formula: fee = (total + flat) / (1 - rate) - total
  // This ensures customer pays the fee, not the business
  let ccFeeCents = 0;
  if (includeCardFee && runningTotal > 0) {
    ccFeeCents = Math.round((runningTotal + STRIPE_FLAT) / (1 - STRIPE_RATE) - runningTotal);
  }

  // Step 5: Final total
  const totalCents = runningTotal + ccFeeCents;

  return {
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    cc_fee_cents: ccFeeCents,
    late_fee_cents: lateFeesCents,
    discount_cents: discountCents,
    total_cents: totalCents,
  };
}

// ============================================
// LEGACY FUNCTION (for backwards compatibility)
// ============================================
/**
 * @deprecated Use calculateInvoiceTotals instead
 * This adds tax/fee as line items which is NOT recommended
 */
export function addTaxesAndFees(lineItems, options = {}) {
  const result = calculateInvoiceTotals(lineItems, {
    includeCardFee: options.includeStripeFee,
  });

  // Build line items array including tax/fees for display purposes only
  const allLineItems = [...lineItems];

  if (result.tax_cents > 0) {
    allLineItems.push({
      description: 'Illinois Sales Tax',
      amount_cents: result.tax_cents,
      is_tax: true,
    });
  }

  if (result.cc_fee_cents > 0) {
    allLineItems.push({
      description: `Card Processing Fee (${Math.round(STRIPE_RATE * 100)}% + $${(STRIPE_FLAT / 100).toFixed(2)})`,
      amount_cents: result.cc_fee_cents,
      is_fee: true,
    });
  }

  return {
    lineItems: allLineItems,
    subtotal_cents: result.subtotal_cents,
    tax_cents: result.tax_cents,
    fee_cents: result.cc_fee_cents,
    total_cents: result.total_cents,
  };
}

// ============================================
// LINE ITEM GENERATORS
// ============================================

/**
 * Create a dumpster rental line item
 */
export function createDumpsterLineItem({ dumpsterSize, rentalDuration, priceCents }) {
  return {
    description: `${dumpsterSize} - ${rentalDuration} Rental`,
    amount_cents: priceCents,
  };
}

/**
 * Create a weight overage line item
 * @param {number} actualLbs - Actual weight in pounds
 * @param {number} includedLbs - Included weight in pounds
 * @param {number} ratePerTon - Rate per ton in dollars (default $105)
 */
export function createOverageLineItem(actualLbs, includedLbs, ratePerTon = OVERAGE_RATE_PER_TON) {
  const overageLbs = Math.max(0, actualLbs - includedLbs);
  if (overageLbs <= 0) return null;

  const overageTons = overageLbs / 2000;
  const overageCents = Math.round(overageTons * ratePerTon * 100);

  return {
    description: `Weight Overage (${overageTons.toFixed(2)} tons over ${(includedLbs / 2000).toFixed(1)} ton limit @ $${ratePerTon}/ton)`,
    amount_cents: overageCents,
  };
}

/**
 * Create an extension line item
 */
export function createExtensionLineItem(weeks, ratePerWeek = EXTENSION_RATE_PER_WEEK, wasDumped = true) {
  const rate = wasDumped ? ratePerWeek : Math.round(ratePerWeek / 2);
  const totalCents = Math.round(weeks * rate * 100);

  return {
    description: `Extended Rental (${weeks} week${weeks > 1 ? 's' : ''} @ $${rate}/week${!wasDumped ? ' - not dumped' : ''})`,
    amount_cents: totalCents,
  };
}

/**
 * Create a late fee line item
 * @param {number} subtotalCents - Original invoice subtotal
 * @param {number} monthsLate - Number of months overdue
 * @param {number} ratePercent - Late fee rate (default 5%)
 */
export function createLateFeeLineItem(subtotalCents, monthsLate, ratePercent = 5) {
  if (monthsLate <= 0) return null;

  const lateFeePercent = monthsLate * ratePercent;
  const lateFeeCents = Math.round(subtotalCents * (lateFeePercent / 100));

  return {
    description: `Late Fee (${lateFeePercent}% - ${monthsLate} month${monthsLate > 1 ? 's' : ''} overdue)`,
    amount_cents: lateFeeCents,
    is_late_fee: true,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Clean line items for storage (remove internal flags)
 */
export function cleanLineItemsForStorage(lineItems) {
  return lineItems
    .filter(item => !item.is_tax && !item.is_fee) // Remove tax/fee items
    .map(({ description, amount_cents }) => ({
      description,
      amount_cents,
    }));
}

/**
 * Format line items for display (keeps all items)
 */
export function cleanLineItemsForDisplay(lineItems) {
  return lineItems.map(({ description, amount_cents }) => ({
    description,
    amount_cents,
  }));
}

/**
 * Calculate balance due
 */
export function calculateBalanceDue(totalCents, amountPaidCents) {
  return Math.max(0, (totalCents || 0) - (amountPaidCents || 0));
}

/**
 * Determine invoice status based on payments
 */
export function determineInvoiceStatus(totalCents, amountPaidCents, currentStatus) {
  const balanceDue = calculateBalanceDue(totalCents, amountPaidCents);

  if (balanceDue <= 0) {
    return 'paid';
  }

  if (amountPaidCents > 0) {
    return 'partial';
  }

  // Keep current status if no payments made
  return currentStatus || 'draft';
}

// ============================================
// COMPLETE INVOICE BUILDER
// ============================================
/**
 * Build a complete invoice with all calculations
 * Use this when creating invoices from bookings or scratch
 */
export function buildInvoice(data) {
  const {
    dumpsterSize,
    rentalDuration,
    priceCents,
    weightLbs,
    weightIncludedLbs,
    extensionWeeks,
    customLineItems = [],
    includeCardFee = false,
    discountCents = 0,
  } = data;

  // Build line items
  const lineItems = [];

  // Add dumpster rental
  if (dumpsterSize && rentalDuration && priceCents) {
    lineItems.push(createDumpsterLineItem({
      dumpsterSize,
      rentalDuration,
      priceCents,
    }));
  }

  // Add weight overage
  if (weightLbs && weightIncludedLbs) {
    const overage = createOverageLineItem(weightLbs, weightIncludedLbs);
    if (overage) lineItems.push(overage);
  }

  // Add extension
  if (extensionWeeks) {
    lineItems.push(createExtensionLineItem(extensionWeeks));
  }

  // Add custom items
  lineItems.push(...customLineItems);

  // Calculate totals
  const totals = calculateInvoiceTotals(lineItems, {
    includeCardFee,
    discountCents,
  });

  return {
    line_items: lineItems,
    ...totals,
  };
}

export default {
  calculateInvoiceTotals,
  addTaxesAndFees,
  createDumpsterLineItem,
  createOverageLineItem,
  createExtensionLineItem,
  createLateFeeLineItem,
  cleanLineItemsForStorage,
  cleanLineItemsForDisplay,
  calculateBalanceDue,
  determineInvoiceStatus,
  buildInvoice,
};
