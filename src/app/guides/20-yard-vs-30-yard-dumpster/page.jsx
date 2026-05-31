import Link from 'next/link'
import Script from 'next/script'
import { config } from '../../../config'
import RelatedLinks from '../../../components/RelatedLinks'
import Breadcrumbs from '../../../components/Breadcrumbs'
import {
  Truck,
  Check,
  X,
  ArrowRight,
  Phone,
  Ruler,
  Scale,
  Home,
  Hammer,
  Package,
} from 'lucide-react'

// ============================================
// 20 YARD VS 30 YARD COMPARISON
// ============================================
// Targets the "20 vs 30 yard dumpster" search intent — high-volume,
// high-purchase-intent query. People comparing sizes are days or hours
// away from booking.
//
// Article + FAQ schema both emit; the page is eligible for "People also
// ask" placements as well as the standard article rich snippet.
// ============================================

const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'
const url = `${baseUrl}/guides/20-yard-vs-30-yard-dumpster`

const twentyYd = config.dumpsters.find(d => d.id === '20yd')
const thirtyYd = config.dumpsters.find(d => d.id === '30yd')

export const metadata = {
  title: '20 vs 30 Yard Dumpster: Which Size Do You Need? | Side-by-Side Comparison',
  description: `Side-by-side comparison of 20-yard vs 30-yard roll-off dumpsters. Dimensions, weight limits, capacity, and the projects each one handles best. Pricing from $${twentyYd.pricing['10-day']} in ${config.address.city}, IL.`,
  keywords: [
    '20 yard vs 30 yard dumpster',
    '20 vs 30 yard dumpster',
    'what size dumpster do i need',
    '20 yard dumpster size',
    '30 yard dumpster size',
    'dumpster comparison',
  ],
  alternates: { canonical: url },
  openGraph: {
    title: '20 vs 30 Yard Dumpster — Side-by-Side Comparison',
    description: 'Dimensions, weight limits, capacity, and the projects each size best handles. Make the right choice the first time.',
    url,
    type: 'article',
  },
}

function ComparisonSchemas() {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "20 vs 30 Yard Dumpster: Which Size Do You Need?",
    "description": "Side-by-side comparison of 20- and 30-yard roll-off dumpsters covering dimensions, weight limits, and best-fit projects.",
    "author": { "@type": "Organization", "name": config.businessName },
    "publisher": { "@type": "Organization", "name": config.businessName, "url": baseUrl },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "datePublished": "2026-05-30",
    "dateModified": "2026-05-30",
    "image": `${baseUrl}/og-image.jpg`,
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the difference between a 20 and 30 yard dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Both are 22 ft long × 8 ft wide. The 20-yard is 4 ft tall (20 cubic yards / about 8 pickup-truck loads), and the 30-yard is 6 ft tall (30 cubic yards / about 12 pickup-truck loads). Both include ${twentyYd.weightIncluded} of disposal.`,
        },
      },
      {
        "@type": "Question",
        "name": "Which dumpster size do I need for a home cleanout?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "For a single garage, basement, or one-room cleanout, the 20-yard is almost always enough. For a whole-house estate cleanout, full renovation, or hoarding remediation, go with the 30-yard — it holds about 50% more volume but takes the same parking footprint.",
        },
      },
      {
        "@type": "Question",
        "name": "How much heavier is a 30 yard dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Both sizes include the same ${twentyYd.weightIncluded} of disposal weight included in the rental price. The 30-yard holds more volume (50% more cubic yards), but the included weight allowance is identical — extra tons are charged at $${twentyYd.weightOverage}/ton over the included amount.`,
        },
      },
      {
        "@type": "Question",
        "name": "Is a 30 yard dumpster more expensive than a 20 yard?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Yes — the 20-yard is $${twentyYd.pricing['10-day']} for a 10-day rental and the 30-yard is $${thirtyYd.pricing['10-day']}. The price difference is small relative to the extra capacity (50% more volume for about ${Math.round(((thirtyYd.pricing['10-day'] - twentyYd.pricing['10-day']) / twentyYd.pricing['10-day']) * 100)}% more cost), so if you're between sizes the 30-yard is usually the better value.`,
        },
      },
      {
        "@type": "Question",
        "name": "Do I need a permit for either size dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No permit is required for either size when placed on private property (driveway, yard, parking lot). If the dumpster needs to sit on a public street, check with your city — most Southern Illinois municipalities require a short-term permit. Call us and we'll help you figure it out.",
        },
      },
    ],
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",   "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Guides", "item": `${baseUrl}/guides/20-yard-vs-30-yard-dumpster` },
      { "@type": "ListItem", "position": 3, "name": "20 vs 30 Yard Dumpster", "item": url },
    ],
  }

  return (
    <>
      <Script id="comparison-article" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <Script id="comparison-faq" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="comparison-breadcrumb" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  )
}

