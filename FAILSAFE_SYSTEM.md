# King City Disposal - Failsafe System Documentation

## Overview

This failsafe system prevents your website from breaking when external services (Supabase, Claude AI, Stripe, etc.) update their APIs or deprecate features. It provides:

1. **Automatic Claude Model Fallbacks** - Tries multiple AI models if one fails
2. **Health Monitoring** - Checks all critical services continuously
3. **Automated Alerts** - Emails you when services go down
4. **Admin Dashboard** - Visual monitoring interface

---

## 🛡️ What Problems Does This Solve?

### Before Failsafes:
- ❌ Claude updates their API → All AI parsing breaks → Website stops working
- ❌ Supabase changes policies → Storage uploads fail → No error notification
- ❌ You discover issues days later when customers complain

### After Failsafes:
- ✅ Claude deprecates a model → Automatically tries older models → Still works
- ✅ Storage bucket deleted → Health check detects it → You get emailed immediately
- ✅ Any service fails → Instant notification → Fix before customers notice

---

## 📁 Files Created

### 1. Claude Model Fallback System
**File:** `src/lib/claudeModels.js`

**What it does:**
- Maintains a list of Claude AI models (newest to oldest)
- Automatically tries backup models if primary fails
- Logs which model succeeded
- Prevents total breakage when Claude updates

**Models in order:**
1. `claude-sonnet-4-5-20250929` (Primary - fastest, newest)
2. `claude-opus-4-5-20251101` (Primary - most powerful)
3. `claude-3-5-sonnet-20241022` (Fallback)
4. `claude-3-5-sonnet-20240620` (Fallback)
5. `claude-3-opus-20240229` (Fallback - oldest but reliable)

**Usage Example:**
```javascript
import { callClaudeWithFallback } from './lib/claudeModels';

const result = await callClaudeWithFallback({
  apiKey: process.env.ANTHROPIC_API_KEY,
  messages: [{ role: 'user', content: 'Parse this invoice...' }],
  maxTokens: 4000,
});

if (result.success) {
  console.log('Used model:', result.model);
  const data = result.data;
} else {
  console.error('All models failed:', result.error);
}
```

### 2. Health Check API
**File:** `src/app/api/health/route.js`

**Endpoint:** `https://kingcitydisposal.com/api/health`

**What it checks:**
- ✓ Supabase database connection
- ✓ Supabase Storage bucket ("documents")
- ✓ Claude AI API (with fallback models)
- ✓ Stripe payment API
- ✓ Twilio SMS service
- ✓ Resend email service

**Response Example:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "overall_status": "healthy",
  "services": {
    "supabase_database": { "status": "healthy", "response_time_ms": 45 },
    "supabase_storage": { "status": "healthy", "bucket_name": "documents" },
    "claude_ai": { "status": "healthy", "model": "claude-sonnet-4-5-20250929", "fallback_available": true },
    "stripe": { "status": "healthy" },
    "twilio": { "status": "healthy" },
    "resend_email": { "status": "healthy" }
  },
  "errors": [],
  "warnings": [],
  "summary": {
    "total_services": 6,
    "healthy": 6,
    "unhealthy": 0,
    "not_configured": 0
  }
}
```

### 3. Admin Health Dashboard
**File:** `src/app/admin/health/page.js`

**URL:** `https://kingcitydisposal.com/admin/health`

**Features:**
- Visual status indicators (green/yellow/red)
- Real-time service status
- Auto-refresh option (30 seconds)
- Shows errors and warnings
- Response times
- Which Claude model is working

**Screenshot description:**
- Overall status banner (color-coded)
- Critical errors section (red)
- Warnings section (yellow)
- Individual service cards with details
- Summary statistics

### 4. Alert System
**File:** `src/lib/healthAlerts.js`

**What it does:**
- Sends email when critical services fail
- Prevents alert spam (60-minute cooldown)
- Optional Slack webhook support
- Detailed error reports

### 5. Automated Monitoring Endpoint
**File:** `src/app/api/health/monitor/route.js`

**Endpoint:** `https://kingcitydisposal.com/api/health/monitor`

