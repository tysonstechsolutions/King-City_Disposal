// ============================================
// PAVING CALCULATOR - CONFIGURATION
// ============================================
//
// Edit these values to customize pricing, services, and business info
//
// ============================================

export const pavingConfig = {

  // ============================================
  // BUSINESS INFO
  // ============================================
  business: {
    name: "Your Paving Company",
    phone: "(618) 555-1234",
    phoneRaw: "6185551234",
    email: "info@yourpavingcompany.com",
    serviceArea: "Southern Illinois",
  },

  // ============================================
  // OWNER NOTIFICATIONS (SMS)
  // ============================================
  // These use environment variables - set them in your hosting provider
  // TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, OWNER_PHONE
  notifications: {
    enabled: true,
    // Owner phone receives all quote requests via SMS
  },

  // ============================================
  // GOOGLE MAPS (for satellite area drawing)
  // ============================================
  googleMaps: {
    apiKey: "YOUR_GOOGLE_MAPS_API_KEY", // Get from Google Cloud Console
  },

  // ============================================
  // SERVICE AREA CENTER (for map default view)
  // ============================================
  serviceAreaCenter: {
    lat: 38.3170,  // Mount Vernon, IL area (62864)
    lng: -88.9031,
  },

  // ============================================
  // SERVICES & PRICING
  // ============================================
  services: [
    {
      id: 'sealcoating',
      name: 'Sealcoating',
      description: 'Protective coating to extend asphalt life',
      pricePerSqFt: 0.20,        // $0.20 per square foot
      minPrice: 150,              // Minimum job price
      unit: 'sq ft',
      estimateBuffer: 0.20,       // Show price ±20% range
      benefits: [
        'Protects against UV damage',
        'Prevents water penetration',
        'Extends pavement life 2-3x',
        'Improves curb appeal'
      ]
    },
    {
      id: 'paving',
      name: 'Asphalt Paving',
      description: 'New asphalt installation or full replacement',
      pricePerSqFt: 4.25,         // $4.25 per square foot
      minPrice: 2500,             // Minimum job price
      unit: 'sq ft',
      estimateBuffer: 0.25,       // Show price ±25% range (more variance)
      benefits: [
        'Smooth, durable surface',
        'Proper drainage design',
        'Professional grade materials',
        'Long-lasting results'
      ]
    },
    {
      id: 'linestriping',
      name: 'Line Striping',
      description: 'Parking lot lines, symbols, and markings',
      pricePerLinearFt: 0.25,     // $0.25 per linear foot
      pricePerStall: 4.00,        // $4.00 per parking stall
      pricePerSymbol: 35,         // $35 per handicap symbol
      minPrice: 200,              // Minimum job price
      unit: 'varies',
      estimateBuffer: 0.15,       // Show price ±15% range
      benefits: [
        'ADA compliant markings',
        'Traffic flow optimization',
        'Professional appearance',
        'Durable traffic paint'
      ]
    }
  ],

  // ============================================
  // PROJECT TYPES
  // ============================================
  projectTypes: [
    { id: 'residential_driveway', label: 'Residential Driveway', avgSqFt: 600 },
    { id: 'commercial_parking', label: 'Commercial Parking Lot', avgSqFt: 5000 },
    { id: 'church_parking', label: 'Church Parking Lot', avgSqFt: 8000 },
    { id: 'apartment_complex', label: 'Apartment Complex', avgSqFt: 15000 },
    { id: 'industrial', label: 'Industrial/Warehouse', avgSqFt: 20000 },
    { id: 'other', label: 'Other', avgSqFt: null }
  ],

  // ============================================
  // ASPHALT CONDITIONS
  // ============================================
  // These help you assess pricing when you review quotes
  conditions: [
    { id: 'good', label: 'Good - Minor wear', adjustment: 0 },
    { id: 'fair', label: 'Fair - Some cracks', adjustment: 0.10 },
    { id: 'poor', label: 'Poor - Significant damage', adjustment: 0.25 },
    { id: 'unknown', label: 'Not sure', adjustment: 0 }
  ],

  // ============================================
  // DISCLAIMER TEXT
  // ============================================
  disclaimer: "This is an estimate only. Final pricing depends on current condition, accessibility, and specific project requirements. A representative will contact you with a detailed quote.",
};

export default pavingConfig;
