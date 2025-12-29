// ============================================
// KING CITY DISPOSAL - CONFIGURATION
// ============================================
// Change ANY business info here - it updates everywhere on the site
// ============================================

export const config = {
  // === BUSINESS INFO ===
  businessName: "King City Disposal",
  tagline: "Fast, Reliable Dumpster Rentals in Southern Illinois",
  phone: "(618) 214-7656",
  phoneRaw: "6182147656", // For tel: links
  email: "tysonstechsolutions@gmail.com",
  address: {
    street: "", // Add when ready
    city: "Mount Vernon",
    state: "IL",
    zip: "",
  },
  
  // === SERVICE AREA ===
  serviceRadius: 30, // miles
  serviceAreaCenter: {
    lat: 38.3173,  // Mount Vernon, IL
    lng: -88.9031,
  },
  
  // List every town for SEO - add more as needed!
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
  
  // === DUMPSTER SIZES & PRICING ===
  dumpsters: [
    {
      id: "14yd",
      name: "14 Yard Dumpster",
      description: "Perfect for small cleanouts, garage cleanups, or small renovation projects",
      dimensions: {
        length: "14 ft",
        width: "7 ft", 
        height: "4 ft"
      },
      capacity: "14 cubic yards",
      wheelbarrowLoads: "~70 wheelbarrow loads",
      bestFor: [
        "Garage or basement cleanout",
        "Small bathroom remodel",
        "Deck removal",
        "Estate cleanout (1-2 rooms)"
      ],
      pricing: {
        "3-day": 350,
        "7-day": 399,
      },
      weightIncluded: "2 tons",
      weightOverage: 100, // per ton
      dailyExtension: 15,
      image: "/images/14-yard.jpg"
    },
    {
      id: "20yd",
      name: "20 Yard Dumpster",
      description: "Our most popular size - great for medium renovations and large cleanouts",
      dimensions: {
        length: "22 ft",
        width: "8 ft",
        height: "4 ft"
      },
      capacity: "20 cubic yards",
      wheelbarrowLoads: "~100 wheelbarrow loads",
      bestFor: [
        "Kitchen or bathroom remodel",
        "Flooring removal (whole house)",
        "Roof tear-off (up to 25 squares)",
        "Estate cleanout (full house)"
      ],
      pricing: {
        "3-day": 425,
        "7-day": 485,
      },
      weightIncluded: "3 tons",
      weightOverage: 70,
      dailyExtension: 20,
      image: "/images/20-yard.jpg"
    },
    {
      id: "30yd",
      name: "30 Yard Dumpster",
      description: "Big projects need big dumpsters - construction, major renovations, commercial jobs",
      dimensions: {
        length: "22 ft",
        width: "8 ft",
        height: "6 ft"
      },
      capacity: "30 cubic yards",
      wheelbarrowLoads: "~150 wheelbarrow loads",
      bestFor: [
        "Major home renovation",
        "New construction debris",
        "Commercial cleanout",
        "Storm damage cleanup"
      ],
      pricing: {
        "3-day": 549,
        "7-day": 625,
      },
      weightIncluded: "4 tons",
      weightOverage: 70,
      dailyExtension: 25,
      image: "/images/30-yard.jpg"
    }
  ],
  
  // === RENTAL PERIODS ===
  rentalPeriods: [
    { id: "3-day", label: "3 Days", days: 3 },
    { id: "7-day", label: "7 Days", days: 7 },
  ],
  
  // === PROHIBITED ITEMS (Illinois Law) ===
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
  
  // === SURCHARGE ITEMS ===
  surchargeItems: [
    { item: "Mattress", fee: 40, unit: "each" },
    { item: "Box Spring", fee: 40, unit: "each" },
    { item: "Couch/Sofa", fee: 25, unit: "each" },
    { item: "Recliner/Upholstered Chair", fee: 25, unit: "each" },
    { item: "Concrete/Brick/Dirt", fee: null, unit: "Call for pricing (heavy material)" },
  ],
  
  // === HOURS OF OPERATION ===
  hours: {
    monday: "7:00 AM - 5:00 PM",
    tuesday: "7:00 AM - 5:00 PM",
    wednesday: "7:00 AM - 5:00 PM",
    thursday: "7:00 AM - 5:00 PM",
    friday: "7:00 AM - 5:00 PM",
    saturday: "8:00 AM - 12:00 PM",
    sunday: "Closed",
  },
  
  // === SOCIAL MEDIA (add when ready) ===
  social: {
    facebook: "",
    instagram: "",
    google: "", // Google Business Profile URL
  },
  
  // === SEO ===
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
  
  // === API KEYS (loaded from environment variables) ===
  // These are set in Vercel/hosting dashboard, not here
  // NEXT_PUBLIC_MAPBOX_TOKEN
  // TWILIO_ACCOUNT_SID
  // TWILIO_AUTH_TOKEN
  // TWILIO_PHONE_NUMBER
  // SUPABASE_URL
  // SUPABASE_ANON_KEY
  // GOOGLE_CALENDAR_CREDENTIALS
};

// === HELPER FUNCTIONS ===

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
  // Haversine formula for distance
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
