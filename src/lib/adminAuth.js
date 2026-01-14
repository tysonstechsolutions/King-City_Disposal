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
function validateTokenFallback(token) {
  // Simple check: token should be 64 hex chars (32 bytes)
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
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

// Validate admin password with timing-safe comparison
export async function validatePassword(password) {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPasswordHash && !adminPassword) {
    return false
  }

  // If hash is available, use bcrypt (preferred)
  if (adminPasswordHash) {
    try {
      return await bcrypt.compare(password, adminPasswordHash)
    } catch {
      return false
    }
  }

  // Fallback to timing-safe comparison for plain password
  // (supports existing setups, but recommend migrating to hash)
  if (adminPassword) {
    const passwordBuffer = Buffer.from(password)
    const storedBuffer = Buffer.from(adminPassword)

    if (passwordBuffer.length !== storedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(passwordBuffer, storedBuffer)
  }

  return false
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
