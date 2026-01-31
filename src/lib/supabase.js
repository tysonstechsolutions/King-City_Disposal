// ============================================
// SUPABASE CLIENT UTILITIES
// ============================================
// Centralized Supabase configuration for API routes
// Uses REST API for serverless compatibility
// ============================================

import { config } from '../config'

const SUPABASE_URL = config.supabase.url

/**
 * Get the Supabase API key with proper priority
 * Service role key takes precedence for server-side operations
 */
export function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey
}

/**
 * Get standard headers for Supabase REST API requests
 */
export function getSupabaseHeaders(options = {}) {
  const key = getSupabaseKey()
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    ...options,
  }

  return headers
}

/**
 * Get headers for POST/PATCH/PUT requests (includes Content-Type)
 */
export function getSupabaseWriteHeaders(options = {}) {
  return {
    ...getSupabaseHeaders(options),
    'Content-Type': 'application/json',
  }
}

/**
 * Get headers that return the created/updated record
 */
export function getSupabaseUpsertHeaders(options = {}) {
  return {
    ...getSupabaseWriteHeaders(options),
    'Prefer': 'return=representation',
  }
}

/**
 * Build a Supabase REST API URL
 * @param {string} table - Table name
 * @param {string} [query] - Optional query string (without leading ?)
 */
export function buildSupabaseUrl(table, query = '') {
  const baseUrl = `${SUPABASE_URL}/rest/v1/${table}`
  return query ? `${baseUrl}?${query}` : baseUrl
}

/**
 * Execute a Supabase REST API query with consistent error handling
 */
export async function supabaseQuery(table, options = {}) {
  const {
    method = 'GET',
    query = '',
    body = null,
    returnData = true,
  } = options

  const url = buildSupabaseUrl(table, query)
  const headers = method === 'GET'
    ? getSupabaseHeaders()
    : returnData
      ? getSupabaseUpsertHeaders()
      : getSupabaseWriteHeaders()

  const fetchOptions = {
    method,
    headers,
  }

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Supabase ${method} ${table} failed: ${response.status} - ${errorText}`)
  }

  // For DELETE or when no data expected
  if (method === 'DELETE' && !returnData) {
    return { success: true }
  }

  // Parse JSON response
  const data = await response.json()
  return data
}

/**
 * Convenience method for SELECT queries
 */
export async function supabaseSelect(table, query = '') {
  return supabaseQuery(table, { method: 'GET', query })
}

/**
 * Convenience method for INSERT queries
 */
export async function supabaseInsert(table, data, returnData = true) {
  return supabaseQuery(table, { method: 'POST', body: data, returnData })
}

/**
 * Convenience method for UPDATE queries
 */
export async function supabaseUpdate(table, query, data, returnData = true) {
  return supabaseQuery(table, { method: 'PATCH', query, body: data, returnData })
}

/**
 * Convenience method for DELETE queries
 */
export async function supabaseDelete(table, query, returnData = false) {
  return supabaseQuery(table, { method: 'DELETE', query, returnData })
}

// Export URL for direct use where needed
export const supabaseUrl = SUPABASE_URL
