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
    title: config.seo.title,
    description: config.seo.description,
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
    title: config.seo.title,
    description: config.seo.description,
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
      </head>
      <body className="min-h-screen flex flex-col bg-white text-neutral-900">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <ChatbotWidget />
      </body>
    </html>
  )
}
