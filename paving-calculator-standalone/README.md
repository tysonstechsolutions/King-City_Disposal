# Paving Area Calculator

A standalone React component for calculating paving, sealcoating, and line striping estimates. Customers can measure their driveway or parking lot, get an instant price range, and submit a quote request that sends an SMS to the business owner.

## Features

- **3 Services**: Sealcoating ($0.20/sq ft), Asphalt Paving ($4.25/sq ft), Line Striping
- **Area Measurement**: Enter dimensions OR draw on satellite map
- **Instant Estimates**: Shows price range based on square footage
- **SMS Notifications**: Texts owner with full quote details
- **Mobile Friendly**: Works great on all devices
- **Condition Assessment**: Customer rates pavement condition

## Folder Structure

```
paving-calculator-standalone/
├── components/
│   └── PavingCalculator.jsx    # Main React component
├── api/
│   └── paving-quote/
│       └── route.js            # API endpoint (Next.js App Router)
├── config/
│   └── paving-config.js        # All pricing & settings
└── README.md                   # This file
```

## Quick Start (Next.js)

### 1. Copy Files to Your Project

```bash
# Copy to your Next.js project
cp -r paving-calculator-standalone/components/PavingCalculator.jsx your-project/src/components/
cp -r paving-calculator-standalone/api/paving-quote your-project/src/app/api/
cp -r paving-calculator-standalone/config/paving-config.js your-project/src/config/
```

### 2. Update Config Paths

In `PavingCalculator.jsx`, update the import path:
```javascript
import { pavingConfig } from '../config/paving-config'  // Adjust to your path
```

In `api/paving-quote/route.js`, uncomment and update the config import if needed.

### 3. Set Environment Variables

Add to your `.env.local` or hosting provider:

```env
# Required for SMS notifications
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+16185551234
OWNER_PHONE=+16185551234

# Required for satellite map
# Get from: https://console.cloud.google.com/
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Optional - for saving quotes to database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

### 4. Update Google Maps API Key

In `config/paving-config.js`:
```javascript
googleMaps: {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY",
},
```

### 5. Create a Page

Create `src/app/paving-calculator/page.jsx`:

```javascript
import PavingCalculator from '../../components/PavingCalculator'

export default function PavingCalculatorPage() {
  return <PavingCalculator />
}
```

### 6. Add to Navigation (Optional)

```jsx
<a href="/paving-calculator">Get a Quote</a>
```

## Customizing Pricing

Edit `config/paving-config.js`:

```javascript
services: [
  {
    id: 'sealcoating',
    name: 'Sealcoating',
    pricePerSqFt: 0.20,        // Change this
    minPrice: 150,              // Minimum job price
    estimateBuffer: 0.20,       // Shows price ±20%
  },
  {
    id: 'paving',
    name: 'Asphalt Paving',
    pricePerSqFt: 4.25,         // Change this
    minPrice: 2500,
    estimateBuffer: 0.25,       // Shows price ±25%
  },
  {
    id: 'linestriping',
    name: 'Line Striping',
    pricePerLinearFt: 0.25,     // Per foot
    pricePerStall: 4.00,        // Per parking stall
    pricePerSymbol: 35,         // Per handicap symbol
    minPrice: 200,
  }
]
```

## Customizing Business Info

```javascript
business: {
  name: "Your Paving Company",
  phone: "(618) 555-1234",
  phoneRaw: "6185551234",
  email: "info@yourpavingcompany.com",
  serviceArea: "Southern Illinois",
},
```

## Customizing Service Area (Map Center)

```javascript
serviceAreaCenter: {
  lat: 38.3170,   // Your service area latitude
  lng: -88.9031,  // Your service area longitude
},
```

## How the Workflow Works

1. **Customer visits calculator page**
2. **Selects service type** (Sealcoating, Paving, or Line Striping)
3. **Enters project type** (Driveway, Parking Lot, etc.)
4. **Measures area**:
   - Enter length x width dimensions, OR
   - Draw polygon on satellite map
5. **Sees instant estimate** (price range)
6. **Enters address and condition** of existing pavement
7. **Provides contact info**
8. **Submits quote request**
9. **Owner receives SMS** with all details:
   ```
   NEW PAVING QUOTE

   Sealcoating
   Residential Driveway
   1,200 sq ft

   123 Main St, Mount Vernon, IL
   Condition: Fair (Some cracks)

   Est: $192-$288

   John Smith
   (618) 555-1234
   Prefers: Call

   Notes: Cracks near garage
   ```
10. **Owner reviews details** and contacts customer with finalized price

## Optional: Database Storage

To save quotes to a database, set up Supabase and create this table:

```sql
CREATE TABLE paving_quotes (
  id SERIAL PRIMARY KEY,
  service_type VARCHAR(50),
  project_type VARCHAR(50),
  square_footage INTEGER,
  num_stalls INTEGER,
  num_handicap_symbols INTEGER,
  linear_feet INTEGER,
  address TEXT,
  condition VARCHAR(50),
  notes TEXT,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  preferred_contact VARCHAR(20),
  estimate_low INTEGER,
  estimate_high INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Styling

The component uses Tailwind CSS classes. If your project doesn't use Tailwind, you'll need to either:

1. **Add Tailwind CSS** to your project
2. **Convert to your CSS framework** (replace Tailwind classes with your styles)
3. **Add custom CSS** for the `.paving-calc` wrapper class

## Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geometry Library
   - Drawing Library
4. Create an API key with these restrictions:
   - HTTP referrers (your domain)
   - API restrictions (only enabled APIs)

## Twilio Setup

1. Create account at [Twilio](https://www.twilio.com/)
2. Get a phone number
3. Copy Account SID and Auth Token from dashboard
4. Add to environment variables

## SMS Message Customization

Edit the SMS template in `api/paving-quote/route.js`:

```javascript
let smsMessage = `NEW PAVING QUOTE\n\n`;
smsMessage += `${serviceName}\n`;
// ... customize as needed
```

## Support

For issues or customization requests, modify the code to fit your needs. The component is self-contained and easy to adjust.

## License

Free to use for your business.
