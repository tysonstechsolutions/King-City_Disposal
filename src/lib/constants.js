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
// Main categories for upload and expense tracking
export const DOCUMENT_CATEGORIES = [
  { id: 'invoice', label: 'Invoice', icon: FileText, color: 'purple' },
  { id: 'weight_ticket', label: 'Weight Ticket', icon: Scale, color: 'blue' },
  { id: 'fuel', label: 'Fuel', icon: Droplet, color: 'amber' },
  { id: 'disposal', label: 'Disposal', icon: Truck, color: 'cyan' },
  { id: 'truck_maintenance', label: 'Truck Maintenance', icon: Wrench, color: 'orange' },
  { id: 'office_supplies', label: 'Office Supplies', icon: Package, color: 'green' },
  { id: 'cleaning_supplies', label: 'Cleaning Supplies', icon: Package, color: 'teal' },
  { id: 'meals', label: 'Meals', icon: Receipt, color: 'pink' },
  { id: 'advertising', label: 'Advertising', icon: Receipt, color: 'violet' },
  { id: 'misc', label: 'Misc', icon: File, color: 'neutral' },
];

// Expense categories (for filtering on expenses page)
export const EXPENSE_CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: Receipt, color: 'neutral' },
  { id: 'invoice', label: 'Invoice', icon: FileText, color: 'purple' },
  { id: 'weight_ticket', label: 'Weight Ticket', icon: Scale, color: 'blue' },
  { id: 'fuel', label: 'Fuel', icon: Fuel, color: 'amber' },
  { id: 'disposal', label: 'Disposal', icon: Truck, color: 'cyan' },
  { id: 'truck_maintenance', label: 'Truck Maintenance', icon: Wrench, color: 'orange' },
  { id: 'office_supplies', label: 'Office Supplies', icon: Package, color: 'green' },
  { id: 'cleaning_supplies', label: 'Cleaning Supplies', icon: Package, color: 'teal' },
  { id: 'meals', label: 'Meals', icon: Receipt, color: 'pink' },
  { id: 'advertising', label: 'Advertising', icon: Receipt, color: 'violet' },
  { id: 'misc', label: 'Misc', icon: HelpCircle, color: 'neutral' },
];

// Category icons lookup (for components that need just icons)
export const CATEGORY_ICONS = {
  invoice: FileText,
  weight_ticket: Scale,
  fuel: Fuel,
  disposal: Truck,
  truck_maintenance: Wrench,
  office_supplies: Package,
  cleaning_supplies: Package,
  meals: Receipt,
  advertising: Receipt,
  misc: HelpCircle,
  // Legacy mappings for backwards compatibility
  landfill: Truck,
  other: HelpCircle,
};

// Category labels lookup
export const CATEGORY_LABELS = {
  invoice: 'Invoice',
  weight_ticket: 'Weight Ticket',
  fuel: 'Fuel',
  disposal: 'Disposal',
  truck_maintenance: 'Truck Maintenance',
  office_supplies: 'Office Supplies',
  cleaning_supplies: 'Cleaning Supplies',
  meals: 'Meals',
  advertising: 'Advertising',
  misc: 'Misc',
  // Legacy mappings
  landfill: 'Disposal',
  other: 'Misc',
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
  // Append T00:00:00 to date-only strings so they parse as local time, not UTC
  const d = dateStr.length === 10 ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
  return d.toLocaleDateString('en-US', {
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
