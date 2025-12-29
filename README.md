# King City Disposal - Dumpster Rental Website

A professional, mobile-friendly dumpster rental website for Southern Illinois. Features online booking, satellite map placement, SMS notifications, and an admin dashboard.

## Features

- **Professional Design** - Clean, trustworthy look that converts visitors to customers
- **Online Booking** - 5-step booking flow with satellite map placement picker
- **AI Chatbot** - Guided booking assistant that pops up to help visitors
- **SMS Notifications** - Instant alerts when new bookings come in (Twilio)
- **Admin Dashboard** - View bookings, see placement maps, manage orders
- **SEO Optimized** - Local business schema, service area pages, meta tags
- **Mobile Responsive** - Works great on phones, tablets, and desktop

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Configuration

**Everything is controlled from one file: `src/config.js`**

Edit this file to change:
- Business name, phone, email
- Dumpster sizes and pricing
- Service area towns
- Prohibited items list
- Hours of operation

The entire site updates automatically when you change the config.

## Project Structure

```
src/
├── app/
│   ├── page.jsx              # Homepage
│   ├── book/                 # 5-step booking flow
│   ├── pricing/              # Pricing page
│   ├── dumpsters/            # Dumpster sizes
│   ├── service-area/         # Service area + towns
│   ├── faq/                  # FAQ + prohibited items
│   ├── contact/              # Contact form
│   ├── privacy/              # Privacy policy
│   ├── terms/                # Terms of service
│   └── admin/                # Admin dashboard
│       └── booking/[id]/     # Booking detail with map
│
├── components/
│   ├── Header.jsx            # Navigation header
│   ├── Footer.jsx            # Site footer
│   ├── ChatbotWidget.jsx     # Booking assistant chatbot
│   └── BookingDetailMap.jsx  # Static satellite map with dumpster overlay
│
└── config.js                 # ALL business settings
```

## Booking Flow

### Online Booking (/book)
1. **Project & Size** - Select project type, choose dumpster size, pick 3 or 7 day rental
2. **Location** - Enter address, drop pin on satellite map to show exact placement
3. **Date** - Pick delivery date from calendar
4. **Contact** - Name, phone, email
5. **Review** - See summary with surcharges, confirm booking

### Chatbot
- Pops up automatically on homepage after 2 seconds
- Does NOT auto-open on /book page (user already booking)
- Smaller size on non-homepage pages to be less intrusive
- Same 5-step flow as the booking page

## Admin Dashboard

Access at `/admin` to:
- View all bookings
- See delivery addresses on satellite map with dumpster rectangle overlay
- Update booking status (pending, confirmed, delivered, completed, cancelled)
- Add internal notes
- Delete bookings

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repo
4. Add environment variables (see below)
5. Deploy!

```bash
# Or deploy from command line
npm i -g vercel
vercel --prod
```

## Environment Variables

Set these in Vercel dashboard or `.env.local`:

```env
# Supabase (database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Twilio (SMS notifications - optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
OWNER_PHONE=+1234567890

# Google Maps (for satellite imagery)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_api_key
```

## Required Accounts

| Service | Purpose | Cost |
|---------|---------|------|
| [Vercel](https://vercel.com) | Hosting | FREE |
| [Supabase](https://supabase.com) | Database | FREE |
| [Google Maps](https://console.cloud.google.com) | Satellite maps, geocoding | FREE tier available |
| [Twilio](https://twilio.com) | SMS notifications | ~$5-10/mo (optional) |

## Design System

### Colors
- **Primary Green**: `#3d8b64` - Professional, trustworthy
- **Accent Amber**: `#d97706` - CTAs and highlights
- **Neutral Grays**: Clean backgrounds and text

### Typography
- **Font**: Inter - Clean, modern, highly readable
- **Headings**: Bold, clear hierarchy
- **Body**: Regular weight, good line height

### Components
- White cards with subtle borders
- Professional button styles (no gamer effects)
- Clean forms with clear labels
- Responsive grid layouts

## SEO

- Local business schema markup
- Service area pages with town names
- Proper meta tags on all pages
- Mobile-friendly responsive design
- Fast loading with Next.js

**To rank locally:**
1. Set up Google Business Profile
2. Get Google reviews
3. Keep NAP (Name, Address, Phone) consistent everywhere

## SMS Integration

When enabled, you'll receive texts for new bookings:

```
NEW BOOKING

John Smith - (618) 555-1234
123 Main St, Mount Vernon IL

20 Yard Dumpster
Delivery: Mon, Jan 6
7-Day Rental
$485

View booking in admin dashboard
```

---

Built for Southern Illinois
