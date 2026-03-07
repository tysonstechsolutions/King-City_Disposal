// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
// Tests all critical services and APIs
// Use this to monitor if your website is working properly

import { NextResponse } from 'next/server';
import { config } from '../../../config';
import { callClaudeWithFallback, getBestClaudeModel } from '../../../lib/claudeModels';

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
  // 3. CHECK CLAUDE AI API WITH FALLBACK MODELS
  // ============================================
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      // Test with fallback system (minimal request)
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
  // 4. CHECK STRIPE API
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
  // 5. CHECK TWILIO SMS
  // ============================================
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;

  if (twilioSid && twilioToken) {
    try {
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json?PageSize=1`,
        {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
          },
        }
      );

      checks.services.twilio = {
        status: twilioResponse.ok ? 'healthy' : 'unhealthy',
        error: twilioResponse.ok ? null : `HTTP ${twilioResponse.status}`,
      };

      if (!twilioResponse.ok) {
        checks.overall_status = 'degraded';
        checks.warnings.push('Twilio SMS unavailable - notifications will fail');
      }
    } catch (error) {
      checks.services.twilio = {
        status: 'unhealthy',
        error: error.message,
      };
      checks.overall_status = 'degraded';
      checks.warnings.push('Twilio error: ' + error.message);
    }
  } else {
    checks.services.twilio = {
      status: 'not_configured',
      error: 'TWILIO credentials not set',
    };
    checks.warnings.push('Twilio not configured - SMS disabled');
  }

  // ============================================
  // 6. CHECK RESEND EMAIL
  // ============================================
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
        },
      });

      checks.services.resend_email = {
        status: resendResponse.ok ? 'healthy' : 'unhealthy',
        error: resendResponse.ok ? null : `HTTP ${resendResponse.status}`,
      };

      if (!resendResponse.ok) {
        checks.overall_status = 'degraded';
        checks.warnings.push('Resend Email unavailable - email notifications will fail');
      }
    } catch (error) {
      checks.services.resend_email = {
        status: 'unhealthy',
        error: error.message,
      };
      checks.overall_status = 'degraded';
      checks.warnings.push('Resend error: ' + error.message);
    }
  } else {
    checks.services.resend_email = {
      status: 'not_configured',
      error: 'RESEND_API_KEY not set',
    };
    checks.warnings.push('Resend not configured - emails disabled');
  }

  // ============================================
  // OVERALL HEALTH DETERMINATION
  // ============================================
  const totalTime = Date.now() - startTime;
  checks.response_time_ms = totalTime;

  // Count service statuses
  const serviceStatuses = Object.values(checks.services).map(s => s.status);
  const unhealthyCount = serviceStatuses.filter(s => s === 'unhealthy').length;
  const notConfiguredCount = serviceStatuses.filter(s => s === 'not_configured').length;

  if (unhealthyCount > 0) {
    checks.overall_status = 'unhealthy';
  } else if (checks.warnings.length > 0) {
    checks.overall_status = 'degraded';
  }

  // Add summary
  checks.summary = {
    total_services: serviceStatuses.length,
    healthy: serviceStatuses.filter(s => s === 'healthy').length,
    unhealthy: unhealthyCount,
    not_configured: notConfiguredCount,
  };

  // Return appropriate HTTP status
  const httpStatus = checks.overall_status === 'healthy' ? 200 :
                     checks.overall_status === 'degraded' ? 207 : 503;

  return NextResponse.json(checks, { status: httpStatus });
}