const projectsByBestSize = [
  { project: 'Garage cleanout', icon: Home,    best: '20yd', why: 'Holds ~8 pickup loads — enough for most single-garage clears.' },
  { project: 'Basement cleanout', icon: Home,  best: '20yd', why: 'Same volume as a garage clear in most homes.' },
  { project: 'Single-room remodel', icon: Hammer, best: '20yd', why: 'Cabinets, flooring, drywall from one room.' },
  { project: 'Roof tear-off (up to 25 squares)', icon: Hammer, best: '20yd', why: 'Shingles are heavy — 20yd keeps you under the included tonnage.' },
  { project: 'Whole-house cleanout', icon: Package, best: '30yd', why: '50% more volume — fits an entire home of furniture and debris.' },
  { project: 'Multi-room renovation', icon: Hammer, best: '30yd', why: 'Cabinets, fixtures, and demo waste from a major remodel.' },
  { project: 'New construction debris', icon: Hammer, best: '30yd', why: 'Lumber scraps, drywall, packaging — high volume, low weight.' },
  { project: 'Hoarding / estate cleanout', icon: Package, best: '30yd', why: 'Highest-volume case — often needs a second dumpster on swap.' },
  { project: 'Commercial cleanout', icon: Package, best: '30yd', why: 'Office or storefront clears benefit from extra capacity.' },
]

