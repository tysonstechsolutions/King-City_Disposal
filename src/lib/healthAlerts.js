// ============================================
// HEALTH ALERT SYSTEM
// ============================================
// Sends notifications when critical services fail
// Can be extended to support SMS, Slack, Discord, etc.

import { logger } from './logger';

/**
 * Send health alert email when critical services fail
 * @param {Object} healthCheck - Health check results
 * @param {string} alertEmail - Email to send alerts to
 */
export async function sendHealthAlert(healthCheck, alertEmail) {
  // Only alert on unhealthy status (not degraded)
  if (healthCheck.overall_status !== 'unhealthy') {
    return;
  }

  // Check if we have Resend configured
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !alertEmail) {
    logger.warn('Health alerts not configured - missing RESEND_API_KEY or alert email');
    return;
  }

  try {
    const criticalErrors = healthCheck.errors || [];
    const unhealthyServices = Object.entries(healthCheck.services)
      .filter(([_, service]) => service.status === 'unhealthy')
      .map(([name, service]) => ({ name, error: service.error }));

    // Build email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px; }
          .service { background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px; margin: 10px 0; }
          .timestamp { color: #666; font-size: 12px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 King City Disposal - System Health Alert</h1>
          <p class="timestamp">Alert Time: ${new Date().toLocaleString()}</p>
        </div>

        <h2>Critical Services Down</h2>
        <p><strong>Overall Status:</strong> <span style="color: #dc2626; font-weight: bold;">UNHEALTHY</span></p>

        <h3>Critical Errors (${criticalErrors.length})</h3>
        ${criticalErrors.map(error => `<p style="color: #dc2626;">• ${error}</p>`).join('')}

        <h3>Unhealthy Services</h3>
        ${unhealthyServices.map(({ name, error }) => `
          <div class="service">
            <strong>${name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong><br>
            <span style="color: #991b1b; font-family: monospace; font-size: 11px;">${error || 'Unknown error'}</span>
          </div>
        `).join('')}

        <div class="footer">
          <p><strong>Action Required:</strong> Please check your King City Disposal admin dashboard at <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://kingcitydisposal.com'}/admin/health">/admin/health</a></p>
          <p>This is an automated alert from your King City Disposal system health monitor.</p>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'King City Disposal Alerts <alerts@kingcitydisposal.com>',
        to: alertEmail,
        subject: `🚨 URGENT: System Health Alert - ${unhealthyServices.length} Services Down`,
        html: emailHtml,
      }),
    });

    if (response.ok) {
      logger.info('Health alert sent successfully', { email: alertEmail, services: unhealthyServices.length });
    } else {
      const errorText = await response.text();
      logger.error('Failed to send health alert', null, { error: errorText });
    }

  } catch (error) {
    logger.error('Health alert error', error);
  }
}

/**
 * Check if we should send an alert based on last alert time
 * Prevents alert spam by only sending once per hour
 * @param {string} key - Alert key (e.g., 'health_check')
 */
const lastAlertTimes = new Map();

export function shouldSendAlert(key, cooldownMinutes = 60) {
  const now = Date.now();
  const lastAlert = lastAlertTimes.get(key);

  if (!lastAlert) {
    lastAlertTimes.set(key, now);
    return true;
  }

  const minutesSinceLastAlert = (now - lastAlert) / 1000 / 60;
  if (minutesSinceLastAlert >= cooldownMinutes) {
    lastAlertTimes.set(key, now);
    return true;
  }

  return false;
}

/**
 * Send Slack webhook alert (optional - if you use Slack)
 */
export async function sendSlackAlert(healthCheck) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) return;

  if (healthCheck.overall_status !== 'unhealthy') return;

  try {
    const unhealthyServices = Object.entries(healthCheck.services)
      .filter(([_, service]) => service.status === 'unhealthy')
      .map(([name]) => name);

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *King City Disposal - System Alert*`,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🚨 System Health Alert' }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Status:* UNHEALTHY\n*Time:* ${new Date().toLocaleString()}\n*Services Down:* ${unhealthyServices.length}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Unhealthy Services:*\n' + unhealthyServices.map(s => `• ${s}`).join('\n')
            }
          }
        ]
      }),
    });

    logger.info('Slack alert sent successfully');
  } catch (error) {
    logger.error('Slack alert error', error);
  }
}

export default {
  sendHealthAlert,
  sendSlackAlert,
  shouldSendAlert,
};
