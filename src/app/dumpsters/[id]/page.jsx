import Link from 'next/link'
import { config, getDumpsterById } from '../../../config'
import { notFound } from 'next/navigation'
import Script from 'next/script'
import {
  Truck,
  Check,
  ArrowRight,
  Phone,
  Package,
  Scale,
  Clock,
  ArrowLeft
} from 'lucide-react'

// Generate static params for all dumpster sizes
export async function generateStaticParams() {
  return config.dumpsters.map((dumpster) => ({
    id: dumpster.id,
  }))
}

// Generate metadata for each dumpster page
export async function generateMetadata({ params }) {
  const dumpster = getDumpsterById(params.id)

  if (!dumpster) {
    return {
      title: 'Dumpster Not Found',
    }
  }

  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'

  // Keep titles under ~60 chars so they don't truncate in SERPs.
  // Drop the price from the title — it's already in the description and on
  // the page, and including it pushed the string past Google's display limit
  // (e.g. "30 Yard Dumpster Rental - $575 for 10 Days | King City Disposal" = 67 chars).
  return {
    title: `${dumpster.name} Rental in ${config.address.city}, IL`,
    description: `Rent a ${dumpster.name.toLowerCase()} from $${dumpster.pricing['10-day']} for 10 days. ${dumpster.weightIncluded} included. Same-day delivery in ${config.address.city}. Call ${config.phone}.`,
    alternates: {
      canonical: `${baseUrl}/dumpsters/${dumpster.id}`,
    },
    openGraph: {
      title: `${dumpster.name} Rental | ${config.businessName}`,
      description: `${dumpster.description} Starting at $${dumpster.pricing['10-day']} for 10 days with ${dumpster.weightIncluded} included.`,
      url: `${baseUrl}/dumpsters/${dumpster.id}`,
      siteName: config.businessName,
      locale: 'en_US',
      // Use 'website' instead of 'product.item' — Next 14 doesn't yet have
      // typed support for the product OG namespace, so emit the OG product
      // tags directly via metadata.other below.
      type: 'website',
      images: [
        { url: '/og-image.jpg', width: 1200, height: 630, alt: `${dumpster.name} Rental - ${config.businessName}` },
      ],
    },
    // Emit OG product extension manually so Pinterest/Slack/Discord render
    // the size page as a product card with price + availability.
    other: {
      'og:type': 'product',
      'product:price:amount': String(dumpster.pricing['10-day']),
      'product:price:currency': 'USD',
      'product:availability': 'in stock',
    },
  }
}

