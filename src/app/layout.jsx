import './globals.css'
import { config } from '../config'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import Script from 'next/script'

// ============================================
// METADATA - Enhanced for Local SEO
// ============================================
export const metadata = {
  metadataBase: new URL(config.websiteUrl || 'https://www.kingcitydisposal.com'),
  title: {
    template: '%s | ' + config.businessName,
    default: config.seo.title,
  },
  description: config.seo.description,
  keywords: config.seo.keywords,
  authors: [{ name: config.businessName }],
  creator: config.businessName,
  publisher: config.businessName,
  formatDetection: {
    telephone: true,
    address: true,
  },
  openGraph: {
    title: "Dumpster Rental Mount Vernon IL | From $475 | Same-Day Delivery",
    description: "Need a dumpster TODAY? Same-day delivery in Mount Vernon & Southern IL! 20 & 30 yard roll-offs from $475. No hidden fees. Family owned. Call (618) 231-8481!",
    url: config.websiteUrl,
    siteName: config.businessName,
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: `${config.businessName} - Dumpster Rental in ${config.address.city}, IL`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Dumpster Rental Mount Vernon IL | From $475 | Same-Day",
    description: "Need a dumpster TODAY? Same-day delivery in Southern IL! From $475, no hidden fees. Call (618) 231-8481!",
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: config.websiteUrl,
  },
  verification: {
    google: config.googleSiteVerification || '',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
}

// ============================================
// LOCALBUSINESS SCHEMA - Critical for Local SEO
// ============================================
function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${config.websiteUrl}/#localbusiness`,
    "name": config.businessName,
    "description": config.seo.description,
    "url": config.websiteUrl,
    "telephone": config.phoneRaw,
    "email": config.email,
    "image": `${config.websiteUrl}/images/logo.png`,
    "logo": `${config.websiteUrl}/images/logo.png`,
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": config.address.city,
      "addressRegion": config.address.state,
      "postalCode": config.address.zip,
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": config.serviceAreaCenter.lat,
      "longitude": config.serviceAreaCenter.lng
    },
    "areaServed": [
      // Primary city
      {
        "@type": "City",
        "name": config.address.city,
        "containedInPlace": {
          "@type": "State",
          "name": "Illinois"
        }
      },
      // Service area radius
      {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "latitude": config.serviceAreaCenter.lat,
          "longitude": config.serviceAreaCenter.lng
        },
        "geoRadius": `${config.serviceRadius} mi`
      },
      // All service towns
      ...config.serviceTowns.slice(0, 20).map(town => ({
        "@type": "City",
        "name": town,
        "containedInPlace": {
          "@type": "State",
          "name": "Illinois"
        }
      }))
    ],
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "07:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "08:00",
        "closes": "14:00"
      }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Dumpster Rental Services",
      "itemListElement": config.dumpsters.map((dumpster, index) => ({
        "@type": "Offer",
        "position": index + 1,
        "itemOffered": {
          "@type": "Service",
          "name": `${dumpster.name} Rental`,
          "description": dumpster.description,
        },
        "price": dumpster.pricing['10-day'],
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": dumpster.pricing['10-day'],
          "priceCurrency": "USD",
          "unitText": "10-day rental"
        }
      }))
    },
    "sameAs": [
      config.social?.facebook,
      config.social?.google,
      config.social?.yelp,
    ].filter(Boolean),
    "aggregateRating": config.reviews?.count > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": config.reviews?.rating || "5.0",
      "reviewCount": config.reviews?.count || "0",
      "bestRating": "5",
      "worstRating": "1"
    } : undefined
  }

  // Remove undefined values
  const cleanSchema = JSON.parse(JSON.stringify(schema))

  return (
    <Script
      id="local-business-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanSchema) }}
    />
  )
}

