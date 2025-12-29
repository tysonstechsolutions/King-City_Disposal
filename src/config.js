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
  // 📋 BUSINESS INFO — Change these anytime
  // ============================================
  businessName: "King City Disposal",
  tagline: "Fast, Reliable Dumpster Rentals in Southern Illinois",
  phone: "(618) 214-7656",
  phoneRaw: "6182147656",
  email: "tysonstechsolutions@gmail.com", // ← CHANGE TO THEIR EMAIL LATER
  websiteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://kingcitydisposal.com",
  
  address: {
    street: "", // Add street address when ready
    city: "Mount Vernon",
    state: "IL",
    zip: "", // Add zip when ready
  },
  
  // ============================================
  // 📧 NOTIFICATIONS — Where booking alerts go
  // ============================================
  notifications: {
    // Email to receive booking notifications
    bookingAlertEmail: "tysonstechsolutions@gmail.com", // ← CHANGE TO THEIR EMAIL
    
    // ┌─────────────────────────────────────────┐
    // │  🔌 PLUG IN LATER: Twilio SMS           │
    // │  When ready, set enabled: true and      │
    // │  add credentials in VERCEL ENV VARS     │
    // └─────────────────────────────────────────┘
    twilio: {
      enabled: false, // ← FLIP TO true WHEN READY
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
  // ┌─────────────────────────────────────────┐
  // │  🔌 PLUG IN LATER: Stripe Payments      │
  // │  When ready, set enabled: true and      │
  // │  add API keys in VERCEL ENV VARS        │
  // └─────────────────────────────────────────┘
  payments: {
    enabled: false, // ← FLIP TO true WHEN READY
    // ADD THESE IN VERCEL → Settings → Environment Variables:
    // STRIPE_PUBLISHABLE_KEY
    // STRIPE_SECRET_KEY
    
    // If false, customers can book without paying (invoice later)
    requirePaymentUpfront: false,
  },
  
  // ============================================
  // 🗄️ DATABASE — Supabase
  // ============================================
  // These use environment variables with fallbacks
  // Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qtlhjxejgzjrrfmthutw.supabase.co",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bGhqeGVqZ3pqcnJmbXRodXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5Njc5MTgsImV4cCI6MjA4MjU0MzkxOH0.AllL3A553URTYkSGr0jEoCaV87weo5uoh0fG9fAIlNc",
    // Secret key goes in environment variables for security
  },
  
  // ============================================
  // 🗺️ SERVICE AREA
  // ============================================
  serviceRadius: 30, // miles
  serviceAreaCenter: {
    lat: 38.3173,  // Mount Vernon, IL
    lng: -88.9031,
  },
  
  // Towns list for SEO — add more anytime!
  serviceTowns: [
    "Mount Vernon", "Woodlawn", "Bluford", "Bonnie", "Dix", "Opdyke",
    "Waltonville", "Ina", "Nason", "Texico", "Belle Rive",
    "Centralia", "Sandoval", "Odin", "Patoka", "Vernon", "Irvington",
    "Salem", "Kinmundy", "Farina", "Alma", "Kell",
    "Benton", "West Frankfort", "Sesser", "Christopher", "Zeigler",
    "Marion", "Johnston City", "Herrin", "Carterville", "Energy",
    "Harrisburg", "Eldorado", "Galatia", "Carrier Mills", "Raleigh",
    "McLeansboro", "Enfield", "Norris City", "Carmi",
    "Fairfield", "Albion", "Grayville", "Crossville",
    "Flora", "Louisville", "Clay City", "Xenia",
    "Olney", "Newton", "Ste. Marie", "Dieterich",
    "Effingham", "Altamont", "St. Elmo"
  ],
  
  // ============================================
  // 🗺️ GOOGLE MAPS (for satellite maps)
  // ============================================
  googleMaps: {
    apiKey: "AIzaSyAAU2wsDoDPH4n9BNk_pWlxBla3irr_AtM",
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
        "3-day": 425,
        "7-day": 485,
      },
      weightIncluded: "3 tons",
      weightLimit: 6000,      // 3 tons in lbs (for weight overage calc)
      overage: 70,            // $70/ton overage rate
      weightOverage: 70,
      dailyExtension: 20,
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
        "3-day": 549,
        "7-day": 625,
      },
      weightIncluded: "4 tons",
      weightLimit: 8000,      // 4 tons in lbs (for weight overage calc)
      overage: 70,            // $70/ton overage rate
      weightOverage: 70,
      dailyExtension: 25,
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
    title: "King City Disposal | Dumpster Rental in Mount Vernon, IL & Southern Illinois",
    description: "Fast, affordable dumpster rentals in Mount Vernon and Southern Illinois. 14, 20, and 30 yard roll-off dumpsters. Online booking, transparent pricing, same-day delivery available.",
    keywords: [
      "dumpster rental Mount Vernon IL",
      "roll-off dumpster Southern Illinois",
      "dumpster rental near me",
      "construction dumpster rental",
      "junk removal Mount Vernon Illinois"
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
  admin: {
    // Password for /admin page
    // Set ADMIN_PASSWORD in Vercel for production!
    password: process.env.ADMIN_PASSWORD || "kingcity2024",
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
