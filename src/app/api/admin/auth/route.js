import { NextResponse } from 'next/server'
import {
  validatePassword,
  createSession,
  validateSession,
  invalidateSession,
  extractToken,
} from '../../../../lib/adminAuth'

// POST - Login with password
export async function POST(request) {
  try {
    const { password } = await request.json()

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Create session
    const { token, expiresAt } = createSession()

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
    })

  } catch (error) {
    console.error('Admin auth error:', error)
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

    if (!validateSession(token)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json({ valid: true })

  } catch (error) {
    console.error('Token validation error:', error)
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
    invalidateSession(token)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: true })
  }
}
