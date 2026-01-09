// ============================================
// API VALIDATION SCHEMAS (Zod)
// ============================================
// Centralized validation for all API inputs
// ============================================

import { z } from 'zod';

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

// Email - optional but must be valid if provided
export const emailSchema = z.string().email().optional().nullable();

// Date in various formats
export const dateSchema = z.string().refine(val => {
  // Accept YYYY-MM-DD or human-readable like "Mon, Jan 6"
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
  if (/^[A-Za-z]{3},?\s+[A-Za-z]{3}\s+\d{1,2}$/.test(val)) return true;
  return false;
}, { message: 'Invalid date format' });

// Price in cents
export const priceCentsSchema = z.number().int().min(0).optional();

// ============================================
// BOOKING SCHEMAS
// ============================================

export const bookingSchema = z.object({
  customerName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),

  customerPhone: phoneSchema,

  customerEmail: emailSchema,

  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address too long'),

  placementLat: z.number().min(-90).max(90).optional().nullable(),
  placementLng: z.number().min(-180).max(180).optional().nullable(),
  placementNotes: z.string().max(500).optional().nullable(),

  dumpsterSize: z.enum(['20-yard', '30-yard'], {
    errorMap: () => ({ message: 'Invalid dumpster size' }),
  }),

  rentalDuration: z.string().regex(/^\d+-day$/, 'Invalid rental duration'),

  deliveryDate: z.string().min(1, 'Delivery date required'),

  priceCents: priceCentsSchema,

  projectType: z.enum(['cleanout', 'renovation', 'roofing', 'construction', 'other']).optional().nullable(),

  surcharges: z.record(z.string(), z.number().int().min(0)).optional(),
});

// ============================================
// INVOICE SCHEMAS
// ============================================

export const lineItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().min(0),
  unit_price_cents: z.number().int(),
  total_cents: z.number().int(),
});

export const invoiceCreateSchema = z.object({
  customer_id: z.number().int().optional().nullable(),
  customer_name: z.string().min(1).max(100),
  customer_phone: phoneSchema.optional(),
  customer_email: emailSchema,
  customer_address: z.string().max(200).optional().nullable(),

  booking_id: z.number().int().optional().nullable(),

  line_items: z.array(lineItemSchema).min(1, 'At least one line item required'),

  subtotal_cents: z.number().int().min(0),
  tax_cents: z.number().int().min(0).optional().default(0),
  discount_cents: z.number().int().min(0).optional().default(0),
  total_cents: z.number().int().min(0),

  due_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  payment_terms: z.string().max(100).optional().nullable(),
});

// ============================================
// CUSTOMER SCHEMAS
// ============================================

export const customerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: phoneSchema.optional(),
  email: emailSchema,
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(50).optional().nullable(),
  state: z.string().length(2).optional().default('IL'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
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
  booking_id: z.number().int().optional().nullable(),
  invoice_id: z.number().int().optional().nullable(),
  customer_name: z.string().min(1).max(100),
  customer_phone: phoneSchema.optional(),
  customer_email: emailSchema,
  amount_cents: z.number().int().min(1, 'Amount must be greater than 0'),
  description: z.string().min(1).max(200),
  type: z.enum(['booking', 'extension', 'overage', 'late_fee', 'invoice', 'custom']),
  payment_method: z.enum(['card', 'cash', 'check', 'venmo', 'zelle', 'other']),
  service_address: z.string().max(200).optional().nullable(),
  dumpster_size: z.string().max(50).optional().nullable(),
  rental_duration: z.string().max(50).optional().nullable(),
  delivery_date: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
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