**What it does:**
- Performs health check
- Automatically sends alerts if unhealthy
- Designed for cron jobs / UptimeRobot
- Includes alert cooldown (won't spam)

---

## ⚙️ Setup Instructions

### Step 1: Environment Variables

Add these to your `.env.local` file:

```bash
# Required - Already configured
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
STRIPE_SECRET_KEY=sk_live_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
RESEND_API_KEY=re_...

# NEW - Add this for alerts
HEALTH_ALERT_EMAIL=your-email@example.com

# Optional - For Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Step 2: Set Up Automated Monitoring

Choose ONE of these free options:

#### Option A: UptimeRobot (Recommended - Free, Easy)

1. Go to https://uptimerobot.com (free account)
2. Create new monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** `https://kingcitydisposal.com/api/health/monitor`
   - **Monitoring Interval:** 5 minutes
   - **Alert Contacts:** Your email
3. Done! It will call your endpoint every 5 minutes and email you if it gets errors

#### Option B: Cron-job.org (Free)

1. Go to https://cron-job.org (free account)
2. Create new cron job:
   - **URL:** `https://kingcitydisposal.com/api/health/monitor`
   - **Schedule:** Every 5 minutes
3. Emails are sent by your alert system (not cron-job.org)

#### Option C: Vercel Cron Jobs (If using Vercel)

Create `vercel.json` in your project root:

```json
{
  "crons": [{
    "path": "/api/health/monitor",
    "schedule": "*/5 * * * *"
  }]
}
```

### Step 3: Test the System

1. **Test health check manually:**
   ```bash
   curl https://kingcitydisposal.com/api/health
   ```

2. **View admin dashboard:**
   - Go to https://kingcitydisposal.com/admin/health
   - Should show all services as "healthy" (green)

3. **Test alerts (optional):**
   - Temporarily break something (e.g., wrong API key)
   - Wait for monitoring to run
   - Check your email for alert

---

## 🚨 What Happens When Services Fail?

### Scenario 1: Claude AI Deprecates Primary Model

**What happens:**
1. Document parsing tries `claude-sonnet-4-5-20250929`
2. Gets 404 error (model not found)
3. Automatically tries `claude-opus-4-5-20251101`
4. If that fails, tries `claude-3-5-sonnet-20241022`
5. Continues until a model works
6. Logs which model succeeded
7. ✅ **Website keeps working**

**You see:**
- Health dashboard shows: "Model: claude-3-5-sonnet-20241022"
- No alert (because fallback worked)

**Action needed:**
- Update PRIMARY models in `src/lib/claudeModels.js` when convenient

### Scenario 2: Supabase Storage Bucket Deleted

**What happens:**
1. Health monitor runs (every 5 minutes)
2. Detects storage bucket missing
3. Status changes to "degraded"
4. Sends email alert to HEALTH_ALERT_EMAIL
5. Dashboard shows error

**You receive:**
- Email: "🚨 URGENT: System Health Alert - Storage bucket missing"
- Shows exact error message
- Link to admin dashboard

**Action needed:**
1. Go to Supabase dashboard
2. Recreate "documents" bucket (instructions in email)
3. Set proper policies
4. Verify on dashboard

### Scenario 3: Stripe API Down

**What happens:**
1. Health monitor detects Stripe failure
2. Status: "unhealthy" (critical service)
3. **Immediate email alert**
4. Website shows payment error to customers

**You receive:**
- Email: "🚨 URGENT: System Health Alert - Stripe API failed"
- Detailed error message

**Action needed:**
1. Check Stripe status page
2. Verify API keys
3. Wait for Stripe to resolve if it's their issue

---

## 📊 Reading the Health Dashboard

### Status Colors

- **Green (Healthy):** Service working perfectly
- **Yellow (Degraded):** Service has warnings but functional
- **Red (Unhealthy):** Service completely down
- **Gray (Not Configured):** Service not set up (e.g., no API key)

### Service Details

Each service shows:
- **Status badge:** Current state
- **Model/Bucket info:** Which resources are being used
- **Response time:** How long requests take
- **Error message:** What went wrong (if any)

### Summary Stats

Bottom panel shows:
- Total services monitored
- How many healthy
- How many unhealthy
- How many not configured

---

## 🔧 Maintenance

### Updating Claude Models

When Claude releases new models:

1. Open `src/lib/claudeModels.js`
2. Add new model to `PRIMARY` array:
   ```javascript
   PRIMARY: [
     'claude-sonnet-5-0-20260101',  // NEW model
     'claude-sonnet-4-5-20250929',
     'claude-opus-4-5-20251101',
   ],
   ```
3. Deploy changes
4. Old models remain as fallbacks

### Testing Individual Services

You can test each service separately:

```bash
# Test database
curl "https://yourproject.supabase.co/rest/v1/bookings?select=id&limit=1" \
  -H "apikey: YOUR_KEY" \
  -H "Authorization: Bearer YOUR_KEY"

# Test storage
curl "https://yourproject.supabase.co/storage/v1/bucket/documents" \
  -H "Authorization: Bearer YOUR_KEY"

# Test Stripe
curl "https://api.stripe.com/v1/customers?limit=1" \
  -H "Authorization: Bearer YOUR_STRIPE_KEY"
```

---

## 🎯 Best Practices

### 1. Check Dashboard Regularly
- Visit `/admin/health` once a week
- Look for yellow warnings (fix before they become red)

### 2. Don't Ignore Alerts
- Email alerts = something critical is down
- Fix immediately or website may break

### 3. Update Models Proactively
- When Claude announces new models, add them
- When they announce deprecations, test fallbacks

### 4. Test After Deployment
- After deploying changes, check `/admin/health`
- Verify all services still green

### 5. Keep Logs
- Health check logs to console
- Review logs if issues occur

---

## 🆘 Troubleshooting

### "Storage not configured" error

**Fix:**
```sql
-- Run in Supabase SQL Editor
CREATE BUCKET IF NOT EXISTS documents;

-- Set public access
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');
```

### All Claude models failing

**Possible causes:**
1. Invalid ANTHROPIC_API_KEY
2. API quota exceeded
3. Claude API outage

**Fix:**
1. Verify API key in `.env.local`
2. Check billing at console.anthropic.com
3. Check Claude status page

### No alerts being sent

**Check:**
1. `HEALTH_ALERT_EMAIL` is set in environment
2. `RESEND_API_KEY` is valid
3. Monitoring endpoint is being called (UptimeRobot setup)

### Dashboard shows "Loading..."

**Fix:**
1. Check browser console for errors
2. Verify `/api/health` endpoint is accessible
3. Check if admin authentication is blocking it

---

## 📈 Metrics to Track

### Weekly Review Checklist

- [ ] All services showing green?
- [ ] Any yellow warnings to address?
- [ ] Response times acceptable (<500ms)?
- [ ] Which Claude model is currently working?
- [ ] Any alerts received this week?
- [ ] Monitoring service still calling endpoint?

---

## 🔐 Security Notes

- Health endpoints are public (no auth)
- They don't expose sensitive data (only status)
- Alerts sent to HEALTH_ALERT_EMAIL only
- API keys never included in responses

---

## 💡 Future Enhancements

Potential additions you could make:

1. **SMS Alerts** - Add Twilio SMS for critical failures
2. **PagerDuty Integration** - Enterprise alerting
3. **Metrics Dashboard** - Graph response times over time
4. **Database Backup Checks** - Verify backups are running
5. **SSL Certificate Expiry** - Monitor cert renewal
6. **Uptime Percentage** - Track availability metrics

---

## ✅ Summary

You now have:

1. ✅ **Auto-fallback Claude models** - Prevents AI breakage
2. ✅ **Health monitoring** - Checks 6 critical services
3. ✅ **Email alerts** - Instant notification of failures
4. ✅ **Admin dashboard** - Visual service status
5. ✅ **Automated monitoring** - Runs every 5 minutes (once you set up UptimeRobot)

Your website is now **significantly more resilient** to:
- API deprecations
- Service outages
- Configuration issues
- Storage problems

**Next Steps:**
1. Set HEALTH_ALERT_EMAIL in environment variables
2. Set up UptimeRobot monitoring (5 minutes)
3. Visit /admin/health to verify everything works
4. Wait for confirmation that monitoring is running

Your website will now **self-heal** when possible and **alert you immediately** when it can't.
