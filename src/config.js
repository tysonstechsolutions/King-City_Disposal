// ============================================
// KING CITY DISPOSAL - MASTER CONFIGURATION
// ============================================
// 
// 🎯 EVERYTHING is controlled from this ONE file.
// When you're ready to change something, do it here.
//
// ============================================

export const config = {

  // ============================================
  // 🚧 BOOKING MAINTENANCE MODE
  // ============================================
  // Set to true to show "call us" message instead of booking form
  // Set to false when Stripe is set up and ready
  bookingMaintenance: false,
  bookingMaintenanceMessage: "Online booking is temporarily unavailable. Please call us to schedule your dumpster rental!",

  // ============================================
  // 📋 BUSINESS INFO — Change these anytime
  // ============================================
  businessName: "King City Disposal",
  tagline: "Fast, Reliable Dumpster Rentals in Southern Illinois",
  phone: "(618) 231-8481",           // Scheduling line
  phoneRaw: "6182318481",
  billingPhone: "(618) 231-8430",    // Billing line
  billingPhoneRaw: "6182318430",
  email: "Kingcitydisposal@gmail.com",
  websiteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.kingcitydisposal.com",
  ein: "46-2094412",

  // Google Search Console verification code
  googleSiteVerification: "", // ← Add from Google Search Console

  address: {
    street: "16544 East Knox Road", // Internal use only - not displayed publicly
    city: "Mount Vernon",
    state: "IL",
    zip: "62864",
    hideFromPublic: true, // Don't show street address on website
  },
  
  // ============================================
  // 📧 NOTIFICATIONS — Where booking alerts go
  // ============================================
  notifications: {
    // Email to receive booking notifications
    bookingAlertEmail: "Kingcitydisposal@gmail.com",
    
    // ┌─────────────────────────────────────────┐
    // │  🔌 PLUG IN LATER: Twilio SMS           │
    // │  When ready, set enabled: true and      │
    // │  add credentials in VERCEL ENV VARS     │
    // └─────────────────────────────────────────┘
    twilio: {
      enabled: true, // SMS notifications active
      // ADD THESE IN VERCEL → Settings → Environment Variables:
      // TWILIO_ACCOUNT_SID
      // TWILIO_AUTH_TOKEN  
      // TWILIO_PHONE_NUMBER (format: +16185551234)
      // OWNER_PHONE (format: +16185551234)
    },
  },
  
  // ============================================
  // 💳 PAYMENTS — Stripe setup
  // ============================================
  // 💳 STRIPE PAYMENTS
  // ============================================
  // REQUIRED ENV VARS: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
  payments: {
    enabled: true,

    // If false, customers can book without paying (invoice later)
    requirePaymentUpfront: false,

    // Accepted payment methods
    methods: ["cash", "check", "venmo", "square", "card"],

    // Payment policy
    collectAt: "booking",     // Collect at time of booking
    requireDeposit: false,    // No deposits required
    paymentPlans: false,      // No payment plans

    // Late fees
    lateFeePercent: 5,        // 5% per month on overdue invoices
    lateFeeGraceDays: 30,     // Apply after 30 days overdue
  },
  
  // ============================================
  // 🗄️ DATABASE — Supabase
  // ============================================
  // REQUIRED: Set these in Vercel environment variables
  // NEXT_PUBLIC_SUPABASE_URL
  // NEXT_PUBLIC_SUPABASE_ANON_KEY
  // SUPABASE_SERVICE_ROLE_KEY (for server-side operations)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },
  
  // ============================================
  // 🗺️ SERVICE AREA
  // ============================================
  // Service boundaries:
  //   North: East Salem | South: Benton | East: McLeansboro | West: Nashville, IL
  //   Core: Fairfield
  serviceRadius: 35, // approximate miles to cover boundary towns
  serviceAreaCenter: {
    lat: 38.3789,  // Fairfield, IL (core service area)
    lng: -88.3597,
  },

  // Boundary towns (anything outside = extra charge or no service)
  serviceBoundary: {
    north: "East Salem",
    south: "Benton",
    east: "McLeansboro",
    west: "Nashville",
    core: "Fairfield",
  },

  // Towns within service area
  serviceTowns: [
    // Core area
    "Fairfield", "Mount Vernon",
    // Within boundaries
    "Wayne City", "Cisne", "Albion", "Crossville", "Carmi",
    "McLeansboro", "Enfield", "Norris City",
    "Benton", "West Frankfort", "Sesser", "Christopher",
    "Nashville", "Centralia", "Sandoval", "Odin",
    "Salem", "East Salem", "Kinmundy",
    "Flora", "Louisville", "Clay City", "Xenia",
    "Woodlawn", "Bluford", "Bonnie", "Dix", "Opdyke",
    "Waltonville", "Ina", "Nason", "Texico", "Belle Rive",
    "Kell", "Iuka", "Farina"
  ],
  
  // ============================================
  // 🗺️ GOOGLE MAPS (for satellite maps)
  // ============================================
  // Set NEXT_PUBLIC_GOOGLE_MAPS_KEY in Vercel environment variables
  googleMaps: {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
  },
  
  // ============================================
  // 🚛 FLEET INVENTORY
  // ============================================
  // How many dumpsters of each size you own
  // This is used to prevent overbooking
  fleet: {
    '20yd': 10,  // Number of 20-yard dumpsters
    '30yd': 15,  // Number of 30-yard dumpsters
  },

  // ============================================
  // 🚛 DUMPSTER SIZES & PRICING
  // ============================================
  // Change prices anytime — whole site updates automatically
  dumpsters: [
    {
      id: "20yd",
      name: "20 Yard Dumpster",
      shortName: "20 Yard",
      description: "Our most popular size - great for medium renovations and large cleanouts",
      dimensions: {
        length: 22, // feet (for map rectangle)
        width: 8,   // feet (for map rectangle)
        height: 4,
        display: "22ft × 8ft × 4ft"
      },
      capacity: "20 cubic yards",
      wheelbarrowLoads: "~100 wheelbarrow loads",
      bestFor: [
        "Kitchen or bathroom remodel",
        "Flooring removal (whole house)",
        "Roof tear-off (up to 25 squares)",
        "Estate cleanout (full house)"
      ],
      // Which project types recommend this size
      recommendedFor: ["cleanout", "renovation", "roofing"],
      pricing: {
        "10-day": 475,
      },
      weightIncluded: "3 tons",
      weightLimit: 6000,      // 3 tons in lbs (for weight overage calc)
      overage: 105,           // $105/ton overage rate
      overageRate: 105,       // Alias for FAQ page
      weightOverage: 105,
      extensionRate: 100,     // $100 per week extension
      extensionNotDumped: 50, // $50/week if container not dumped
      image: "/images/20-yard.svg" // ← REPLACE WITH REAL PHOTO LATER
    },
    {
      id: "30yd",
      name: "30 Yard Dumpster",
      shortName: "30 Yard",
      description: "Big projects need big dumpsters - construction, major renovations, commercial jobs",
      dimensions: {
        length: 22, // feet (for map rectangle)
        width: 8,   // feet (for map rectangle)
        height: 6,
        display: "22ft × 8ft × 6ft"
      },
      capacity: "30 cubic yards",
      wheelbarrowLoads: "~150 wheelbarrow loads",
      bestFor: [
        "Major home renovation",
        "New construction debris",
        "Commercial cleanout",
        "Storm damage cleanup"
      ],
      // Which project types recommend this size
      recommendedFor: ["construction", "major-renovation", "commercial"],
      pricing: {
        "10-day": 525,
      },
      weightIncluded: "3 tons",
      weightLimit: 6000,      // 3 tons in lbs (for weight overage calc)
      overage: 105,           // $105/ton overage rate
      overageRate: 105,       // Alias for FAQ page
      weightOverage: 105,
      extensionRate: 100,     // $100 per week extension
      extensionNotDumped: 50, // $50/week if container not dumped
      image: "/images/30-yard.svg" // ← REPLACE WITH REAL PHOTO LATER
    }
  ],
  
  // ============================================
  // 📋 PROJECT TYPES (for chatbot recommendations)
  // ============================================
  projectTypes: [
    { id: "cleanout", label: "Cleanout", emoji: "🏠", description: "Garage, basement, estate", recommendedSize: "20yd" },
    { id: "renovation", label: "Renovation", emoji: "🔨", description: "Kitchen, bathroom, flooring", recommendedSize: "20yd" },
    { id: "roofing", label: "Roofing", emoji: "🏗️", description: "Shingle tear-off", recommendedSize: "20yd" },
    { id: "construction", label: "Construction", emoji: "🏢", description: "New build, addition", recommendedSize: "30yd" },
    { id: "other", label: "Other", emoji: "📦", description: "Something else", recommendedSize: null },
  ],
  
  // ============================================
  // ⏰ HOURS OF OPERATION
  // ============================================
  hours: {
    monday: "7:00 AM - 5:00 PM",
    tuesday: "7:00 AM - 5:00 PM",
    wednesday: "7:00 AM - 5:00 PM",
    thursday: "7:00 AM - 5:00 PM",
    friday: "7:00 AM - 5:00 PM",
    saturday: "8:00 AM - 12:00 PM",
    sunday: "Closed",
  },
  
  // ============================================
  // 🚫 PROHIBITED ITEMS (Illinois Law)
  // ============================================
  prohibitedItems: [
    { item: "Hazardous chemicals, paints, solvents", reason: "Illinois EPA banned" },
    { item: "Motor oil, antifreeze, transmission fluid", reason: "Liquid waste banned" },
    { item: "Batteries (car or household)", reason: "Lead-acid batteries banned since 1990" },
    { item: "Tires (any size)", reason: "Whole tires banned since 1994" },
    { item: "Appliances with Freon (refrigerators, AC, freezers)", reason: "Requires Freon removal cert" },
    { item: "Electronics (TVs, computers, monitors, printers)", reason: "E-waste banned since 2012" },
    { item: "Propane tanks, compressed gas cylinders", reason: "Explosion hazard" },
    { item: "Medical waste, sharps, needles", reason: "Biohazard" },
    { item: "Asbestos or asbestos-containing materials", reason: "Requires special disposal" },
    { item: "Fluorescent tubes/bulbs", reason: "Mercury content" },
    { item: "Yard waste (grass, leaves, brush)", reason: "Banned from landfills since 1990" },
    { item: "Liquids of any kind", reason: "No liquid waste in roll-offs" },
    { item: "Hot water heaters", reason: "White goods banned" },
    { item: "Railroad ties, treated wood", reason: "Chemical treatment" },
  ],
  
  // ============================================
  // 💰 SURCHARGE ITEMS
  // ============================================
  surchargeItems: [
    { item: "Mattress", fee: 40, unit: "each" },
    { item: "Box Spring", fee: 40, unit: "each" },
    { item: "Couch/Sofa", fee: 25, unit: "each" },
    { item: "Recliner/Upholstered Chair", fee: 25, unit: "each" },
    { item: "Concrete/Brick/Dirt", fee: null, unit: "Call for pricing (heavy material)" },
  ],
  
  // ============================================
  // 🔍 SEO SETTINGS
  // ============================================
  seo: {
    title: "Dumpster Rental Mount Vernon IL | From $475 | Same-Day Delivery",
    description: "Need a dumpster TODAY? Get same-day delivery in Mount Vernon & Southern IL! 20 & 30 yard roll-offs from $475. No hidden fees, 10-day rental included. Family owned, 5-star service. Call (618) 231-8481!",
    keywords: [
      // Primary location keywords
      "dumpster rental Mount Vernon IL",
      "dumpster rental Fairfield IL",
      "dumpster rental Centralia IL",
      "dumpster rental Southern Illinois",
      "roll-off dumpster rental near me",
      // Service keywords
      "20 yard dumpster rental",
      "30 yard dumpster rental",
      "construction dumpster rental",
      "demolition dumpster",
      "renovation dumpster rental",
      // Project-specific keywords
      "dumpster for roofing project",
      "dumpster for home cleanout",
      "estate cleanout dumpster",
      "garage cleanout dumpster",
      "remodel dumpster rental",
      // Commercial intent keywords
      "cheap dumpster rental Illinois",
      "affordable dumpster rental",
      "same day dumpster delivery",
      "rent a dumpster today",
      // Long-tail keywords
      "how much does a dumpster rental cost",
      "dumpster rental prices near me",
      "best dumpster rental company Southern Illinois",
      "local dumpster rental service",
      "residential dumpster rental"
    ]
  },
  
  // ============================================
  // 🌐 SOCIAL MEDIA & REVIEWS (Add when ready)
  // ============================================
  social: {
    facebook: "", // ← ADD FACEBOOK PAGE URL
    instagram: "", // ← ADD INSTAGRAM URL
    google: "", // ← ADD GOOGLE BUSINESS PROFILE URL
  },

  // Google Place ID for review links
  // Find yours: https://developers.google.com/maps/documentation/places/web-service/place-id
  googlePlaceId: "", // ← ADD YOUR GOOGLE PLACE ID FOR REVIEW LINKS

  // ============================================
  // ⭐ REVIEWS (Update as you get Google reviews)
  // ============================================
  reviews: {
    rating: "5.0",
    count: 0, // ← Update this as you get Google reviews
  },

  // ============================================
  // 📍 ROUTE OPTIMIZATION
  // ============================================
  routing: {
    dailyTextTime: "05:30", // 5:30 AM
    // ┌─────────────────────────────────────────┐
    // │  🔌 PLUG IN LATER: Route optimization   │
    // │  This will send daily route texts       │
    // │  Requires Twilio to be enabled first    │
    // └─────────────────────────────────────────┘
    enabled: false, // ← FLIP TO true WHEN TWILIO IS READY
  },
  
  // ============================================
  // 🔐 ADMIN SETTINGS
  // ============================================
  // REQUIRED: Set ADMIN_PASSWORD in Vercel environment variables (NOT NEXT_PUBLIC_)
  // The password is validated server-side only for security
  admin: {
    // Password is intentionally NOT exposed here - validated server-side only
    // Set ADMIN_PASSWORD environment variable in Vercel
  },
};

// ============================================
// HELPER FUNCTIONS (Don't edit these)
// ============================================

export function formatPhone(raw) {
  const cleaned = raw.replace(/\D/g, '');
  return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
}

export function getDumpsterById(id) {
  return config.dumpsters.find(d => d.id === id);
}

export function calculatePrice(dumpsterId, periodId) {
  const dumpster = getDumpsterById(dumpsterId);
  if (!dumpster) return null;
  return dumpster.pricing[periodId] || null;
}

export function isInServiceArea(lat, lng) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat - config.serviceAreaCenter.lat) * Math.PI / 180;
  const dLng = (lng - config.serviceAreaCenter.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(config.serviceAreaCenter.lat * Math.PI / 180) * 
    Math.cos(lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance <= config.serviceRadius;
}

export default config;
