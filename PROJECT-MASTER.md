# King City Disposal — Complete Project Plan

## Business Info (Easy to Change Later)
All of these are stored in ONE config file (`/src/config.js`) so you can change them anytime.

| Field | Current Value |
|-------|---------------|
| Business Name | King City Disposal |
| Phone | (618) 214-7656 |
| Email | tysonstechsolutions@gmail.com |
| Domain | KingCityDisposal.com |
| Service Area | 30 miles from base |
| Service Area Towns | King City, Flora, Mt. Vernon, Centralia, Salem, Olney, Fairfield, etc. |

---

## Pricing Structure

| Size | 3-Day | 7-Day | Weight Included | Overage | Daily Extension |
|------|-------|-------|-----------------|---------|-----------------|
| 20-yard | $425 | $485 | 3 tons | $70/ton | $20/day |
| 30-yard | $549 | $625 | 4 tons | $70/ton | $25/day |

---

## What We're Building

### 1. Website (Public-Facing)
- **Home Page** — Hero, quick booking CTA, trust badges, service overview
- **Dumpster Sizes Page** — 20/30 yard with photos, dimensions, use cases
- **Pricing Page** — Transparent pricing table (like SI Dumpsters)
- **Service Area Page** — List of 30+ towns (SEO gold)
- **FAQ Page** — Common questions + prohibited items list
- **Contact Page** — Phone, email, form
- **About Page** — Your story, why choose you

### 2. Chatbot Widget
- Embedded on every page (bottom-right corner)
- Flow: Address → Map placement → Size selection → Date picker → Contact info → Confirmation
- Shows prohibited items before checkout
- Adds booking to database + Google Calendar
- Sends you SMS notification with all details

### 3. SMS System (Twilio)
- **Customer books online** → You get text with details
- **You text back manual jobs** → Added to same calendar
  - Format: `ADD 123 Oak St, 20yd, delivery tomorrow 9am`
- **Customer reminders** → Auto-text day before delivery/pickup

### 4. Route Optimization
- **Daily at 6am** → System texts you optimized route
- Uses OpenRouteService API (FREE, unlimited)
- Includes Google Maps link with all stops in order
- Separates deliveries vs pickups

### 5. Admin Dashboard (Simple)
- View all bookings (calendar + list view)
- Mark jobs complete
- See customer details
- Add manual jobs via web (backup to SMS)

---

## Tech Stack (Budget-Friendly)

| Component | Technology | Cost |
|-----------|------------|------|
| Website | Next.js + React | FREE |
| Hosting | Vercel | FREE (hobby tier) |
| Database | Supabase | FREE (up to 500MB) |
| Maps | Leaflet + OpenStreetMap | FREE |
| Satellite Tiles | Mapbox | ~$5/month (1000 loads) |
| SMS | Twilio | ~$5-10/month |
| Calendar | Google Calendar API | FREE |
| Route Optimization | OpenRouteService | FREE |
| Domain | KingCityDisposal.com | ~$12/year |
| **TOTAL** | | **~$15-25/month** |

---

## Prohibited Items (Illinois Law + Republic Services)

### NEVER ALLOWED (Customer sees this before booking):
- ❌ Hazardous chemicals, paints, solvents
- ❌ Motor oil, antifreeze, transmission fluid
- ❌ Batteries (car or household)
- ❌ Tires (any size)
- ❌ Appliances with Freon (refrigerators, AC units, freezers)
- ❌ Electronics (TVs, computers, monitors, printers)
- ❌ Propane tanks, compressed gas cylinders
- ❌ Medical waste, sharps, needles
- ❌ Asbestos or asbestos-containing materials
- ❌ Fluorescent tubes/bulbs
- ❌ Yard waste (grass, leaves, brush)
- ❌ Liquids of any kind
- ❌ Hot water heaters
- ❌ Railroad ties, treated wood

### SURCHARGE ITEMS (We can take, but extra fee):
- ⚠️ Mattress/Box Spring — $40 each
- ⚠️ Couch/Upholstered Furniture — $25 each
- ⚠️ Concrete/Brick/Dirt — Call for pricing (heavy!)

---

## File Structure

```
king-city-disposal/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── page.jsx           # Home
│   │   ├── pricing/page.jsx   # Pricing
│   │   ├── dumpsters/page.jsx # Dumpster sizes
│   │   ├── service-area/page.jsx
│   │   ├── faq/page.jsx
│   │   ├── contact/page.jsx
│   │   ├── about/page.jsx
│   │   └── admin/page.jsx     # Admin dashboard
│   │
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Chatbot.jsx        # Main chatbot widget
│   │   ├── MapPicker.jsx      # Leaflet map for placement
│   │   ├── DatePicker.jsx
│   │   ├── PricingCard.jsx
│   │   └── ProhibitedItems.jsx
│   │
│   ├── lib/
│   │   ├── supabase.js        # Database client
│   │   ├── twilio.js          # SMS functions
│   │   ├── calendar.js        # Google Calendar
│   │   └── routing.js         # OpenRouteService
│   │
│   └── config.js              # ALL business settings here
│
├── api/                        # Serverless functions
│   ├── book.js                # Handle new bookings
│   ├── sms-webhook.js         # Receive your text messages
│   ├── daily-route.js         # Morning route optimization
│   └── send-reminder.js       # Customer reminders
│
└── public/
    ├── images/
    │   ├── logo.svg
    │   ├── 20-yard.jpg
    │   └── 30-yard.jpg
    └── favicon.ico
```

---

## Your To-Do List (In Order)

### Phase 1: Get Online (Week 1)
- [ ] Buy domain: KingCityDisposal.com
- [ ] Create Vercel account (free): vercel.com
- [ ] Create Supabase account (free): supabase.com
- [ ] Create Mapbox account (free tier): mapbox.com
- [ ] Take photos of your 20yd, 30yd dumpsters
- [ ] I deploy website to Vercel

### Phase 2: Go Live Basic (Week 2)
- [ ] Create Twilio account: twilio.com (~$20 to start)
- [ ] Buy a Twilio phone number (~$1/month)
- [ ] Connect Twilio to the chatbot
- [ ] Test full booking flow
- [ ] Create Google Business Profile (CRITICAL for SEO)

### Phase 3: Route System (Week 3)
- [ ] Set up Google Calendar for the business
- [ ] Connect SMS webhook for your manual job texts
- [ ] Set up daily route text at 6am
- [ ] Test everything

### Phase 4: SEO Sprint (Week 4)
- [ ] Add business to Google Maps
- [ ] Add business to Yelp, Facebook, Bing Places
- [ ] Ask 5 people for Google reviews
- [ ] Post first photos to Google Business Profile

---

## Quick Commands for Claude Code

When you're ready to work on this with Claude Code, use these:

```bash
# Start the project
cd king-city-disposal && npm run dev

# Deploy to Vercel
vercel --prod

# Test SMS webhook locally
ngrok http 3000
```

---

## Questions I Still Need Answered

1. **What town are you based in?** (for service area center)
2. **Dumpster dimensions** — I'll estimate but confirm:
   - 20yd: 22' x 8' x 4' ?
   - 30yd: 22' x 8' x 6' ?
3. **Do you want online payment** (Square/Stripe) or cash/check only for now?
4. **What time should the daily route text come?** (6am? 5am? 7am?)

---

## Next Steps

I'm going to build the website now. Starting with:
1. Config file (all your business info in one place)
2. Home page
3. Pricing page
4. Chatbot component

Let's go! 🚀
