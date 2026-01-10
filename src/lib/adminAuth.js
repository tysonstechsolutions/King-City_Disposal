// ============================================
// ADMIN AUTHENTICATION UTILITIES
// ============================================
// Shared session management for admin routes
// ============================================

import crypto from 'crypto'

// In-memory session store (use Redis in production for multi-instance)
// Note: In serverless, sessions may not persist across cold starts
// For production, consider using a database or Redis
const sessions = new Map()
const SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

// Clean up expired sessions
export function cleanupSessions() {
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token)
    }
  }
}

// Generate a session token
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Create a new session
export function createSession() {
  const token = generateSessionToken()
  const expiresAt = Date.now() + SESSION_EXPIRY

  sessions.set(token, { expiresAt, createdAt: Date.now() })
  cleanupSessions()

  return { token, expiresAt }
}

// Validate a session token
export function validateSession(token) {
  if (!token) return false

  const session = sessions.get(token)
  if (!session) return false

  if (Date.now() > session.expiresAt) {
    sessions.delete(token)
    return false
  }

  return true
}

// Invalidate a session
export function invalidateSession(token) {
  if (token) {
    sessions.delete(token)
  }
}

// Validate admin password
export function validatePassword(password) {
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable not set')
    return false
  }

  return password === adminPassword
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
export function validateAdminRequest(request) {
  const token = extractToken(request)
  return validateSession(token)
}

// Middleware-style validation that returns error response if invalid
export function requireAdminAuth(request) {
  if (!validateAdminRequest(request)) {
    return {
      authorized: false,
      error: 'Unauthorized',
      status: 401,
    }
  }

  return { authorized: true }
}
