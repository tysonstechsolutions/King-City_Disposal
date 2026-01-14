import { NextResponse } from 'next/server'
import {
  validatePassword,
  createSession,
  validateSession,
  invalidateSession,
  extractToken,
} from '../../../../lib/adminAuth'
import { authRateLimit } from '../../../../lib/rateLimit'
import { logger } from '../../../../lib/logger'

// POST - Login with password
export async function POST(request) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit (5 attempts per 15 minutes)
    const rateLimitResult = authRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rateLimitResult.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const { password } = await request.json()

    // validatePassword is now async
    const isValid = await validatePassword(password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // createSession is now async
    const { token, expiresAt } = await createSession()

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
    })

  } catch (error) {
    logger.error('Admin auth error', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// GET - Validate session token
export async function GET(request) {
  try {
    const token = extractToken(request)

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    // validateSession is now async
    const isValid = await validateSession(token)
    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json({ valid: true })

  } catch (error) {
    logger.error('Token validation error', error)
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    )
  }
}

// DELETE - Logout (invalidate token)
export async function DELETE(request) {
  try {
    const token = extractToken(request)
    await invalidateSession(token)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}
