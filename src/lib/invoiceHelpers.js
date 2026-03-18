// ============================================
// INVOICE HELPER FUNCTIONS
// ============================================
// Single source of truth for all invoice calculations
// Backend uses these - frontend should send raw line items only

import { config } from "../config";

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
export function calculateInvoiceTotals(lineItems, options = {}) {
  const {
    includeCardFee = false,
    includeTax = true,
    discountCents = 0,
    lateFeesCents = 0,
  } = options;

  const serviceItems = lineItems.filter(item => !item.is_tax && !item.is_fee);
  const subtotalCents = serviceItems.reduce((sum, item) => sum + (item.amount_cents || 0), 0);
  const taxCents = includeTax ? TAX_CENTS : 0;
  let runningTotal = subtotalCents + taxCents + lateFeesCents - discountCents;
  let ccFeeCents = 0;
  if (includeCardFee && runningTotal > 0) {
    ccFeeCents = Math.round((runningTotal + STRIPE_FLAT) / (1 - STRIPE_RATE) - runningTotal);
  }
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

export function addTaxesAndFees(lineItems, options = {}) {
  const result = calculateInvoiceTotals(lineItems, {
    includeCardFee: options.includeStripeFee,
    includeTax: options.includeTax !== false,
  });
  const allLineItems = [...lineItems];
  if (result.tax_cents > 0) {
    allLineItems.push({ description: "Illinois Sales Tax", amount_cents: result.tax_cents, is_tax: true });
  }
  if (result.cc_fee_cents > 0) {
    allLineItems.push({ description: "Card Processing Fee (2.9% + $0.30)", amount_cents: result.cc_fee_cents, is_fee: true });
  }
  return { lineItems: allLineItems, subtotal_cents: result.subtotal_cents, tax_cents: result.tax_cents, fee_cents: result.cc_fee_cents, total_cents: result.total_cents };
}

export function createDumpsterLineItem({ dumpsterSize, rentalDuration, priceCents }) {
  return { description: dumpsterSize + " - " + rentalDuration + " Rental", amount_cents: priceCents };
}

export function createOverageLineItem(actualLbs, includedLbs, ratePerTon = OVERAGE_RATE_PER_TON) {
  const overageLbs = Math.max(0, actualLbs - includedLbs);
  if (overageLbs <= 0) return null;
  const overageTons = overageLbs / 2000;
  const overageCents = Math.round(overageTons * ratePerTon * 100);
  return { description: "Weight Overage (" + overageTons.toFixed(2) + " tons over " + (includedLbs / 2000).toFixed(1) + " ton limit @ $" + ratePerTon + "/ton)", amount_cents: overageCents };
}

export function createExtensionLineItem(weeks, ratePerWeek = EXTENSION_RATE_PER_WEEK, wasDumped = true) {
  const rate = wasDumped ? ratePerWeek : Math.round(ratePerWeek / 2);
  const totalCents = Math.round(weeks * rate * 100);
  return { description: "Extended Rental (" + weeks + " week" + (weeks > 1 ? "s" : "") + " @ $" + rate + "/week" + (!wasDumped ? " - not dumped" : "") + ")", amount_cents: totalCents };
}

export function createLateFeeLineItem(subtotalCents, monthsLate, ratePercent = 5) {
  if (monthsLate <= 0) return null;
  const lateFeePercent = monthsLate * ratePercent;
  const lateFeeCents = Math.round(subtotalCents * (lateFeePercent / 100));
  return { description: "Late Fee (" + lateFeePercent + "% - " + monthsLate + " month" + (monthsLate > 1 ? "s" : "") + " overdue)", amount_cents: lateFeeCents, is_late_fee: true };
}

export function cleanLineItemsForStorage(lineItems) {
  return lineItems.filter(item => !item.is_tax && !item.is_fee).map(({ description, amount_cents }) => ({ description, amount_cents }));
}

export function cleanLineItemsForDisplay(lineItems) {
  return lineItems.map(({ description, amount_cents }) => ({ description, amount_cents }));
}

export function calculateBalanceDue(totalCents, amountPaidCents) {
  return Math.max(0, (totalCents || 0) - (amountPaidCents || 0));
}

export function determineInvoiceStatus(totalCents, amountPaidCents, currentStatus) {
  const balanceDue = calculateBalanceDue(totalCents, amountPaidCents);
  if (balanceDue <= 0) return "paid";
  if (amountPaidCents > 0) return "partial";
  return currentStatus || "draft";
}

export function buildInvoice(data) {
  const { dumpsterSize, rentalDuration, priceCents, weightLbs, weightIncludedLbs, extensionWeeks, customLineItems = [], includeCardFee = false, includeTax = true, discountCents = 0 } = data;
  const lineItems = [];
  if (dumpsterSize && rentalDuration && priceCents) lineItems.push(createDumpsterLineItem({ dumpsterSize, rentalDuration, priceCents }));
  if (weightLbs && weightIncludedLbs) { const overage = createOverageLineItem(weightLbs, weightIncludedLbs); if (overage) lineItems.push(overage); }
  if (extensionWeeks) lineItems.push(createExtensionLineItem(extensionWeeks));
  lineItems.push(...customLineItems);
  const totals = calculateInvoiceTotals(lineItems, { includeCardFee, includeTax, discountCents });
  return { line_items: lineItems, ...totals };
}

export default { calculateInvoiceTotals, addTaxesAndFees, createDumpsterLineItem, createOverageLineItem, createExtensionLineItem, createLateFeeLineItem, cleanLineItemsForStorage, cleanLineItemsForDisplay, calculateBalanceDue, determineInvoiceStatus, buildInvoice };
