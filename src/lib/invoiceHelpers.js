// ============================================
// INVOICE HELPER FUNCTIONS
// ============================================
// Utility functions for invoice calculations and line item generation

import { config } from '../config';

/**
 * Adds tax and fee line items to an invoice
 * This ensures customers see exactly where extra costs come from
 *
 * @param {Array} lineItems - Base line items (e.g., dumpster rental)
 * @param {Object} options - Optional fee configuration
 * @returns {Object} - { lineItems, subtotal, tax, fees, total }
 */
export function addTaxesAndFees(lineItems, options = {}) {
  // Calculate base subtotal from provided line items
  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount_cents || 0), 0);

  // Get tax and fee rates from config or options
  const taxRate = options.taxRate ?? config.payments?.salesTaxRate ?? 0.08; // Default 8% IL rental tax
  const includeStripeFee = options.includeStripeFee ?? false; // Only add if customer is paying by card

  // Calculate tax
  const taxCents = Math.round(subtotal * taxRate);

  // Start with base line items
  const allLineItems = [...lineItems];

  // Add tax line item if applicable
  if (taxCents > 0) {
    allLineItems.push({
      description: `IL Rental Tax (${Math.round(taxRate * 100)}%)`,
      amount_cents: taxCents,
      is_tax: true,
    });
  }

  // Calculate total so far
  let runningTotal = subtotal + taxCents;

  // Add Stripe processing fee if customer is paying by card
  if (includeStripeFee) {
    const stripeRate = config.payments?.stripeProcessingRate ?? 0.029; // 2.9%
    const stripeFlat = config.payments?.stripeProcessingFlat ?? 30; // $0.30

    // Calculate fee: (subtotal + tax + flat) / (1 - rate) - (subtotal + tax)
    const stripeFee = Math.round((runningTotal + stripeFlat) / (1 - stripeRate) - runningTotal);

    if (stripeFee > 0) {
      allLineItems.push({
        description: `Card Processing Fee (${Math.round(stripeRate * 100)}% + $${(stripeFlat / 100).toFixed(2)})`,
        amount_cents: stripeFee,
        is_fee: true,
      });
      runningTotal += stripeFee;
    }
  }

  return {
    lineItems: allLineItems,
    subtotal_cents: subtotal,
    tax_cents: taxCents,
    fee_cents: includeStripeFee ? (runningTotal - subtotal - taxCents) : 0,
    total_cents: runningTotal,
  };
}

/**
 * Formats line items for display (removes internal flags)
 *
 * @param {Array} lineItems - Line items with possible internal flags
 * @returns {Array} - Clean line items for display
 */
export function cleanLineItemsForDisplay(lineItems) {
  return lineItems.map(({ description, amount_cents }) => ({
    description,
    amount_cents,
  }));
}

/**
 * Creates standard dumpster rental line item
 *
 * @param {Object} params - Rental details
 * @returns {Object} - Line item object
 */
export function createDumpsterLineItem({ dumpsterSize, rentalDuration, priceCents }) {
  return {
    description: `${dumpsterSize} - ${rentalDuration} Rental`,
    amount_cents: priceCents,
  };
}

/**
 * Creates weight overage line item
 *
 * @param {Number} actualTons - Actual weight in tons
 * @param {Number} includedTons - Included weight in tons
 * @param {Number} ratePerTon - Overage rate per ton (dollars)
 * @returns {Object|null} - Line item object or null if no overage
 */
export function createOverageLineItem(actualTons, includedTons, ratePerTon = 105) {
  const overageTons = actualTons - includedTons;
  if (overageTons <= 0) return null;

  const overageCents = Math.round(overageTons * ratePerTon * 100);

  return {
    description: `Weight Overage (${overageTons.toFixed(2)} tons over ${includedTons} ton limit @ $${ratePerTon}/ton)`,
    amount_cents: overageCents,
  };
}

/**
 * Creates extended rental line item
 *
 * @param {Number} weeks - Number of extra weeks
 * @param {Number} ratePerWeek - Extension rate per week (dollars)
 * @param {Boolean} wasDumped - Whether container was dumped
 * @returns {Object} - Line item object
 */
export function createExtensionLineItem(weeks, ratePerWeek = 100, wasDumped = true) {
  const rate = wasDumped ? ratePerWeek : (ratePerWeek / 2); // Half price if not dumped
  const totalCents = Math.round(weeks * rate * 100);

  return {
    description: `Extended Rental (${weeks} week${weeks > 1 ? 's' : ''} @ $${rate}/week${!wasDumped ? ' - not dumped' : ''})`,
    amount_cents: totalCents,
  };
}

/**
 * Example: Complete invoice with taxes and fees
 *
 * This shows how to use these helpers when creating an invoice
 */
export function createCompleteInvoiceLineItems(invoiceData) {
  const baseItems = [];

  // Add dumpster rental
  if (invoiceData.dumpsterSize && invoiceData.rentalDuration && invoiceData.priceCents) {
    baseItems.push(createDumpsterLineItem({
      dumpsterSize: invoiceData.dumpsterSize,
      rentalDuration: invoiceData.rentalDuration,
      priceCents: invoiceData.priceCents,
    }));
  }

  // Add weight overage if applicable
  if (invoiceData.actualTons && invoiceData.includedTons) {
    const overageItem = createOverageLineItem(
      invoiceData.actualTons,
      invoiceData.includedTons,
      invoiceData.overageRate
    );
    if (overageItem) baseItems.push(overageItem);
  }

  // Add extension if applicable
  if (invoiceData.extensionWeeks) {
    baseItems.push(createExtensionLineItem(
      invoiceData.extensionWeeks,
      invoiceData.extensionRate,
      invoiceData.wasDumped
    ));
  }

  // Add custom line items
  if (invoiceData.customLineItems) {
    baseItems.push(...invoiceData.customLineItems);
  }

  // Add taxes and fees
  const result = addTaxesAndFees(baseItems, {
    includeStripeFee: invoiceData.paymentMethod === 'card',
  });

  return result;
}

export default {
  addTaxesAndFees,
  cleanLineItemsForDisplay,
  createDumpsterLineItem,
  createOverageLineItem,
  createExtensionLineItem,
  createCompleteInvoiceLineItems,
};