// Product schema for rich snippets — adds price, ratings, and breadcrumbs
// so the dumpster size pages can show stars + price in Google search results.
function DumpsterSchema({ dumpster }) {
  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'

  // Build a price *range* across all available rental durations so search
  // results can display "Starting at $X" rather than locking to 10-day only.
  const prices = Object.values(dumpster.pricing || {}).filter(p => typeof p === 'number')
  const minPrice = prices.length ? Math.min(...prices) : dumpster.pricing?.['10-day']

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${dumpster.name} Dumpster Rental`,
    "description": dumpster.description,
    "image": [`${baseUrl}/og-image.jpg`],
    "brand": {
      "@type": "Brand",
      "name": config.businessName
    },
    "offers": {
      "@type": "Offer",
      "price": minPrice,
      "priceCurrency": "USD",
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "availability": "https://schema.org/InStock",
      "url": `${baseUrl}/dumpsters/${dumpster.id}`,
      "areaServed": {
        "@type": "GeoCircle",
        "geoMidpoint": {
          "@type": "GeoCoordinates",
          "latitude": config.coordinates?.lat,
          "longitude": config.coordinates?.lng,
        },
        "geoRadius": "80000",
      },
      "seller": {
        "@type": "LocalBusiness",
        "@id": `${config.websiteUrl}/#localbusiness`,
        "name": config.businessName,
        "telephone": config.phoneRaw
      }
    },
    // AggregateRating only emits when reviews are configured. Star
    // ratings in search results lift CTR by 20-30%.
    ...(config.reviews?.count > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": config.reviews.rating || "5.0",
        "reviewCount": config.reviews.count,
        "bestRating": "5",
        "worstRating": "1",
      }
    } : {}),
    "additionalProperty": [
      { "@type": "PropertyValue", "name": "Dimensions",      "value": dumpster.dimensions.display },
      { "@type": "PropertyValue", "name": "Capacity",        "value": dumpster.capacity },
      { "@type": "PropertyValue", "name": "Weight Included", "value": dumpster.weightIncluded },
    ]
  }

  // Breadcrumb schema — Google uses this to render the "Home > Dumpsters >
  // 30 Yard" trail under the result instead of the bare URL.
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",      "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Dumpsters", "item": `${baseUrl}/dumpsters` },
      { "@type": "ListItem", "position": 3, "name": dumpster.name, "item": `${baseUrl}/dumpsters/${dumpster.id}` },
    ],
  }

  return (
    <>
      <Script
        id={`dumpster-schema-${dumpster.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Script
        id={`dumpster-breadcrumb-${dumpster.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  )
}

export default function DumpsterDetailPage({ params }) {
  const dumpster = getDumpsterById(params.id)

  if (!dumpster) {
    notFound()
  }

  // Get other dumpster for comparison
  const otherDumpsters = config.dumpsters.filter(d => d.id !== dumpster.id)

  return (
    <>
      <DumpsterSchema dumpster={dumpster} />

      {/* Hero Section */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom">
          <div className="max-w-4xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-dark-500 mb-6">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/dumpsters" className="hover:text-white">Dumpsters</Link>
              <span>/</span>
              <span className="text-white">{dumpster.shortName}</span>
            </nav>

            <div className="flex items-center gap-3 mb-4">
              <Truck className="w-8 h-8 text-primary-400" />
              <span className="bg-primary/20 text-primary-300 px-3 py-1 rounded-full text-sm font-medium">
                {dumpster.capacity}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {dumpster.name}
            </h1>

            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              {dumpster.description}
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-dark-900/10 rounded-xl p-4 text-center">
                <Package className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">{dumpster.capacity}</p>
                <p className="text-dark-500 text-sm">Capacity</p>
              </div>
              <div className="bg-dark-900/10 rounded-xl p-4 text-center">
                <Scale className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">{dumpster.weightIncluded}</p>
                <p className="text-dark-500 text-sm">Weight Included</p>
              </div>
              <div className="bg-dark-900/10 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">10 Days</p>
                <p className="text-dark-500 text-sm">Rental Period</p>
              </div>
              <div className="bg-dark-900/10 rounded-xl p-4 text-center">
                <Truck className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-white font-bold">Same-Day</p>
                <p className="text-dark-500 text-sm">Delivery Available</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/book?size=${dumpster.id}`}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 px-8 rounded-lg transition-colors"
              >
                Book This Dumpster - ${dumpster.pricing['10-day']}
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

      {/* Details Section */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Left: Visual */}
            <div className="bg-dark-900 rounded-xl border border-dark-700 p-8 lg:p-12">
              <div className="text-center mb-8">
                <Truck className="w-32 h-32 text-white/90 mx-auto mb-4" />
                <div className="inline-block bg-primary text-white px-6 py-3 rounded-full font-bold text-xl">
                  {dumpster.id.replace('yd', ' Yard')}
                </div>
              </div>

              {/* Dimensions */}
              <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                <h3 className="font-semibold text-white mb-4 text-center">Dimensions</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{dumpster.dimensions.length}&apos;</p>
                    <p className="text-dark-400 text-sm">Length</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{dumpster.dimensions.width}&apos;</p>
                    <p className="text-dark-400 text-sm">Width</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{dumpster.dimensions.height}&apos;</p>
                    <p className="text-dark-400 text-sm">Height</p>
                  </div>
                </div>
                <p className="text-center text-dark-300 mt-4 text-sm">
                  Overall: {dumpster.dimensions.display}
                </p>
              </div>
            </div>

            {/* Right: Details & Pricing */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                {dumpster.name} Details
              </h2>

              {/* Best For */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4">Best For:</h3>
                <ul className="space-y-3">
                  {dumpster.bestFor.map((use, i) => (
                    <li key={i} className="flex items-center gap-3 text-dark-300">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      {use}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Capacity Info */}
              <div className="bg-dark-900 rounded-xl p-6 border border-dark-700 mb-6">
                <h3 className="font-semibold text-white mb-4">Capacity</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-dark-300">Volume</span>
                    <span className="text-white font-medium">{dumpster.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Equivalent to</span>
                    <span className="text-white font-medium">{dumpster.wheelbarrowLoads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Weight Included</span>
                    <span className="text-primary font-medium">{dumpster.weightIncluded}</span>
                  </div>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-primary/10 rounded-xl p-6 border border-primary-200">
                <div className="text-center mb-6">
                  <p className="text-dark-300 text-sm">10-Day Rental</p>
                  <p className="text-5xl font-bold text-primary">${dumpster.pricing['10-day']}</p>
                  <p className="text-sm text-dark-400 mt-1">Includes delivery, pickup & {dumpster.weightIncluded}</p>
                </div>

                <div className="border-t border-primary-200 pt-4 space-y-2 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-dark-300">Extra weight over {dumpster.weightIncluded}</span>
                    <span className="text-white">${dumpster.weightOverage}/ton</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Extension (per week)</span>
                    <span className="text-white">${dumpster.extensionRate}</span>
                  </div>
                </div>

                <Link
                  href={`/book?size=${dumpster.id}`}
                  className="block w-full text-center bg-primary hover:bg-primary/90 text-white font-semibold py-4 rounded-lg transition-colors"
                >
                  Book This Dumpster
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Sizes */}
      {otherDumpsters.length > 0 && (
        <section className="section bg-dark-900">
          <div className="container-custom">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Compare Other Sizes
            </h2>
            <p className="text-dark-300 text-center mb-8">
              Not sure if the {dumpster.shortName} is right? Check out our other options.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {otherDumpsters.map((other) => (
                <Link
                  key={other.id}
                  href={`/dumpsters/${other.id}`}
                  className="bg-dark-800 hover:bg-dark-800 border border-dark-700 hover:border-primary-300 rounded-xl p-6 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="w-8 h-8 text-dark-500" />
                    <h3 className="text-xl font-bold text-white">{other.name}</h3>
                  </div>
                  <p className="text-dark-300 text-sm mb-4">{other.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-bold">${other.pricing['10-day']}</span>
                    <span className="text-dark-400 text-sm">{other.capacity}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link
                href="/dumpsters"
                className="text-primary hover:text-primary-700 inline-flex items-center gap-2 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                View All Dumpster Sizes
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Rent a {dumpster.shortName}?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Book online in 60 seconds or give us a call. Same-day delivery available
            in {config.address.city} and surrounding areas.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href={`/book?size=${dumpster.id}`}
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Book Now - ${dumpster.pricing['10-day']}
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
