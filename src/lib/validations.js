// ============================================
// API VALIDATION SCHEMAS (Zod)
// ============================================
// Centralized validation for all API inputs
// ============================================

import { z } from 'zod';

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize string input to prevent XSS and injection attacks
 * Removes potentially dangerous characters while preserving normal text
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize for SQL-like contexts (use with parameterized queries only)
 */
export function sanitizeForQuery(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/['"\\;]/g, '') // Remove quotes, backslashes, semicolons
    .replace(/--/g, '') // Remove SQL comments
    .trim();
}

// ============================================
// COMMON VALIDATORS
// ============================================

// US Phone number - accepts various formats, normalizes to 10 digits
export const phoneSchema = z.string()
  .transform(val => val.replace(/\D/g, ''))
  .refine(val => val.length === 10 || val.length === 11, {
    message: 'Phone number must be 10 or 11 digits',
  })
  .transform(val => val.length === 11 && val.startsWith('1') ? val.slice(1) : val);

// Email - optional but must be valid if provided, with sanitization
export const emailSchema = z.string()
  .email()
  .transform(val => val.toLowerCase().trim())
  .optional()
  .nullable();

// Safe string - sanitizes input to prevent XSS
export const safeStringSchema = (maxLength = 200) => z.string()
  .max(maxLength)
  .transform(sanitizeString);

// Date in various formats
export const dateSchema = z.string().refine(val => {
  // Accept YYYY-MM-DD or human-readable like "Mon, Jan 6"
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
  if (/^[A-Za-z]{3},?\s+[A-Za-z]{3}\s+\d{1,2}$/.test(val)) return true;
  return false;
}, { message: 'Invalid date format' });

// Price in cents - ensure it's a reasonable amount (max $100,000)
export const priceCentsSchema = z.number().int().min(0).max(10000000).optional();

// ============================================
// BOOKING SCHEMAS
// ============================================

export const bookingSchema = z.object({
  customerName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .transform(sanitizeString),

  customerPhone: phoneSchema,

  customerEmail: emailSchema,

  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address too long')
    .transform(sanitizeString),

  placementLat: z.number().min(-90).max(90).optional().nullable(),
  placementLng: z.number().min(-180).max(180).optional().nullable(),
  placementNotes: z.string().max(500).transform(sanitizeString).optional().nullable(),

  dumpsterSize: z.string().min(1, 'Dumpster size is required'),

  rentalDuration: z.string().regex(/^\d+-day$/, 'Invalid rental duration'),

  deliveryDate: z.string().min(1, 'Delivery date required'),

  priceCents: priceCentsSchema,

  projectType: z.string().optional().nullable().transform(val => val || null),

  surcharges: z.record(z.string(), z.number().int().min(0).max(100)).optional(),
});

// ============================================
// INVOICE SCHEMAS
// ============================================

export const lineItemSchema = z.object({
  description: z.string().min(1).max(200).transform(sanitizeString),
  quantity: z.number().min(0).max(1000),
  unit_price_cents: z.number().int().min(0).max(10000000),
  total_cents: z.number().int().min(0).max(10000000),
});

export const invoiceCreateSchema = z.object({
  customer_id: z.number().int().positive().optional().nullable(),
  customer_name: z.string().min(1).max(100).transform(sanitizeString),
  customer_phone: phoneSchema.optional(),
  customer_email: emailSchema,
  customer_address: z.string().max(200).transform(sanitizeString).optional().nullable(),

  booking_id: z.number().int().positive().optional().nullable(),

  line_items: z.array(lineItemSchema).min(1, 'At least one line item required').max(50),

  subtotal_cents: z.number().int().min(0).max(10000000),
  tax_cents: z.number().int().min(0).max(1000000).optional().default(0),
  discount_cents: z.number().int().min(0).max(10000000).optional().default(0),
  total_cents: z.number().int().min(0).max(10000000),

  due_date: z.string().optional().nullable(),
  notes: z.string().max(1000).transform(sanitizeString).optional().nullable(),
  payment_terms: z.string().max(100).transform(sanitizeString).optional().nullable(),
});

// ============================================
// CUSTOMER SCHEMAS
// ============================================

export const customerSchema = z.object({
  name: z.string().min(1).max(100).transform(sanitizeString),
  phone: phoneSchema.optional(),
  email: emailSchema,
  address: z.string().max(200).transform(sanitizeString).optional().nullable(),
  city: z.string().max(50).transform(sanitizeString).optional().nullable(),
  state: z.string().length(2).toUpperCase().optional().default('IL'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional().nullable(),
  notes: z.string().max(1000).transform(sanitizeString).optional().nullable(),
  is_business: z.boolean().optional().default(false),
});

// ============================================
// DOCUMENT/EXPENSE SCHEMAS
// ============================================

export const documentCategorySchema = z.enum([
  'weight_ticket',
  'fuel_receipt',
  'invoice',
  'receipt',
  'contract',
  'photo',
  'other',
]);

export const expenseCategorySchema = z.enum([
  'landfill',
  'fuel',
  'parts',
  'repairs',
  'insurance',
  'maintenance',
  'supplies',
  'other',
]);

// ============================================
// TRANSACTION SCHEMAS
// ============================================

export const transactionSchema = z.object({
  booking_id: z.number().int().positive().optional().nullable(),
  invoice_id: z.number().int().positive().optional().nullable(),
  customer_name: z.string().min(1).max(100).transform(sanitizeString),
  customer_phone: phoneSchema.optional(),
  customer_email: emailSchema,
  amount_cents: z.number().int().min(1, 'Amount must be greater than 0').max(10000000),
  description: z.string().min(1).max(200).transform(sanitizeString),
  type: z.enum(['booking', 'extension', 'overage', 'late_fee', 'invoice', 'custom']),
  payment_method: z.enum(['card', 'cash', 'check', 'venmo', 'zelle', 'other']),
  service_address: z.string().max(200).transform(sanitizeString).optional().nullable(),
  dumpster_size: z.string().max(50).transform(sanitizeString).optional().nullable(),
  rental_duration: z.string().max(50).optional().nullable(),
  delivery_date: z.string().optional().nullable(),
  notes: z.string().max(500).transform(sanitizeString).optional().nullable(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate input and return result with typed data or error
 */
export function validateInput(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return {
      success: false,
      error: errors[0]?.message || 'Validation failed',
      errors,
      data: null,
    };
  }

  return {
    success: true,
    error: null,
    errors: null,
    data: result.data,
  };
}

/**
 * Format validation errors for API response
 */
export function formatValidationError(zodError) {
  return zodError.issues.map(e => ({
    field: e.path.join('.'),
    message: e.message,
  }));
}
