// ============================================
// LOGGING LIBRARY
// ============================================
// Centralized logging for consistent error tracking
// Ready for Sentry integration when needed
// ============================================

const isDev = process.env.NODE_ENV === 'development';

// Log levels
const LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Current log level (can be set via env var)
const currentLevel = LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? (isDev ? LEVELS.DEBUG : LEVELS.INFO);

// Format log message
function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0
    ? ` | ${JSON.stringify(context)}`
    : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

// Sanitize sensitive data
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'api_key', 'auth', 'authorization', 'credit_card', 'ssn'];
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }

  return sanitized;
}

// ============================================
// LOGGER OBJECT
// ============================================
export const logger = {
  debug(message, context = {}) {
    if (currentLevel <= LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message, sanitize(context)));
    }
  },

  info(message, context = {}) {
    if (currentLevel <= LEVELS.INFO) {
      console.info(formatMessage('INFO', message, sanitize(context)));
    }
  },

  warn(message, context = {}) {
    if (currentLevel <= LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, sanitize(context)));
    }
  },

  error(message, error = null, context = {}) {
    if (currentLevel <= LEVELS.ERROR) {
      const errorContext = {
        ...sanitize(context),
        ...(error && {
          error_name: error.name,
          error_message: error.message,
          error_stack: isDev ? error.stack : undefined,
        }),
      };
      console.error(formatMessage('ERROR', message, errorContext));

      // TODO: Send to Sentry when configured
      // if (process.env.SENTRY_DSN) {
      //   Sentry.captureException(error, { extra: context });
      // }
    }
  },

  // Log API request
  apiRequest(method, path, context = {}) {
    this.info(`API ${method} ${path}`, context);
  },

  // Log API response
  apiResponse(method, path, status, duration, context = {}) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this[level](`API ${method} ${path} -> ${status} (${duration}ms)`, context);
  },

  // Log database operation
  db(operation, table, context = {}) {
    this.debug(`DB ${operation} ${table}`, context);
  },

  // Log external service call
  external(service, operation, context = {}) {
    this.info(`External ${service}: ${operation}`, context);
  },

  // Log notification sent
  notification(type, recipient, success, context = {}) {
    const level = success ? 'info' : 'warn';
    this[level](`Notification ${type} to ${recipient}: ${success ? 'sent' : 'failed'}`, context);
  },

  // Log payment event
  payment(event, amount, context = {}) {
    this.info(`Payment ${event}: $${(amount / 100).toFixed(2)}`, context);
  },

  // Log cron job
  cron(jobName, status, context = {}) {
    this.info(`Cron ${jobName}: ${status}`, context);
  },
};

// ============================================
// TIMING HELPER
// ============================================
export function withTiming(label, fn) {
  return async (...args) => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      logger.debug(`${label} completed`, { duration_ms: Date.now() - start });
      return result;
    } catch (error) {
      logger.error(`${label} failed`, error, { duration_ms: Date.now() - start });
      throw error;
    }
  };
}

// ============================================
// API MIDDLEWARE HELPER
// ============================================
export function logApiRoute(handler) {
  return async (request, context) => {
    const start = Date.now();
    const method = request.method;
    const path = new URL(request.url).pathname;

    logger.apiRequest(method, path);

    try {
      const response = await handler(request, context);
      logger.apiResponse(method, path, response.status, Date.now() - start);
      return response;
    } catch (error) {
      logger.error(`API ${method} ${path} threw error`, error);
      throw error;
    }
  };
}

export default logger;
