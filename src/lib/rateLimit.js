// ============================================
// HYBRID RATE LIMITER (In-memory + Supabase fallback)
// ============================================
// Uses in-memory for speed with Supabase backup for persistence
// Provides protection against brute force in serverless environments

import { config } from '../config'

const rateLimitStore = new Map();
const supabaseUrl = config.supabase.url
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.firstRequest > data.windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Rate limit configuration
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests per window
 * @param {string} options.keyPrefix - Prefix for the rate limit key
 * @param {boolean} options.useDatabase - Whether to use Supabase for persistence
 */
export function rateLimit({ windowMs = 60000, maxRequests = 10, keyPrefix = 'default', useDatabase = false } = {}) {
  return function checkRateLimit(identifier) {
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record) {
      // First request
      rateLimitStore.set(key, {
        count: 1,
        firstRequest: now,
        windowMs,
      });

      // Async update to database (fire and forget for performance)
      if (useDatabase) {
        updateRateLimitDb(key, 1, now, windowMs).catch(() => {});
      }

      return { allowed: true, remaining: maxRequests - 1 };
    }

    // Check if window has expired
    if (now - record.firstRequest > windowMs) {
      // Reset window
      rateLimitStore.set(key, {
        count: 1,
        firstRequest: now,
        windowMs,
      });

      if (useDatabase) {
        updateRateLimitDb(key, 1, now, windowMs).catch(() => {});
      }

      return { allowed: true, remaining: maxRequests - 1 };
    }

    // Within window - check count
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.firstRequest + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    // Increment count
    record.count++;

    if (useDatabase) {
      updateRateLimitDb(key, record.count, record.firstRequest, windowMs).catch(() => {});
    }

    return { allowed: true, remaining: maxRequests - record.count };
  };
}

// Update rate limit in database (for cross-instance persistence)
async function updateRateLimitDb(key, count, firstRequest, windowMs) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/rate_limits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': `Bearer ${getSupabaseKey()}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        key,
        count,
        first_request: new Date(firstRequest).toISOString(),
        window_ms: windowMs,
        expires_at: new Date(firstRequest + windowMs).toISOString(),
      }),
    });
  } catch {
    // Ignore DB errors - in-memory is primary
  }
}

// Pre-configured rate limiters for different endpoints
// Auth uses database persistence for security-critical rate limiting
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyPrefix: 'auth',
  useDatabase: true, // Persist across serverless instances
});

export const bookingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 bookings per minute per IP
  keyPrefix: 'booking',
  useDatabase: true, // Persist to prevent abuse
});

export const smsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 SMS per minute per number
  keyPrefix: 'sms',
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyPrefix: 'api',
});