// ============================================
// ORGANIZATION SCHEMA
// ============================================
function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": config.businessName,
    "url": config.websiteUrl,
    "logo": `${config.websiteUrl}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": config.phoneRaw,
      "contactType": "customer service",
      "areaServed": "US",
      "availableLanguage": "English"
    }
  }

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ============================================
// WEBSITE SCHEMA - For sitelinks search box
// ============================================
function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": config.businessName,
    "url": config.websiteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${config.websiteUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ============================================
// FAQ SCHEMA - Shows expandable Q&As in Google search results (rich snippets)
// ============================================
function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much does a dumpster rental cost in Mount Vernon IL?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Dumpster rentals in Mount Vernon and Southern Illinois start at $${config.dumpsters[0]?.pricing['10-day']} for a 10-day rental. This includes delivery, pickup, and disposal up to ${config.dumpsters[0]?.weightIncluded}. Call King City Disposal at ${config.phone} for a quote.`
        }
      },
      {
        "@type": "Question",
        "name": "Can I get same-day dumpster delivery?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! King City Disposal offers same-day dumpster delivery in Mount Vernon and surrounding areas for orders placed before noon (subject to availability). Next-day delivery is almost always available. Call us at " + config.phone + " for rush delivery."
        }
      },
      {
        "@type": "Question",
        "name": "What size dumpster do I need for a home cleanout?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "For most garage, basement, or single-room cleanouts, a 20-yard dumpster is perfect. It holds about 8 pickup truck loads of debris. For whole-house cleanouts or major renovations, consider a 30-yard dumpster."
        }
      },
      {
        "@type": "Question",
        "name": "How long can I keep the dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our standard rental period is 10 days, which is longer than most competitors. Need more time? Extensions are available at $" + (config.dumpsters[0]?.extensionRate || 100) + " per week. Fill it up early? Just call and we'll pick it up!"
        }
      },
      {
        "@type": "Question",
        "name": "What can't go in a dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Prohibited items include hazardous materials, paint, chemicals, batteries, tires, appliances with Freon (refrigerators, AC units), electronics, and yard waste. These items are banned by Illinois law. See our FAQ page for the complete list."
        }
      }
    ]
  }

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ============================================
// HOWTO SCHEMA - For the booking process
// ============================================
function HowToSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Rent a Dumpster in Southern Illinois",
    "description": "Simple 4-step process to rent a roll-off dumpster from King City Disposal.",
    "totalTime": "PT5M",
    "estimatedCost": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": config.dumpsters[0]?.pricing['10-day'] || 475
    },
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Choose Your Size",
        "text": "Select a 20-yard or 30-yard dumpster based on your project needs.",
        "url": `${config.websiteUrl}/dumpsters`
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Pick Delivery Location",
        "text": "Enter your address and use our satellite map to show exactly where to place the dumpster.",
        "url": `${config.websiteUrl}/book`
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Schedule Delivery",
        "text": "Choose your delivery date. Same-day delivery often available for orders before noon.",
        "url": `${config.websiteUrl}/book`
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Fill It Up",
        "text": "Load your debris, then call us for pickup when you're done or at the end of your rental period.",
        "url": `${config.websiteUrl}/contact`
      }
    ]
  }

  return (
    <Script
      id="howto-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// ============================================
// SERVICE SCHEMA - For dumpster rental services
// ============================================
function ServiceSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Dumpster Rental",
    "name": "Roll-Off Dumpster Rental Service",
    "description": "Professional roll-off dumpster rental service for residential and commercial projects in Southern Illinois. Available in 20 and 30 yard sizes.",
    "provider": {
      "@type": "LocalBusiness",
      "name": config.businessName,
      "telephone": config.phoneRaw,
      "url": config.websiteUrl
    },
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": config.serviceAreaCenter.lat,
        "longitude": config.serviceAreaCenter.lng
      },
      "geoRadius": `${config.serviceRadius} mi`
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Dumpster Rental Services",
      "itemListElement": [
        {
          "@type": "OfferCatalog",
          "name": "Residential Dumpster Rental",
          "itemListElement": [
            "Home Cleanout Dumpsters",
            "Renovation Dumpsters",
            "Roofing Project Dumpsters",
            "Estate Cleanout Dumpsters"
          ]
        },
        {
          "@type": "OfferCatalog",
          "name": "Commercial Dumpster Rental",
          "itemListElement": [
            "Construction Debris Dumpsters",
            "Demolition Dumpsters",
            "Commercial Cleanout Dumpsters"
          ]
        }
      ]
    }
  }

  return (
    <Script
      id="service-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" translate="no">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.mapbox.com" />
        
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          as="style"
        />
        
        {/* Canonical URL is set via metadata.alternates */}
        
        {/* Schema markup */}
        <LocalBusinessSchema />
        <OrganizationSchema />
        <WebsiteSchema />
        <ServiceSchema />
        <FAQSchema />
        <HowToSchema />
      </head>
      <body className="min-h-screen flex flex-col bg-dark-900 text-white">
        {/* Skip link for keyboard navigation - accessible but visually hidden until focused */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-grow" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <ChatbotWidget />

        {/* Mobile Sticky Phone Button */}
        <a
          href={`tel:${config.phoneRaw}`}
          className="mobile-phone-sticky md:hidden"
          aria-label="Call us now"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </a>
      </body>
    </html>
  )
}
