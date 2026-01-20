import Link from 'next/link'
import Script from 'next/script'
import { config } from '../../../config'
import {
  Ruler,
  Home,
  HardHat,
  Truck,
  CheckCircle,
  ArrowRight,
  Phone,
  Scale,
  Package
} from 'lucide-react'

// ============================================
// METADATA - Targeting "what size dumpster do I need"
// ============================================
export const metadata = {
  title: 'What Size Dumpster Do I Need? | Dumpster Size Guide',
  description: 'Not sure what size dumpster to rent? Our complete guide helps you choose between 20 and 30 yard dumpsters for your project. Covers home cleanouts, renovations, roofing, and construction.',
  keywords: [
    'what size dumpster do I need',
    'dumpster size guide',
    'dumpster sizes explained',
    '20 yard vs 30 yard dumpster',
    'how big is a 20 yard dumpster',
    'how big is a 30 yard dumpster',
    'dumpster size for home cleanout',
    'dumpster size for renovation',
    'dumpster size for roofing',
    'choose dumpster size'
  ],
  alternates: {
    canonical: `${config.websiteUrl}/guides/dumpster-sizes`,
  },
  openGraph: {
    title: 'What Size Dumpster Do I Need? | Complete Size Guide',
    description: 'Learn how to choose the right dumpster size for your project. Compare 20 and 30 yard dumpsters with our easy guide.',
    url: `${config.websiteUrl}/guides/dumpster-sizes`,
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
    "headline": "What Size Dumpster Do I Need? Complete Dumpster Size Guide",
    "description": "Learn how to choose the right dumpster size for your project. This guide covers 20 and 30 yard dumpsters for home cleanouts, renovations, roofing, and construction.",
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
      "@id": `${config.websiteUrl}/guides/dumpster-sizes`
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

// ============================================
// PROJECT SIZE RECOMMENDATIONS
// ============================================
const projectGuide = [
  {
    project: 'Garage or Basement Cleanout',
    description: 'Clearing out years of accumulated items, old furniture, boxes, and general junk.',
    recommendedSize: '20 Yard',
    icon: Home,
    tips: 'A 20-yard dumpster holds about 8 pickup truck loads. Perfect for most single-room cleanouts.'
  },
  {
    project: 'Whole House Cleanout',
    description: 'Estate cleanout, moving out, or clearing an entire home of furniture and belongings.',
    recommendedSize: '30 Yard',
    icon: Package,
    tips: 'For a full house, you may need multiple dumpsters or a 30-yard with a swap-out.'
  },
  {
    project: 'Kitchen or Bathroom Remodel',
    description: 'Cabinets, countertops, flooring, drywall, and fixtures from a single room renovation.',
    recommendedSize: '20 Yard',
    icon: HardHat,
    tips: 'Renovation debris is heavier than it looks. Stay under the weight limit with a 20-yard.'
  },
  {
    project: 'Roofing Project (Up to 25 Squares)',
    description: 'Tearing off old shingles from a typical residential roof.',
    recommendedSize: '20 Yard',
    icon: Home,
    tips: 'Shingles are heavy! One square = 100 sq ft. A 2,000 sq ft roof = 20 squares.'
  },
  {
    project: 'Large Roofing Project (25+ Squares)',
    description: 'Commercial roofing or large residential roofs with multiple layers.',
    recommendedSize: '30 Yard',
    icon: HardHat,
    tips: 'For roofs with multiple layers or over 2,500 sq ft, go with the 30-yard.'
  },
  {
    project: 'New Construction or Addition',
    description: 'Building debris, packaging, scrap lumber, drywall, and general construction waste.',
    recommendedSize: '30 Yard',
    icon: HardHat,
    tips: 'Construction projects generate a lot of bulky waste. The 30-yard handles it all.'
  },
  {
    project: 'Deck or Fence Removal',
    description: 'Tearing out an old deck, fence, or similar outdoor structure.',
    recommendedSize: '20 Yard',
    icon: Home,
    tips: 'Wood is bulky but relatively light. A 20-yard is usually plenty for deck removal.'
  },
  {
    project: 'Storm Damage Cleanup',
    description: 'Debris from storm damage including branches, damaged materials, and general cleanup.',
    recommendedSize: '30 Yard',
    icon: Truck,
    tips: 'Storm cleanup often involves more debris than expected. Go bigger to be safe.'
  },
]

export default function DumpsterSizesGuide() {
  return (
    <>
      <ArticleSchema />

      {/* Hero */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm text-dark-500 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/guides/dumpster-sizes" className="text-white">Dumpster Size Guide</Link>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Ruler className="w-8 h-8 text-primary-400" />
              <span className="bg-primary/20 text-primary-300 px-3 py-1 rounded-full text-sm font-medium">
                Complete Guide
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              What Size Dumpster Do I Need?
            </h1>

            <p className="text-xl text-white/90 leading-relaxed">
              Choosing the right dumpster size saves you money and hassle. This guide helps you pick
              between our 20 and 30 yard dumpsters based on your specific project.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Answer */}
      <section className="section bg-primary/10">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Quick Answer: Which Size Do You Need?
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-dark-900 rounded-xl p-6 border-2 border-primary-200">
                <div className="text-center mb-4">
                  <span className="inline-block bg-primary text-white text-2xl font-bold px-4 py-2 rounded-lg">
                    20 Yard
                  </span>
                </div>
                <p className="text-dark-300 mb-4 text-center">Best for most residential projects</p>
                <ul className="space-y-2">
                  {['Garage/basement cleanout', 'Single room renovation', 'Small roofing job', 'Deck removal'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-dark-700 text-center">
                  <p className="text-2xl font-bold text-primary">${config.dumpsters[0]?.pricing['10-day']}</p>
                  <p className="text-sm text-dark-400">10-day rental</p>
                </div>
              </div>

              <div className="bg-dark-900 rounded-xl p-6 border-2 border-amber-200">
                <div className="text-center mb-4">
                  <span className="inline-block bg-amber-500 text-white text-2xl font-bold px-4 py-2 rounded-lg">
                    30 Yard
                  </span>
                </div>
                <p className="text-dark-300 mb-4 text-center">Best for large or commercial projects</p>
                <ul className="space-y-2">
                  {['Whole house cleanout', 'Major renovation', 'New construction', 'Storm cleanup'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-amber-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-dark-700 text-center">
                  <p className="text-2xl font-bold text-amber-600">${config.dumpsters[1]?.pricing['10-day']}</p>
                  <p className="text-sm text-dark-400">10-day rental</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Size Comparison */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Dumpster Size Comparison
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-dark-800">
                    <th className="p-4 text-left font-semibold text-white">Feature</th>
                    <th className="p-4 text-center font-semibold text-white">20 Yard</th>
                    <th className="p-4 text-center font-semibold text-white">30 Yard</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dark-700">
                    <td className="p-4 text-dark-300">Dimensions</td>
                    <td className="p-4 text-center font-medium">22ft x 8ft x 4ft</td>
                    <td className="p-4 text-center font-medium">22ft x 8ft x 6ft</td>
                  </tr>
                  <tr className="border-b border-dark-700 bg-dark-800">
                    <td className="p-4 text-dark-300">Capacity</td>
                    <td className="p-4 text-center font-medium">20 cubic yards</td>
                    <td className="p-4 text-center font-medium">30 cubic yards</td>
                  </tr>
                  <tr className="border-b border-dark-700">
                    <td className="p-4 text-dark-300">Pickup Truck Loads</td>
                    <td className="p-4 text-center font-medium">~8 loads</td>
                    <td className="p-4 text-center font-medium">~12 loads</td>
                  </tr>
                  <tr className="border-b border-dark-700 bg-dark-800">
                    <td className="p-4 text-dark-300">Weight Included</td>
                    <td className="p-4 text-center font-medium">{config.dumpsters[0]?.weightIncluded}</td>
                    <td className="p-4 text-center font-medium">{config.dumpsters[1]?.weightIncluded}</td>
                  </tr>
                  <tr className="border-b border-dark-700">
                    <td className="p-4 text-dark-300">10-Day Price</td>
                    <td className="p-4 text-center font-bold text-primary">${config.dumpsters[0]?.pricing['10-day']}</td>
                    <td className="p-4 text-center font-bold text-primary">${config.dumpsters[1]?.pricing['10-day']}</td>
                  </tr>
                  <tr className="bg-dark-800">
                    <td className="p-4 text-dark-300">Best For</td>
                    <td className="p-4 text-center text-sm">Cleanouts, small renovations</td>
                    <td className="p-4 text-center text-sm">Construction, large projects</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Project Guide */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4 text-center">
              Dumpster Size by Project Type
            </h2>
            <p className="text-dark-300 text-center mb-12 max-w-2xl mx-auto">
              Find your project below to see our recommended dumpster size.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {projectGuide.map((item, index) => (
                <div
                  key={index}
                  className="bg-dark-900 rounded-xl p-6 border border-dark-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{item.project}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          item.recommendedSize === '20 Yard'
                            ? 'bg-primary/20 text-primary-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.recommendedSize}
                        </span>
                      </div>
                      <p className="text-dark-300 text-sm mb-3">{item.description}</p>
                      <p className="text-dark-400 text-xs italic">{item.tips}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Tips for Choosing the Right Size
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">When in Doubt, Size Up</h3>
                    <p className="text-dark-300 text-sm">
                      It's better to have extra space than to need a second dumpster. The price difference
                      between sizes is small compared to ordering an additional container.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Consider the Weight</h3>
                    <p className="text-dark-300 text-sm">
                      Heavy materials like concrete, roofing shingles, and dirt fill up weight limits fast.
                      A half-full dumpster of heavy debris can exceed the weight limit.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Think About Access</h3>
                    <p className="text-dark-300 text-sm">
                      Both sizes are 22 feet long but the 30-yard is taller. Make sure you have room
                      and can easily toss items over the side.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                <Scale className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-white mb-4">Still Not Sure?</h3>
                <p className="text-dark-300 mb-6">
                  Give us a call and describe your project. We've helped hundreds of customers choose
                  the right size and we're happy to help you too.
                </p>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  {config.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Rent Your Dumpster?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Now that you know what size you need, book online in 60 seconds or give us a call.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
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
