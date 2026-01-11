import Link from 'next/link'
import Script from 'next/script'
import { config } from '../../../config'
import {
  DollarSign,
  Calculator,
  CheckCircle,
  XCircle,
  ArrowRight,
  Phone,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'

// ============================================
// METADATA - Targeting "how much does a dumpster cost"
// ============================================
export const metadata = {
  title: 'How Much Does a Dumpster Rental Cost? | 2025 Pricing Guide',
  description: `Dumpster rental costs in Southern Illinois start at $${config.dumpsters[0]?.pricing['10-day']} for a 10-day rental. Learn what affects pricing, what's included, and how to avoid hidden fees. Transparent pricing from King City Disposal.`,
  keywords: [
    'dumpster rental cost',
    'how much does a dumpster cost',
    'dumpster rental prices',
    'dumpster rental cost near me',
    'how much to rent a dumpster',
    'dumpster rental pricing',
    'cheap dumpster rental',
    'affordable dumpster rental',
    'dumpster rental rates',
    '20 yard dumpster cost',
    '30 yard dumpster cost'
  ],
  alternates: {
    canonical: `${config.websiteUrl}/guides/dumpster-rental-cost`,
  },
  openGraph: {
    title: 'How Much Does a Dumpster Rental Cost? | 2025 Pricing Guide',
    description: `Dumpster rentals in Southern Illinois start at $${config.dumpsters[0]?.pricing['10-day']}. See what's included and how to get the best price.`,
    url: `${config.websiteUrl}/guides/dumpster-rental-cost`,
    type: 'article',
  },
}

// ============================================
// ARTICLE SCHEMA
// ============================================
function ArticleSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How Much Does a Dumpster Rental Cost? Complete 2025 Pricing Guide",
    "description": `Learn about dumpster rental costs in Southern Illinois. Prices start at $${config.dumpsters[0]?.pricing['10-day']} for a 10-day rental.`,
    "author": {
      "@type": "Organization",
      "name": config.businessName
    },
    "publisher": {
      "@type": "Organization",
      "name": config.businessName,
      "url": config.websiteUrl
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${config.websiteUrl}/guides/dumpster-rental-cost`
    }
  }

  return (
    <Script
      id="article-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function DumpsterCostGuide() {
  return (
    <>
      <ArticleSchema />

      {/* Hero */}
      <section className="bg-neutral-900 text-white py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/guides/dumpster-rental-cost" className="text-white">Dumpster Rental Cost</Link>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-8 h-8 text-primary-400" />
              <span className="bg-primary-600/20 text-primary-300 px-3 py-1 rounded-full text-sm font-medium">
                2025 Pricing Guide
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How Much Does a Dumpster Rental Cost?
            </h1>

            <p className="text-xl text-neutral-300 leading-relaxed">
              Get straight answers about dumpster rental pricing in Southern Illinois. No hidden fees,
              no surprises - just honest pricing from a local company.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Pricing */}
      <section className="section bg-primary-50">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
              Our Dumpster Rental Prices
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {config.dumpsters.map((dumpster) => (
                <div key={dumpster.id} className="bg-white rounded-xl p-6 border-2 border-primary-200">
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">{dumpster.name}</h3>
                  <p className="text-neutral-600 text-sm mb-4">{dumpster.dimensions.display}</p>

                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-4xl font-bold text-primary-600">
                      ${dumpster.pricing['10-day']}
                    </span>
                    <span className="text-neutral-500 mb-1">/ 10 days</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Delivery included</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Pickup included</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{dumpster.weightIncluded} disposal included</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>No hidden fees</span>
                    </li>
                  </ul>

                  <Link
                    href={`/book?size=${dumpster.id}`}
                    className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    Book This Size
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-neutral-600">
              Prices valid for {config.address.city} and surrounding areas within {config.serviceRadius} miles.
            </p>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-neutral-900 mb-8 text-center">
              What's Included in the Price?
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Included With Every Rental
                </h3>
                <ul className="space-y-3">
                  {[
                    'Delivery to your location',
                    'Placement where you need it',
                    'Full rental period (10 days)',
                    'Pickup when you\'re done',
                    'Disposal at licensed landfill',
                    'Weight allowance (3 tons)',
                    'Customer support'
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-neutral-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-700 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Potential Extra Charges
                </h3>
                <ul className="space-y-3">
                  {[
                    { item: 'Weight overage', detail: `$${config.dumpsters[0]?.overageRate}/ton over ${config.dumpsters[0]?.weightIncluded}` },
                    { item: 'Extra rental days', detail: `$${config.dumpsters[0]?.extensionRate}/week extension` },
                    { item: 'Mattresses', detail: `$${config.surchargeItems?.find(i => i.item === 'Mattress')?.fee || 40} each` },
                    { item: 'Couches/sofas', detail: `$${config.surchargeItems?.find(i => i.item === 'Couch/Sofa')?.fee || 25} each` },
                    { item: 'Heavy materials', detail: 'Call for concrete/dirt pricing' },
                  ].map((item) => (
                    <li key={item.item} className="flex items-start gap-3 text-neutral-700">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{item.item}</span>
                        <span className="text-neutral-500 text-sm ml-2">{item.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Factors */}
      <section className="section bg-neutral-50">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-neutral-900 mb-8 text-center">
              What Affects Dumpster Rental Cost?
            </h2>

            <div className="space-y-6">
              {[
                {
                  title: 'Dumpster Size',
                  description: 'Larger dumpsters cost more. Our 30-yard is bigger than the 20-yard, so it has a higher rental rate. Choose the size that fits your project to avoid paying for space you don\'t need.',
                  icon: Calculator
                },
                {
                  title: 'Rental Duration',
                  description: 'Our standard rental is 10 days. Need more time? Extensions are available at a weekly rate. Finish early? We\'ll pick it up - you won\'t get a refund but you won\'t be charged extra either.',
                  icon: TrendingUp
                },
                {
                  title: 'Weight of Debris',
                  description: 'Each dumpster includes a weight allowance. Go over and you\'ll pay an overage fee. Heavy materials like concrete, shingles, and dirt add up fast.',
                  icon: Calculator
                },
                {
                  title: 'Your Location',
                  description: `We serve ${config.address.city} and surrounding areas within ${config.serviceRadius} miles. Delivery fees are included in our pricing for this service area.`,
                  icon: TrendingUp
                },
                {
                  title: 'What You\'re Throwing Away',
                  description: 'Standard household and construction debris is included. Some items like mattresses have a small surcharge. Prohibited items (hazardous waste, tires, etc.) cannot go in the dumpster.',
                  icon: AlertTriangle
                }
              ].map((factor, index) => (
                <div key={index} className="bg-white rounded-xl p-6 border border-neutral-200">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <factor.icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-2">{factor.title}</h3>
                      <p className="text-neutral-600">{factor.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Avoid Hidden Fees */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-neutral-900 mb-8 text-center">
              How to Avoid Hidden Dumpster Fees
            </h2>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-amber-800 mb-4">
                Watch Out for These Common "Gotchas" from Other Companies:
              </h3>
              <ul className="space-y-2">
                {[
                  'Fuel surcharges added after booking',
                  'Environmental fees not disclosed upfront',
                  'Delivery and pickup charged separately',
                  'Short rental periods (3-5 days) with expensive extensions',
                  'Low weight limits that almost guarantee overage charges'
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-amber-900">
                    <XCircle className="w-4 h-4 text-amber-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-800 mb-4">
                Our Transparent Pricing Promise:
              </h3>
              <ul className="space-y-2">
                {[
                  'Price includes delivery, pickup, and disposal',
                  'Full 10-day rental period standard',
                  'Generous 3-ton weight allowance',
                  'No fuel surcharges or environmental fees',
                  'Clear pricing on any potential extras upfront'
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-green-900">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Local Comparison */}
      <section className="section bg-neutral-50">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Why Choose a Local Dumpster Company?
            </h2>
            <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
              National chains often have hidden fees and slow service. As a local Southern Illinois
              company, we offer better prices and faster delivery because we're right here in your community.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'Same-Day Delivery', description: 'We can often deliver the same day you call. National companies may take days.' },
                { title: 'Local Knowledge', description: 'We know the area, the regulations, and the best way to serve you.' },
                { title: 'Real People', description: 'Call us and talk to a real person who can answer your questions.' }
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-6 border border-neutral-200">
                  <h3 className="font-semibold text-neutral-900 mb-2">{item.title}</h3>
                  <p className="text-neutral-600 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary-600">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Get Your Dumpster Today
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Transparent pricing, fast delivery, no hidden fees. Book online in 60 seconds
            or call us for a quick quote.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-primary-600 font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Book Online Now
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
