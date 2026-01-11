// ============================================
// SIMPLE IN-MEMORY RATE LIMITER
// ============================================
// For production, use Redis-based rate limiting
// This provides basic protection against brute force

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.firstRequest > data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configuration
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests per window
 * @param {string} options.keyPrefix - Prefix for the rate limit key
 */
export function rateLimit({ windowMs = 60000, maxRequests = 10, keyPrefix = 'default' } = {}) {
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
    return { allowed: true, remaining: maxRequests - record.count };
  };
}

// Pre-configured rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyPrefix: 'auth',
});

export const bookingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 bookings per minute per IP
  keyPrefix: 'booking',
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
