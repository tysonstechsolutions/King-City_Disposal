'use client'

// ============================================
// SHARED CONSTANTS
// ============================================

import {
  Scale,
  Droplet,
  Camera,
  FileText,
  File,
  Truck,
  Fuel,
  Wrench,
  Package,
  HelpCircle,
  Receipt,
} from 'lucide-react';

// Document categories (for uploads)
export const DOCUMENT_CATEGORIES = [
  { id: 'weight_ticket', label: 'Weight Ticket', icon: Scale, color: 'blue' },
  { id: 'fuel_receipt', label: 'Fuel Receipt', icon: Droplet, color: 'amber' },
  { id: 'photo', label: 'Job Photo', icon: Camera, color: 'green' },
  { id: 'invoice', label: 'Invoice', icon: FileText, color: 'purple' },
  { id: 'contract', label: 'Contract', icon: FileText, color: 'indigo' },
  { id: 'other', label: 'Other', icon: File, color: 'neutral' },
];

// Expense categories (for parsed invoices)
export const EXPENSE_CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: Receipt, color: 'neutral' },
  { id: 'landfill', label: 'Landfill/Dump', icon: Truck, color: 'blue' },
  { id: 'fuel', label: 'Fuel', icon: Fuel, color: 'amber' },
  { id: 'parts', label: 'Parts', icon: Package, color: 'green' },
  { id: 'repairs', label: 'Repairs', icon: Wrench, color: 'red' },
  { id: 'supplies', label: 'Supplies', icon: Package, color: 'purple' },
  { id: 'dumpster_rental', label: 'Dumpster Rental', icon: Truck, color: 'indigo' },
  { id: 'other', label: 'Other', icon: HelpCircle, color: 'neutral' },
];

// Category icons lookup (for components that need just icons)
export const CATEGORY_ICONS = {
  landfill: Truck,
  fuel: Fuel,
  parts: Package,
  repairs: Wrench,
  supplies: Package,
  dumpster_rental: Truck,
  other: HelpCircle,
};

// Category labels lookup
export const CATEGORY_LABELS = {
  landfill: 'Landfill/Dump Fees',
  fuel: 'Fuel',
  parts: 'Parts',
  repairs: 'Repairs',
  supplies: 'Supplies',
  dumpster_rental: 'Dumpster Rental',
  other: 'Other',
};

// Helper functions
export function getDocumentCategory(categoryId) {
  return DOCUMENT_CATEGORIES.find(c => c.id === categoryId) || DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1];
}

export function getExpenseCategory(categoryId) {
  return EXPENSE_CATEGORIES.find(c => c.id === categoryId) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

// Format currency from cents
export function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((cents || 0) / 100);
}

// Format date
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format weight - convert lbs to tons for display
export function formatWeight(lbs) {
  if (!lbs) return '-';
  const tons = lbs / 2000;
  return `${tons.toFixed(2)} tons`;
}

// Format weight with lbs in parentheses (for detailed views)
export function formatWeightDetailed(lbs) {
  if (!lbs) return '-';
  const tons = lbs / 2000;
  return `${tons.toFixed(2)} tons (${lbs.toLocaleString()} lbs)`;
}
