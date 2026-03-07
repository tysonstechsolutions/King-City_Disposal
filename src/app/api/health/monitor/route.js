// ============================================
// AUTOMATED HEALTH MONITORING ENDPOINT
// ============================================
// This endpoint performs health checks and sends alerts automatically
// Call this from a cron job or monitoring service (UptimeRobot, etc.)
//
// SETUP INSTRUCTIONS:
// 1. Set HEALTH_ALERT_EMAIL environment variable to your email
// 2. Optional: Set SLACK_WEBHOOK_URL for Slack notifications
// 3. Set up a cron job or UptimeRobot to call this endpoint every 5-15 minutes:
//    https://kingcitydisposal.com/api/health/monitor
//
// Free monitoring options:
// - UptimeRobot (https://uptimerobot.com) - Call this URL every 5 min
// - Cron-job.org (https://cron-job.org) - Scheduled HTTP requests
// - Vercel Cron Jobs (if using Vercel) - See vercel.json configuration

import { NextResponse } from 'next/server';
import { config } from '../../../../config';
import { callClaudeWithFallback } from '../../../../lib/claudeModels';
import { sendHealthAlert, sendSlackAlert, shouldSendAlert } from '../../../../lib/healthAlerts';
import { logger } from '../../../../lib/logger';

export async function GET() {
  const startTime = Date.now();
  const checks = {
    timestamp: new Date().toISOString(),
    overall_status: 'healthy',
    services: {},
    warnings: [],
    errors: [],
  };

  // ============================================
  // 1. CHECK SUPABASE DATABASE
  // ============================================
  try {
    const supabaseUrl = config.supabase.url;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/bookings?select=id&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    checks.services.supabase_database = {
      status: dbResponse.ok ? 'healthy' : 'unhealthy',
      response_time_ms: Date.now() - startTime,
      error: dbResponse.ok ? null : `HTTP ${dbResponse.status}`,
    };

    if (!dbResponse.ok) {
      checks.overall_status = 'unhealthy';
      checks.errors.push('Supabase database connection failed');
    }
  } catch (error) {
    checks.services.supabase_database = {
      status: 'unhealthy',
      error: error.message,
    };
    checks.overall_status = 'unhealthy';
    checks.errors.push('Supabase database error: ' + error.message);
  }

  // ============================================
  // 2. CHECK SUPABASE STORAGE BUCKET
  // ============================================
  try {
    const supabaseUrl = config.supabase.url;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

    const storageResponse = await fetch(`${supabaseUrl}/storage/v1/bucket/documents`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    const bucketExists = storageResponse.ok;
    checks.services.supabase_storage = {
      status: bucketExists ? 'healthy' : 'unhealthy',
      bucket_name: 'documents',
      error: bucketExists ? null : 'Bucket "documents" not found or not accessible',
    };

    if (!bucketExists) {
      checks.overall_status = 'degraded';
      checks.warnings.push('Storage bucket "documents" missing - document uploads will fail');
    }
  } catch (error) {
    checks.services.supabase_storage = {
      status: 'unhealthy',
      error: error.message,
    };
    checks.overall_status = 'degraded';
    checks.warnings.push('Storage check failed: ' + error.message);
  }

  // ============================================
  // 3. CHECK CLAUDE AI API WITH FALLBACK
  // ============================================
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const claudeResult = await callClaudeWithFallback({
        apiKey: anthropicKey,
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 10,
      });

      if (claudeResult.success) {
        checks.services.claude_ai = {
          status: 'healthy',
          model: claudeResult.model,
          fallback_available: true,
          error: null,
        };
      } else {
        checks.services.claude_ai = {
          status: 'unhealthy',
          error: claudeResult.error || 'All models failed',
        };
        checks.overall_status = 'degraded';
        checks.warnings.push('Claude AI unavailable - document parsing will fail');
      }
    } catch (error) {
      checks.services.claude_ai = {
        status: 'unhealthy',
        error: error.message,
      };
      checks.overall_status = 'degraded';
      checks.warnings.push('Claude AI error: ' + error.message);
    }
  } else {
    checks.services.claude_ai = {
      status: 'not_configured',
      error: 'ANTHROPIC_API_KEY not set',
    };
    checks.warnings.push('Claude AI not configured - document parsing disabled');
  }

  // ============================================
  // 4. CHECK STRIPE API (CRITICAL)
  // ============================================
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const stripeResponse = await fetch('https://api.stripe.com/v1/customers?limit=1', {
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
        },
      });

      checks.services.stripe = {
        status: stripeResponse.ok ? 'healthy' : 'unhealthy',
        error: stripeResponse.ok ? null : `HTTP ${stripeResponse.status}`,
      };

      if (!stripeResponse.ok) {
        checks.overall_status = 'unhealthy';
        checks.errors.push('Stripe API failed - payments will not work');
      }
    } catch (error) {
      checks.services.stripe = {
        status: 'unhealthy',
        error: error.message,
      };
      checks.overall_status = 'unhealthy';
      checks.errors.push('Stripe error: ' + error.message);
    }
  } else {
    checks.services.stripe = {
      status: 'not_configured',
      error: 'STRIPE_SECRET_KEY not set',
    };
    checks.warnings.push('Stripe not configured - payments disabled');
  }

  // ============================================
  // OVERALL HEALTH DETERMINATION
  // ============================================
  const totalTime = Date.now() - startTime;
  checks.response_time_ms = totalTime;

  const serviceStatuses = Object.values(checks.services).map(s => s.status);
  const unhealthyCount = serviceStatuses.filter(s => s === 'unhealthy').length;

  if (unhealthyCount > 0) {
    checks.overall_status = 'unhealthy';
  } else if (checks.warnings.length > 0) {
    checks.overall_status = 'degraded';
  }

  checks.summary = {
    total_services: serviceStatuses.length,
    healthy: serviceStatuses.filter(s => s === 'healthy').length,
    unhealthy: unhealthyCount,
    not_configured: serviceStatuses.filter(s => s === 'not_configured').length,
  };

  // ============================================
  // SEND ALERTS IF UNHEALTHY (with cooldown)
  // ============================================
  if (checks.overall_status === 'unhealthy' && shouldSendAlert('health_monitor', 60)) {
    const alertEmail = process.env.HEALTH_ALERT_EMAIL;

    if (alertEmail) {
      try {
        await sendHealthAlert(checks, alertEmail);
        logger.info('Health alert sent', { status: checks.overall_status, email: alertEmail });
      } catch (error) {
        logger.error('Failed to send health alert', error);
      }
    }

    // Optional: Send Slack alert
    try {
      await sendSlackAlert(checks);
    } catch (error) {
      logger.error('Failed to send Slack alert', error);
    }
  }

  // Return appropriate HTTP status
  const httpStatus = checks.overall_status === 'healthy' ? 200 :
                     checks.overall_status === 'degraded' ? 207 : 503;

  return NextResponse.json(checks, { status: httpStatus });
}
