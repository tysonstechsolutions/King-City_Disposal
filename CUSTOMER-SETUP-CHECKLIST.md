# New Customer Setup Checklist

Use this checklist when setting up the chatbot/website for a new dumpster rental customer.

---

## 1. Info to Collect from Customer

### Business Info
- [ ] Business name
- [ ] Tagline/slogan
- [ ] Phone number (main)
- [ ] Phone number (billing, if different)
- [ ] Email address
- [ ] Physical address (street, city, state, zip)
- [ ] EIN (for invoices)

### Service Area
- [ ] Central city/town (for map center point)
- [ ] Service radius (miles)
- [ ] List of towns served
- [ ] Boundary towns (north, south, east, west)

### Dumpster Inventory
For each size they offer:
- [ ] Size (e.g., 20 yard, 30 yard)
- [ ] Dimensions (L x W x H)
- [ ] Pricing (per rental period)
- [ ] Weight included
- [ ] Overage rate ($/ton)
- [ ] How many they own (fleet count)

### Pricing & Policies
- [ ] Rental periods offered (7-day, 10-day, etc.)
- [ ] Extension rate ($/day or $/week)
- [ ] Surcharge items (mattress fee, concrete fee, etc.)
- [ ] Prohibited items (or use default Illinois list)
- [ ] Late fee policy

### Hours
- [ ] Hours for each day of the week
- [ ] Closed days

### Branding
- [ ] Logo file (SVG or PNG)
- [ ] Brand colors (optional - can use defaults)
- [ ] Photos of trucks/dumpsters (optional)

### Social/Reviews
- [ ] Google Business Profile URL
- [ ] Google Place ID (for review links)
- [ ] Facebook URL (optional)
- [ ] Current Google rating & review count

---

## 2. Accounts to Set Up

### Supabase (Database)
1. Create new Supabase project
2. Run database migration SQL
3. Get credentials:
   - [ ] `NEXT_PUBLIC_SUPABASE_URL`
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Twilio (SMS)
Option A: Customer has their own Twilio
- [ ] Get their Twilio credentials

Option B: Use your Twilio (bill customer)
- [ ] Buy new phone number for customer
- [ ] Note the number for config

Credentials needed:
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `OWNER_PHONE` (customer's cell for alerts)

### Stripe (Payments) - USE STRIPE CONNECT
Payments go directly to customer's bank. You take a platform fee.

1. Use YOUR Stripe account (with Connect enabled)
2. Send customer the onboarding link (see below)
3. After they complete onboarding, get their `acct_xxx` ID

Credentials needed:
- [ ] `STRIPE_SECRET_KEY` (YOUR key, not theirs)
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_CONNECT_ACCOUNT_ID` (their connected account ID)
- [ ] `STRIPE_PLATFORM_FEE_PERCENT` (e.g., 2.5 for 2.5%)

**To onboard a new customer:**
```bash
curl -X POST https://your-platform.com/api/stripe/connect/onboard \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@email.com", "businessName": "Smith Dumpsters"}'
```
This returns a URL - send it to the customer to connect their bank.

### Google Maps
- [ ] Use your shared API key OR
- [ ] Customer provides their own key
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_KEY`

### Resend (Email)
- [ ] Set up domain verification
- [ ] Get API key
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `RESEND_DOMAIN`

### Domain
- [ ] Customer's domain name
- [ ] DNS access (to point to Vercel)

---

## 3. Files to Edit

### config.js - MAIN FILE
Update all sections:
- [ ] `businessName`, `tagline`, `phone`, `email`
- [ ] `address` object
- [ ] `serviceAreaCenter` (lat/lng)
- [ ] `serviceRadius`
- [ ] `serviceTowns` array
- [ ] `serviceBoundary` object
- [ ] `dumpsters` array (sizes, pricing)
- [ ] `fleet` object (inventory counts)
- [ ] `projectTypes` (if different)
- [ ] `hours` object
- [ ] `prohibitedItems` (if state-specific)
- [ ] `surchargeItems`
- [ ] `seo` object (title, description, keywords)
- [ ] `social` URLs
- [ ] `googlePlaceId`
- [ ] `reviews` (rating, count)

### Hardcoded References to Fix
- [ ] `src/app/page.jsx` - lines 120, 344 (image alt text)
- [ ] `src/app/api/documents/parse/route.js` - line 141 (business name in AI prompt)
- [ ] `src/app/api/expenses/import/route.js` - lines 87, 421

### Assets to Replace
- [ ] `/public/images/logo.svg` - customer's logo
- [ ] `/public/images/20-yard.svg` - dumpster images (optional)
- [ ] `/public/images/30-yard.svg` - dumpster images (optional)
- [ ] Add any customer photos to `/public/images/`

---

## 4. Deployment Steps

### Vercel Setup
1. [ ] Clone repo to new GitHub repo (customer-name-disposal)
2. [ ] Connect to Vercel
3. [ ] Add all environment variables
4. [ ] Deploy

### DNS Setup
1. [ ] Add custom domain in Vercel
2. [ ] Customer updates DNS:
   - A record → Vercel IP
   - OR CNAME → cname.vercel-dns.com

### Stripe Webhook
1. [ ] Add webhook endpoint: `https://customerdomain.com/api/stripe/webhook`
2. [ ] Select events: `checkout.session.completed`, `payment_intent.succeeded`
3. [ ] Copy webhook secret to env vars

### Cron Jobs (Vercel)
Already configured in `vercel.json`, just verify:
- [ ] Daily route optimization
- [ ] Reminder SMS
- [ ] Late fee processing
- [ ] Invoice reminders

---

## 5. Testing Checklist

- [ ] Homepage loads with correct branding
- [ ] Chatbot opens and shows correct business name
- [ ] Service area check works (test address in/out of area)
- [ ] Booking flow completes
- [ ] SMS notification received (owner phone)
- [ ] Admin dashboard accessible with password
- [ ] Booking appears in admin dashboard

---

## 6. Handoff to Customer

- [ ] Admin login credentials
- [ ] Quick training on admin dashboard
- [ ] Explain booking flow
- [ ] Show how to view/manage bookings
- [ ] Explain SMS notifications
- [ ] Google Business Profile setup guide (if needed)

---

## Quick Start Command

```bash
# Clone for new customer
git clone https://github.com/yourusername/dumpster-chatbot.git customer-name-disposal
cd customer-name-disposal

# Edit config
code src/config.js

# Test locally
npm install
npm run dev

# Deploy
vercel
```
