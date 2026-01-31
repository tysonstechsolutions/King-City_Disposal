// ============================================
// ADMIN AUTHENTICATION UTILITIES
// ============================================
// Supabase-backed session management for admin routes
// Works reliably in serverless environments
// ============================================

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config'

const SESSION_EXPIRY_HOURS = 24
const supabaseUrl = config.supabase.url
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey

// Generate a session token
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Create a new session (stored in Supabase)
export async function createSession() {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/admin_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        token,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      // Table might not exist - fall back to token-only validation
      return { token, expiresAt: new Date(expiresAt).getTime(), fallback: true }
    }

    return { token, expiresAt: new Date(expiresAt).getTime() }
  } catch {
    // On error, still return a token (degraded mode)
    return { token, expiresAt: new Date(expiresAt).getTime(), fallback: true }
  }
}

// Validate a session token (checks Supabase)
export async function validateSession(token) {
  if (!token) return false

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${token}&expires_at=gt.${new Date().toISOString()}&select=token`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    )

    if (!response.ok) {
      // Table might not exist - validate using HMAC fallback
      return validateTokenFallback(token)
    }

    const sessions = await response.json()
    return sessions.length > 0
  } catch {
    // On error, use fallback validation
    return validateTokenFallback(token)
  }
}

// Fallback validation using HMAC (if Supabase table doesn't exist)
// This is more secure than just format checking - uses server secret
function validateTokenFallback(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return false
  }

  // Use environment secret for additional validation
  // Token must have been generated within the last 24 hours
  const secret = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || 'fallback-secret'

  // Extract timestamp from token (first 8 chars can encode creation time)
  // Since our tokens are random, we cannot validate expiry in fallback mode
  // Log this situation for monitoring
  console.warn('Using fallback token validation - admin_sessions table may not exist')

  // In fallback mode, we're more restrictive - require the session table
  // Return false to force proper database setup
  return false
}

// Invalidate a session
export async function invalidateSession(token) {
  if (!token) return

  try {
    await fetch(`${supabaseUrl}/rest/v1/admin_sessions?token=eq.${token}`, {
      method: 'DELETE',
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    })
  } catch {
    // Ignore errors on logout
  }
}

// Clean up expired sessions (call periodically via cron)
export async function cleanupSessions() {
  try {
    await fetch(`${supabaseUrl}/rest/v1/admin_sessions?expires_at=lt.${new Date().toISOString()}`, {
      method: 'DELETE',
      headers: {
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
      },
    })
  } catch {
    // Ignore cleanup errors
  }
}

// Validate admin password with bcrypt (secure hashing required)
export async function validatePassword(password) {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH

  if (!adminPasswordHash) {
    console.error('ADMIN_PASSWORD_HASH environment variable is not set. Admin login disabled.')
    return false
  }

  // Use bcrypt to compare password with stored hash
  try {
    return await bcrypt.compare(password, adminPasswordHash)
  } catch (error) {
    console.error('Password validation error:', error.message)
    return false
  }
}

// Helper to generate a password hash (run once to get hash for env var)
export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

// Extract token from authorization header
export function extractToken(request) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice(7)
}

// Validate admin request (checks token from authorization header)
export async function validateAdminRequest(request) {
  const token = extractToken(request)
  return await validateSession(token)
}

// Middleware-style validation that returns error response if invalid
export async function requireAdminAuth(request) {
  const isValid = await validateAdminRequest(request)
  if (!isValid) {
    return {
      authorized: false,
      error: 'Unauthorized',
      status: 401,
    }
  }

  return { authorized: true }
}
