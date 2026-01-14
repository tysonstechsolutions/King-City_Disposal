// ============================================
// DYNAMIC CITY LANDING PAGES
// ============================================
// These pages are CRITICAL for local SEO!
//
// Each city gets its own page with:
// - Unique title: "Dumpster Rental in [City], IL"
// - Unique content mentioning the city name
// - Local schema markup
// - Internal links to other service areas
// ============================================

import Link from 'next/link'
import { config } from '../../../config'
import { notFound } from 'next/navigation'
import Script from 'next/script'
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  Clock,
  DollarSign,
  Star
} from 'lucide-react'

// Helper to create URL-friendly slug from town name
function slugify(town) {
  return town
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Helper to convert slug back to town name
function unslugify(slug) {
  const cleanSlug = slug.replace(/-il$/, '')
  const town = config.serviceTowns.find(
    t => slugify(t) === cleanSlug
  )
  return town || null
}

// ============================================
// GENERATE STATIC PARAMS
// ============================================
export async function generateStaticParams() {
  return config.serviceTowns.map((town) => ({
    city: `${slugify(town)}-il`,
  }))
}

// ============================================
// GENERATE METADATA
// ============================================
export async function generateMetadata({ params }) {
  const townName = unslugify(params.city)

  if (!townName) {
    return {
      title: 'Page Not Found',
    }
  }

  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'

  return {
    title: `Dumpster Rental ${townName}, IL - Same Day Delivery`,
    description: `Need a dumpster in ${townName}, Illinois? ${config.businessName} offers fast, affordable roll-off dumpster rentals. 20 & 30 yard sizes. Same-day delivery available. Call ${config.phone}!`,
    keywords: [
      `dumpster rental ${townName.toLowerCase()} il`,
      `roll off dumpster ${townName.toLowerCase()}`,
      `rent a dumpster ${townName.toLowerCase()} illinois`,
      `dumpster service ${townName.toLowerCase()}`,
      `${townName.toLowerCase()} dumpster rental`,
    ],
    alternates: {
      canonical: `${baseUrl}/dumpster-rental/${slugify(townName)}-il`,
    },
    openGraph: {
      title: `Dumpster Rental in ${townName}, IL | ${config.businessName}`,
      description: `Fast, affordable dumpster rentals in ${townName}, Illinois. 20 & 30 yard roll-off containers. Same-day delivery. Transparent pricing.`,
      url: `${baseUrl}/dumpster-rental/${slugify(townName)}-il`,
      siteName: config.businessName,
      locale: 'en_US',
      type: 'website',
    },
  }
}

// ============================================
// CITY-SPECIFIC SCHEMA MARKUP
// ============================================
function CitySchema({ townName }) {
  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'

  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `Dumpster Rental in ${townName}, IL`,
    "description": `Roll-off dumpster rental service in ${townName}, Illinois. Fast delivery, transparent pricing, sizes from 20-30 yards.`,
    "provider": {
      "@type": "LocalBusiness",
      "name": config.businessName,
      "telephone": config.phoneRaw,
      "url": baseUrl,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": config.address.city,
        "addressRegion": config.address.state,
        "addressCountry": "US"
      }
    },
    "areaServed": {
      "@type": "City",
      "name": townName,
      "containedInPlace": {
        "@type": "State",
        "name": "Illinois"
      }
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": `Dumpster Sizes Available in ${townName}`,
      "itemListElement": config.dumpsters.map((dumpster, index) => ({
        "@type": "Offer",
        "position": index + 1,
        "itemOffered": {
          "@type": "Product",
          "name": `${dumpster.name} Dumpster Rental`,
          "description": `${dumpster.name} roll-off dumpster delivered to ${townName}, IL. ${dumpster.description}`,
        },
        "price": dumpster.pricing['10-day'],
        "priceCurrency": "USD"
      }))
    }
  }

  return (
    <Script
      id={`city-schema-${slugify(townName)}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Calculate approximate distance from base
function getDistance(town) {
  const distances = {
    'Mount Vernon': 0,
    'Woodlawn': 5,
    'Bluford': 8,
    'Centralia': 15,
    'Salem': 20,
    'Marion': 25,
    'Carbondale': 35,
    'Benton': 20,
    'Harrisburg': 30,
    'Fairfield': 25,
    'Flora': 30,
    'Olney': 35,
    'West Frankfort': 20,
    'Herrin': 30,
  }
  return distances[town] || Math.floor(15 + (town.length % 10) * 2)
}

// Get nearby towns for internal linking
function getNearbyTowns(currentTown, count = 6) {
  return config.serviceTowns
    .filter(t => t !== currentTown)
    .slice(0, count)
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function CityPage({ params }) {
  const townName = unslugify(params.city)

  if (!townName) {
    notFound()
  }

  const distance = getDistance(townName)
  const nearbyTowns = getNearbyTowns(townName)
  const isBaseCity = townName === config.address.city

  return (
    <>
      <CitySchema townName={townName} />

      {/* Hero Section */}
      <section className="bg-neutral-900 text-white py-16">
        <div className="container-custom">
          <div className="max-w-4xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-dark-500 mb-6">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/service-area" className="hover:text-white">Service Area</Link>
              <span>/</span>
              <span className="text-white">{townName}, IL</span>
            </nav>

            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-8 h-8 text-primary-400" />
              <span className="bg-primary/20 text-primary-300 px-3 py-1 rounded-full text-sm font-medium">
                {isBaseCity ? 'Our Home Base' : `${distance} miles from base`}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Dumpster Rental in {townName}, IL
            </h1>

            <p className="text-xl text-neutral-300 mb-8 leading-relaxed">
              Need a dumpster in {townName}, Illinois? {config.businessName} delivers
              roll-off dumpsters for home cleanouts, renovations, roofing projects,
              and construction debris. {isBaseCity
                ? "We're locally owned and based right here!"
                : `Same-day delivery available from our ${config.address.city} location.`}
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-dark-900/10 rounded-xl p-4 text-center">
                <Truck className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">Same-Day</p>
                <p className="text-dark-500 text-sm">Delivery Available</p>
              </div>
              <div className="bg-dark-900/10 rounded-xl p-4 text-center">
                <DollarSign className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">${config.dumpsters[0]?.pricing['10-day']}</p>
                <p className="text-dark-500 text-sm">Starting Price</p>
              </div>
              <div className="bg-dark-900/10 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">10 Days</p>
                <p className="text-dark-500 text-sm">Standard Rental</p>
              </div>
              <div className="bg-dark-900/10 rounded-xl p-4 text-center">
                <Star className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">5-Star</p>
                <p className="text-dark-500 text-sm">Rated Service</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/book"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 px-8 rounded-lg transition-colors"
              >
                Get {townName} Pricing
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href={`tel:${config.phoneRaw}`}
                className="inline-flex items-center gap-2 bg-dark-900/10 hover:bg-dark-900/20 text-white font-semibold py-4 px-8 rounded-lg transition-colors"
              >
                <Phone className="w-5 h-5" />
                {config.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Dumpster Sizes Available */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            Dumpster Sizes Available in {townName}
          </h2>
          <p className="text-dark-300 text-center mb-12 max-w-2xl mx-auto">
            We deliver all dumpster sizes to {townName}, IL. Not sure which size you need?
            Give us a call and we&apos;ll help you choose.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {config.dumpsters.map((dumpster) => (
              <div
                key={dumpster.id}
                className="bg-dark-900 rounded-xl border border-dark-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{dumpster.name}</h3>
                    <p className="text-dark-400 text-sm">{dumpster.dimensions.display}</p>
                  </div>
                </div>

                <p className="text-dark-300 text-sm mb-4">{dumpster.description}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">10-Day Rental</span>
                    <span className="text-white font-bold">${dumpster.pricing['10-day']}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Weight Included</span>
                    <span className="text-primary">{dumpster.weightIncluded}</span>
                  </div>
                </div>

                <Link
                  href={`/book?size=${dumpster.id}`}
                  className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Book This Size
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us for This City */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Why {townName} Chooses {config.businessName}
              </h2>

              <div className="space-y-4">
                {[
                  {
                    title: `Fast Delivery to ${townName}`,
                    description: isBaseCity
                      ? "We're based right here! Same-day delivery is usually available."
                      : `Just ${distance} miles from our base - we can often deliver same-day to ${townName}.`
                  },
                  {
                    title: 'Transparent Pricing',
                    description: 'The price you see is the price you pay. No hidden fees, no surprises at pickup.'
                  },
                  {
                    title: 'Locally Owned & Operated',
                    description: `We're your neighbors. Born and raised in Southern Illinois, serving ${townName} and surrounding communities.`
                  },
                  {
                    title: 'Easy Online Booking',
                    description: 'Book your dumpster online in 60 seconds. Pick your size, date, and location - done.'
                  },
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-dark-400 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Info Card */}
            <div className="bg-dark-800 rounded-xl p-8 border border-dark-700">
              <h3 className="text-2xl font-bold text-white mb-6">
                Service Details for {townName}
              </h3>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-dark-700">
                  <span className="text-dark-300">Distance from Base</span>
                  <span className="text-white font-semibold">{distance} miles</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-dark-700">
                  <span className="text-dark-300">Same-Day Delivery</span>
                  <span className="text-primary font-semibold">Available</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-dark-700">
                  <span className="text-dark-300">Delivery Fee</span>
                  <span className="text-white font-semibold">Included</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-dark-700">
                  <span className="text-dark-300">Service Hours</span>
                  <span className="text-white font-semibold">Mon-Sat</span>
                </div>
              </div>

              <a
                href={`tel:${config.phoneRaw}`}
                className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                <Phone className="w-5 h-5 inline mr-2" />
                Call Now: {config.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Common Projects in This Area */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Common Dumpster Projects in {townName}
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: 'Home Cleanouts',
                description: `Clearing out a house, garage, or basement in ${townName}? A 20-yard dumpster handles most home cleanouts.`,
                size: '20 Yard'
              },
              {
                title: 'Roofing Projects',
                description: `Replacing your roof in ${townName}? Our 30-yard dumpster holds shingles from most residential roofs.`,
                size: '30 Yard'
              },
              {
                title: 'Remodeling & Renovation',
                description: `Kitchen or bathroom remodel in ${townName}? We'll match the right dumpster size to your project.`,
                size: '20-30 Yard'
              },
              {
                title: 'Yard Cleanup',
                description: `Big yard project? Storm debris? Our dumpsters make disposal easy. Note: yard waste may have restrictions.`,
                size: '20 Yard'
              },
              {
                title: 'Estate Cleanouts',
                description: `Handling an estate cleanout in ${townName}? We can accommodate multiple dumpsters if needed.`,
                size: '20-30 Yard'
              },
              {
                title: 'Construction Debris',
                description: `Building or demolition project? Our heavy-duty roll-offs handle construction waste with ease.`,
                size: '30 Yard'
              },
            ].map((project, index) => (
              <div
                key={index}
                className="bg-dark-900 rounded-xl p-6 border border-dark-700"
              >
                <h3 className="font-semibold text-white mb-2">{project.title}</h3>
                <p className="text-dark-400 text-sm mb-4">{project.description}</p>
                <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  Recommended: {project.size}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby Service Areas */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            Also Serving Near {townName}
          </h2>
          <p className="text-dark-300 text-center mb-8">
            We deliver dumpsters throughout Southern Illinois. Click a city to learn more.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {nearbyTowns.map((town) => (
              <Link
                key={town}
                href={`/dumpster-rental/${slugify(town)}-il`}
                className="bg-dark-800 hover:bg-dark-800 border border-dark-700 hover:border-primary-300 rounded-xl p-4 text-center transition-all"
              >
                <p className="text-white font-medium">{town}, IL</p>
                <p className="text-dark-400 text-sm">Dumpster Rental</p>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/service-area"
              className="text-primary hover:text-primary-700 inline-flex items-center gap-2 font-medium"
            >
              View All Service Areas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Rent a Dumpster in {townName}?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Get an instant quote or call us now. We&apos;ll deliver your dumpster to {townName} fast.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Get {townName} Pricing
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold py-4 px-8 rounded-lg transition-colors border border-primary-500"
            >
              <Phone className="w-5 h-5" />
              {config.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
