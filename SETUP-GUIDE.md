# 🚀 New Features Setup Guide

Everything you need to activate the new features for King City Disposal.

---

## What's New

| Feature | What It Does |
|---------|--------------|
| **Missed Call Text-Back** | Auto-texts callers when you miss their call |
| **Customer Self-Service SMS** | Customers text EXTEND, PICKUP, STATUS |
| **Auto Reminders** | Day-before delivery & pickup texts |
| **Review Requests** | Auto-asks for Google reviews after completion |
| **Stripe Payment Links** | One-tap payment links in SMS |
| **Container Board** | Visual dashboard of all active dumpsters |

---

## Quick Setup Checklist

- [ ] Run database migration in Supabase
- [ ] Add new environment variables to Vercel
- [ ] Update Twilio webhooks
- [ ] Deploy updated code
- [ ] Test the flow

---

## Step 1: Database Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Paste contents of `database-migration.sql`
5. Click **Run**

This adds columns for:
- Reminder tracking (delivery_reminder_sent, etc.)
- Pickup requests
- SMS conversation logging
- Payment link tracking

---

## Step 2: Environment Variables

Add these to **Vercel → Settings → Environment Variables**:

### Required for SMS Features
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+16185551234
OWNER_PHONE=+16185551234
```

### Required for Payment Links
```
STRIPE_SECRET_KEY=your_stripe_secret_key_here
```

### Optional (for cron security)
```
CRON_SECRET=your-random-secret-string
```

### Your Site URL (for links in SMS)
```
NEXT_PUBLIC_SITE_URL=https://kingcitydisposal.com
```

---

## Step 3: Twilio Webhook Setup

### Voice Webhook (Missed Calls)
1. Go to [Twilio Console](https://console.twilio.com)
2. Phone Numbers → Manage → Active Numbers
3. Click your number
4. Under **Voice & Fax**:
   - **A CALL COMES IN**: Webhook → `https://yourdomain.com/api/twilio/voice`
   - **CALL STATUS CHANGES**: Webhook → `https://yourdomain.com/api/twilio/voice/status`

### SMS Webhook (Customer Replies)
1. Same page, under **Messaging**:
   - **A MESSAGE COMES IN**: Webhook → `https://yourdomain.com/api/twilio/sms`

---

## Step 4: Deploy to Vercel

```bash
# If using Vercel CLI
vercel --prod

# Or just push to GitHub - auto-deploys
git add .
git commit -m "Add SMS features"
git push
```

The `vercel.json` file configures the daily reminder cron job automatically.

---

## Step 5: Test Everything

### Test Missed Call Text-Back
1. Call your Twilio number from a different phone
2. Don't answer (let it ring 20+ seconds)
3. You should receive a text offering to help

### Test Customer SMS Commands
Text your Twilio number:
- `STATUS` → Should say no active rental found
- `HELP` → Should list available commands
- `123 Main St, Flora IL` → Should forward to owner as new lead

### Test Reminders (Manual Trigger)
```bash
curl https://yourdomain.com/api/cron/reminders
```

### Test Container Board
1. Go to `/admin` and login
2. Click "Container Board" link (you may need to add this to nav)
3. Should show all active rentals with status colors

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── twilio/
│   │   │   ├── voice/
│   │   │   │   ├── route.js        # Incoming calls
│   │   │   │   └── status/
│   │   │   │       └── route.js    # Missed call handler
│   │   │   └── sms/
│   │   │       └── route.js        # Incoming SMS
│   │   ├── cron/
│   │   │   └── reminders/
│   │   │       └── route.js        # Daily reminders
│   │   └── stripe/
│   │       └── payment-link/
│   │           └── route.js        # Generate payment links
│   └── admin/
│       └── containers/
│           └── page.jsx            # Container board
├── config.js                        # Updated with new settings
└── ...
```

---

## How Each Feature Works

### Missed Call Text-Back
```
Customer calls → You don't answer → System texts:
"Hey! This is King City Disposal. Sorry we missed your call!
Need a dumpster? Just reply with your address..."
```

### Customer Self-Service SMS
```
Customer texts "EXTEND" →
System finds their active rental →
Calculates extension price →
Sends payment link (if Stripe enabled) or notifies you
```

```
Customer texts "PICKUP" →
System marks pickup requested →
Notifies you immediately →
Confirms to customer
```

```
Customer texts "STATUS" →
System looks up their rental →
Sends: address, dumpster size, delivery date, pickup date
```

### Auto Reminders
**Day before delivery:**
```
"Hi John! Your 20 Yard Dumpster arrives TOMORROW between 8am-12pm.
📍 123 Main St
Please make sure the area is clear..."
```

**Day before pickup:**
```
"Hi John! Your rental ends TOMORROW...
Need more time? Reply EXTEND for $20/day"
```

**2 days after completion:**
```
"Thanks for choosing King City Disposal!
⭐ Leave a review: [Google link]"
```

### Container Board
Visual dashboard showing:
- 🔴 **Overdue** - Past pickup date
- 🟠 **Pickup Today** - Due today
- 🟡 **Ending Soon** - Due tomorrow
- 🟢 **Active** - Still has time

Quick actions: Call customer, Open in Maps, View details

---

## Troubleshooting

### SMS not sending?
1. Check Twilio credentials are correct
2. Make sure phone numbers have +1 prefix
3. Check Vercel function logs for errors

### Reminders not running?
1. Vercel cron only works on Pro plan
2. Alternative: Use [cron-job.org](https://cron-job.org) (free)
3. Set URL to `https://yourdomain.com/api/cron/reminders`

### Payment links not working?
1. Verify Stripe key is `sk_live_...` not `sk_test_...`
2. Check Stripe dashboard for errors

### Container board empty?
1. Make sure you have bookings with status `confirmed` or `delivered`
2. Check browser console for API errors

---

## Adding Container Board to Admin Nav

Add this link to your admin page navigation:

```jsx
<Link href="/admin/containers" className="btn-secondary">
  Container Board
</Link>
```

---

## Need Help?

- Check Vercel function logs for errors
- Test webhooks with [ngrok](https://ngrok.com) locally
- Twilio has great debugging tools in their console

---

**You're all set!** 🎉

These features will:
- Capture leads you'd otherwise miss (missed calls)
- Reduce support calls (self-service SMS)
- Improve customer experience (reminders)
- Get more Google reviews (auto-requests)
- Speed up payments (Stripe links)
- Keep you organized (container board)
