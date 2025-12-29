# King City Disposal - Dumpster Rental Website

A modern, mobile-friendly dumpster rental website with chatbot booking, SMS notifications, and route optimization.

## Features

- ✅ Modern, responsive website
- ✅ AI-powered chatbot for instant booking
- ✅ Satellite map placement picker
- ✅ SMS notifications (Twilio)
- ✅ Google Calendar integration
- ✅ Route optimization with daily text
- ✅ Admin dashboard
- ✅ SEO optimized for local search

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Then edit .env.local with your API keys

# Run development server
npm run dev

# Open http://localhost:3000
```

## Deployment

### Deploy to Vercel (Recommended - Free)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repo
4. Add environment variables in Vercel dashboard
5. Deploy!

```bash
# Or deploy from command line
npm i -g vercel
vercel --prod
```

## Configuration

All business settings are in `src/config.js`:

- Business name, phone, email
- Dumpster sizes and pricing
- Service area towns
- Prohibited items list
- Hours of operation

**To change anything, just edit `src/config.js`** - the entire site updates automatically.

## Required Accounts (Free Tiers Available)

| Service | Purpose | Cost |
|---------|---------|------|
| [Vercel](https://vercel.com) | Hosting | FREE |
| [Supabase](https://supabase.com) | Database | FREE |
| [Mapbox](https://mapbox.com) | Satellite maps | FREE (50k/mo) |
| [Twilio](https://twilio.com) | SMS | ~$5-10/mo |
| [OpenRouteService](https://openrouteservice.org) | Route optimization | FREE |
| Google Calendar | Scheduling | FREE |

## Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.jsx           # Home
│   ├── pricing/           # Pricing page
│   ├── dumpsters/         # Dumpster sizes
│   ├── service-area/      # Service area + towns
│   ├── faq/               # FAQ + prohibited items
│   ├── contact/           # Contact form
│   └── admin/             # Admin dashboard
│
├── components/
│   ├── Header.jsx
│   ├── Footer.jsx
│   ├── ChatbotWidget.jsx  # Main chatbot
│   └── ...
│
└── config.js              # ALL settings here
```

## SMS Integration

When a customer books through the chatbot, you'll receive a text like:

```
NEW BOOKING 🚛

John Smith - (618) 555-1234
123 Main St, Flora IL

📦 20 Yard Dumpster
📅 Delivery: Mon, Jan 6
⏱️ 7-Day Rental
💰 $485

[View on Map]
```

To add manual jobs, text your Twilio number:
```
ADD 456 Oak St, 14yd, tomorrow 9am
```

## Daily Route Text

Every morning at 6am, you'll receive:

```
Today's Route (5 stops):

1. 📍 123 Main St (delivery) - 8:00am
2. 📍 456 Oak St (pickup) - 9:30am
3. 📍 789 Elm Ave (delivery) - 11:00am
...

[Open in Google Maps]
```

## SEO Notes

- Service Area page lists 40+ towns for local search
- Each page has proper meta tags
- Mobile-friendly design
- Fast loading (Next.js optimized)

**Most important for ranking:**
1. Set up Google Business Profile
2. Get Google reviews (aim for 10+ in first month)
3. Keep NAP (Name, Address, Phone) consistent everywhere

## Support

Questions? Check `PROJECT-MASTER.md` for the complete project brief.

---

Built with ❤️ for Southern Illinois
