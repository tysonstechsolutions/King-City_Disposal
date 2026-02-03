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

// Document/Expense categories (for uploads and parsed documents)
// These are the common ones - AI can create any category dynamically
export const DOCUMENT_CATEGORIES = [
  { id: 'landfill', label: 'Landfill/Dump', icon: Truck, color: 'blue' },
  { id: 'fuel', label: 'Fuel', icon: Droplet, color: 'amber' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'orange' },
  { id: 'parts', label: 'Parts', icon: Package, color: 'cyan' },
  { id: 'repairs', label: 'Repairs', icon: Wrench, color: 'red' },
  { id: 'supplies', label: 'Supplies', icon: Package, color: 'green' },
  { id: 'meals', label: 'Meals', icon: Receipt, color: 'pink' },
  { id: 'travel', label: 'Travel', icon: Truck, color: 'indigo' },
  { id: 'phone', label: 'Phone', icon: Receipt, color: 'violet' },
  { id: 'utilities', label: 'Utilities', icon: Receipt, color: 'yellow' },
  { id: 'insurance', label: 'Insurance', icon: FileText, color: 'slate' },
  { id: 'office', label: 'Office', icon: Package, color: 'gray' },
  { id: 'software', label: 'Software', icon: Receipt, color: 'purple' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, color: 'emerald' },
  { id: 'dumpster_rental', label: 'Dumpster Rental', icon: Truck, color: 'teal' },
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

// Helper to format category ID into a nice label (for dynamic categories)
export function formatCategoryLabel(categoryId) {
  if (!categoryId) return 'Other';
  // Convert snake_case to Title Case
  return categoryId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper functions
export function getDocumentCategory(categoryId) {
  const found = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
  if (found) return found;

  // Return a dynamic category object for unknown categories
  return {
    id: categoryId || 'other',
    label: formatCategoryLabel(categoryId),
    icon: File, // Default icon
    color: 'neutral',
  };
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