export default function ComparisonGuide() {
  return (
    <>
      <ComparisonSchemas />

      {/* Hero */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <Breadcrumbs
              items={[
                { name: 'Guides', path: '/guides/dumpster-sizes' },
                { name: '20 vs 30 Yard', path: '/guides/20-yard-vs-30-yard-dumpster' },
              ]}
              className="mb-6"
            />
            <p className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-2">Size Comparison</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              20 vs 30 Yard Dumpster: Which Do You Need?
            </h1>
            <p className="text-xl text-white/90">
              Same length, same width, same included weight. Different heights —
              and that&apos;s the difference that decides which one fits your project.
            </p>
          </div>
        </div>
      </section>

      {/* Side-by-side spec table */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Side-by-side specs
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                <thead>
                  <tr className="bg-dark-700">
                    <th scope="col" className="text-left py-4 px-6 text-dark-300 font-medium">Feature</th>
                    <th scope="col" className="text-center py-4 px-6 text-white font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <Truck className="w-6 h-6 text-primary" />
                        <span>20-Yard</span>
                      </div>
                    </th>
                    <th scope="col" className="text-center py-4 px-6 text-white font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <Truck className="w-6 h-6 text-primary" />
                        <span>30-Yard</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  <tr>
                    <td className="py-4 px-6 text-dark-300 flex items-center gap-2"><Ruler className="w-4 h-4" /> Dimensions</td>
                    <td className="py-4 px-6 text-center text-white">{twentyYd.dimensions.display}</td>
                    <td className="py-4 px-6 text-center text-white">{thirtyYd.dimensions.display}</td>
                  </tr>
                  <tr className="bg-dark-900/40">
                    <td className="py-4 px-6 text-dark-300">Capacity</td>
                    <td className="py-4 px-6 text-center text-white">{twentyYd.capacity}</td>
                    <td className="py-4 px-6 text-center text-white">{thirtyYd.capacity}</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-dark-300">Wheelbarrow loads</td>
                    <td className="py-4 px-6 text-center text-white">{twentyYd.wheelbarrowLoads}</td>
                    <td className="py-4 px-6 text-center text-white">{thirtyYd.wheelbarrowLoads}</td>
                  </tr>
                  <tr className="bg-dark-900/40">
                    <td className="py-4 px-6 text-dark-300 flex items-center gap-2"><Scale className="w-4 h-4" /> Weight included</td>
                    <td className="py-4 px-6 text-center text-white">{twentyYd.weightIncluded}</td>
                    <td className="py-4 px-6 text-center text-white">{thirtyYd.weightIncluded}</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-dark-300">Weight overage rate</td>
                    <td className="py-4 px-6 text-center text-white">${twentyYd.weightOverage}/ton</td>
                    <td className="py-4 px-6 text-center text-white">${thirtyYd.weightOverage}/ton</td>
                  </tr>
                  <tr className="bg-dark-900/40">
                    <td className="py-4 px-6 text-dark-300">10-day rental price</td>
                    <td className="py-4 px-6 text-center text-2xl font-bold text-primary">${twentyYd.pricing['10-day']}</td>
                    <td className="py-4 px-6 text-center text-2xl font-bold text-primary">${thirtyYd.pricing['10-day']}</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-dark-300">Extension rate</td>
                    <td className="py-4 px-6 text-center text-white">${twentyYd.extensionRate}/week</td>
                    <td className="py-4 px-6 text-center text-white">${thirtyYd.extensionRate}/week</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* The honest difference */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">The one real difference: height</h2>
            <div className="space-y-4 text-dark-200 text-lg leading-relaxed">
              <p>
                Both dumpsters sit on the same {twentyYd.dimensions.length} × {twentyYd.dimensions.width} ft footprint. They use the same trucks, same drop locations, same trip cost. From a logistics perspective they&apos;re nearly identical for us.
              </p>
              <p>
                What changes is height: the 20-yard is {twentyYd.dimensions.height} ft tall, the 30-yard is {thirtyYd.dimensions.height} ft tall. That&apos;s why the 30-yard holds 50% more cubic yards — same floor area, just taller walls.
              </p>
              <p>
                <strong className="text-white">For loading:</strong> the 20-yard&apos;s 4-ft walls are easier to throw debris over. The 30-yard&apos;s 6-ft walls usually need you to climb in or load from one end.
              </p>
              <p>
                <strong className="text-white">For weight:</strong> both include the same {twentyYd.weightIncluded}. If your project is heavy (concrete, dirt, shingles), getting a 30-yard doesn&apos;t buy you more weight allowance — you&apos;ll just hit the overage rate sooner. For dense materials, get the 20-yard and accept the weight overage when it happens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Project-by-project recommendations */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Which size for your project?
          </h2>
          <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
            {projectsByBestSize.map(({ project, icon: Icon, best, why }) => (
              <div key={project} className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-white">{project}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${best === '20yd' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                        {best === '20yd' ? '20yd' : '30yd'}
                      </span>
                    </div>
                    <p className="text-sm text-dark-300">{why}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* When in doubt rule */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-primary/10 border border-primary/30 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">When in doubt, go up a size</h2>
            <p className="text-dark-200 leading-relaxed">
              Renting a too-big dumpster costs ~${thirtyYd.pricing['10-day'] - twentyYd.pricing['10-day']} more. Renting a too-small one and needing a second dumpster costs ${twentyYd.pricing['10-day']}+ in disposal plus another delivery fee. Math always favors going up.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">Common questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'What is the difference between a 20 and 30 yard dumpster?',
                  a: `Same footprint (${twentyYd.dimensions.length} × ${twentyYd.dimensions.width} ft), different heights. 20-yard is ${twentyYd.dimensions.height} ft tall (20 cubic yards), 30-yard is ${thirtyYd.dimensions.height} ft tall (30 cubic yards). Both include ${twentyYd.weightIncluded} of weight.`,
                },
                {
                  q: 'Which size do I need for a home cleanout?',
                  a: 'For a single garage, basement, or one-room cleanout, the 20-yard handles it. For a whole-house estate cleanout or major renovation, go with the 30-yard.',
                },
                {
                  q: 'Is a 30 yard dumpster more expensive?',
                  a: `Yes — the 20-yard is $${twentyYd.pricing['10-day']} and the 30-yard is $${thirtyYd.pricing['10-day']}. About ${Math.round(((thirtyYd.pricing['10-day'] - twentyYd.pricing['10-day']) / twentyYd.pricing['10-day']) * 100)}% more for 50% more volume — usually the better value if you're between sizes.`,
                },
                {
                  q: 'Do I need a permit?',
                  a: "Not for either size when placed on private property. If it needs to go on a public street, check with your city — most Southern Illinois towns require a short-term permit. We can help you figure it out.",
                },
              ].map((item) => (
                <div key={item.q} className="bg-dark-800 rounded-xl border border-dark-700 p-6">
                  <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                  <p className="text-dark-300 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to book?</h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Pick your size, drop a pin on the map, and we&apos;ll deliver. Same-day available for orders before noon.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Book Online <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-semibold py-4 px-8 rounded-lg transition-colors border border-primary-500"
            >
              <Phone className="w-5 h-5" /> {config.phone}
            </a>
          </div>
        </div>
      </section>

      <RelatedLinks
        heading="Keep reading"
        items={[
          { href: '/guides/dumpster-sizes', title: 'Complete dumpster size guide', description: 'Project-by-project size recommendations with examples.' },
          { href: '/guides/dumpster-rental-cost', title: 'How much does a dumpster rental cost?', description: 'Real pricing breakdown and what drives the bill.' },
          { href: '/pricing', title: 'See our pricing', description: 'Transparent flat-rate pricing for every size.' },
          { href: '/book', title: 'Book a dumpster', description: 'Online booking in under 2 minutes with map placement.' },
        ]}
      />
    </>
  )
}
