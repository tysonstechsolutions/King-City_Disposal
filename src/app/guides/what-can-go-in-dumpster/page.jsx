import Link from 'next/link'
import Script from 'next/script'
import { config } from '../../../config'
import RelatedLinks from '../../../components/RelatedLinks'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  ArrowRight,
  Trash2,
  Leaf,
  Zap,
  Droplets,
  Package,
  Sofa,
  HardHat
} from 'lucide-react'

// ============================================
// METADATA - Targeting "what can go in a dumpster"
// ============================================
export const metadata = {
  title: 'What Can Go in a Dumpster? | Accepted & Prohibited Items Guide',
  description: 'Complete guide to what you can and cannot throw in a dumpster in Illinois. Learn about accepted items, prohibited materials, and items with extra fees. Avoid fines!',
  keywords: [
    'what can go in a dumpster',
    'what can you put in a dumpster',
    'dumpster prohibited items',
    'what cannot go in a dumpster',
    'dumpster accepted items',
    'can I throw away',
    'dumpster rental rules',
    'Illinois dumpster regulations',
    'items not allowed in dumpster',
    'dumpster do\'s and don\'ts'
  ],
  alternates: {
    canonical: `${config.websiteUrl}/guides/what-can-go-in-dumpster`,
  },
  openGraph: {
    title: 'What Can Go in a Dumpster? Complete Guide to Accepted & Prohibited Items',
    description: 'Know what you can throw away before you rent. Complete list of accepted items, prohibited materials, and surcharge items.',
    url: `${config.websiteUrl}/guides/what-can-go-in-dumpster`,
    type: 'article',
  },
}

// ============================================
// SCHEMAS
// ============================================
function ArticleSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "What Can Go in a Dumpster? Complete Guide to Accepted & Prohibited Items",
    "description": "Learn what items are accepted, prohibited, and subject to extra fees when renting a dumpster in Southern Illinois.",
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
      "@id": `${config.websiteUrl}/guides/what-can-go-in-dumpster`
    },
    "datePublished": "2026-03-01",
    "dateModified": "2026-05-30",
    "image": `${config.websiteUrl}/og-image.jpg`,
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",   "item": config.websiteUrl },
      { "@type": "ListItem", "position": 2, "name": "Guides", "item": `${config.websiteUrl}/guides/what-can-go-in-dumpster` },
      { "@type": "ListItem", "position": 3, "name": "What Can Go in a Dumpster", "item": `${config.websiteUrl}/guides/what-can-go-in-dumpster` },
    ],
  }

  return (
    <>
      <Script
        id="article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Script
        id="article-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  )
}

function FAQSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Can I put furniture in a dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Most furniture like tables, chairs, desks, and bookshelves can go in the dumpster. However, mattresses, box springs, and upholstered furniture like couches have a $25-$40 surcharge due to special disposal requirements."
        }
      },
      {
        "@type": "Question",
        "name": "Can I throw away a TV or computer in a dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Electronics including TVs, computers, monitors, and printers are banned from Illinois landfills since 2012. These must be recycled at an e-waste facility."
        }
      },
      {
        "@type": "Question",
        "name": "Can I put concrete or bricks in a dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Contact us first. Concrete, brick, and dirt are extremely heavy and may exceed weight limits quickly. We offer special pricing for heavy materials - call for a quote."
        }
      },
      {
        "@type": "Question",
        "name": "What happens if I put prohibited items in the dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Prohibited items must be removed before we can haul the dumpster. You may be charged additional fees for removal and proper disposal. In some cases, fines can be issued by the EPA for hazardous materials."
        }
      },
      {
        "@type": "Question",
        "name": "Can yard waste go in a dumpster?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Yard waste including grass clippings, leaves, and brush has been banned from Illinois landfills since 1990. This must be composted or taken to a yard waste facility."
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
// ACCEPTED ITEMS
// ============================================
const acceptedItems = [
  {
    category: 'Household Items',
    icon: Package,
    items: [
      'Furniture (tables, chairs, desks, shelves)',
      'Clothing and textiles',
      'Books, papers, cardboard',
      'Toys and games',
      'Dishes, glassware, cookware',
      'Small appliances (toasters, microwaves)',
      'Lamps and light fixtures',
      'Rugs and carpeting'
    ]
  },
  {
    category: 'Construction Debris',
    icon: HardHat,
    items: [
      'Drywall and sheetrock',
      'Lumber and wood scraps',
      'Roofing shingles',
      'Siding and trim',
      'Doors and windows (no glass)',
      'Cabinets and countertops',
      'Flooring (tile, hardwood, laminate)',
      'Insulation (non-asbestos)'
    ]
  },
  {
    category: 'General Junk',
    icon: Trash2,
    items: [
      'Household trash and garbage',
      'Old decorations',
      'Sporting equipment',
      'Garden tools and hoses',
      'Plastic items',
      'Non-hazardous cleaning supplies (empty)',
      'Packaging materials',
      'Broken items and debris'
    ]
  }
]

// ============================================
// SURCHARGE ITEMS
// ============================================
const surchargeItems = [
  { item: 'Mattress', fee: '$40 each', reason: 'Special disposal required' },
  { item: 'Box Spring', fee: '$40 each', reason: 'Special disposal required' },
  { item: 'Couch / Sofa', fee: '$25 each', reason: 'Upholstery disposal fee' },
  { item: 'Recliner / Upholstered Chair', fee: '$25 each', reason: 'Upholstery disposal fee' },
  { item: 'Concrete / Brick / Dirt', fee: 'Call for quote', reason: 'Extremely heavy - may exceed weight limits' },
]

export default function WhatCanGoInDumpsterGuide() {
  return (
    <>
      <ArticleSchema />
      <FAQSchema />

      {/* Hero */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm text-dark-500 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/guides/what-can-go-in-dumpster" className="text-white">What Can Go in a Dumpster</Link>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-8 h-8 text-primary-400" />
              <span className="bg-primary/20 text-primary-300 px-3 py-1 rounded-full text-sm font-medium">
                Complete Guide
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              What Can Go in a Dumpster?
            </h1>

            <p className="text-xl text-white/90 leading-relaxed">
              Know what you can throw away before you start loading. This guide covers accepted items,
              prohibited materials (Illinois law), and items with extra fees.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Summary */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-primary/10 border border-primary-300 rounded-xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Accepted</h2>
                <p className="text-dark-300 text-sm">Household junk, furniture, construction debris, general trash</p>
              </div>

              <div className="bg-amber-900/20 border border-amber-300 rounded-xl p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Extra Fee</h2>
                <p className="text-dark-300 text-sm">Mattresses, couches, heavy materials like concrete</p>
              </div>

              <div className="bg-red-900/20 border border-red-300 rounded-xl p-6 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Prohibited</h2>
                <p className="text-dark-300 text-sm">Hazardous waste, electronics, tires, yard waste, liquids</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accepted Items */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <CheckCircle className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold text-white">What You CAN Put in a Dumpster</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {acceptedItems.map((category, index) => (
                <div key={index} className="bg-dark-900 rounded-xl p-6 border border-dark-700">
                  <div className="flex items-center gap-3 mb-4">
                    <category.icon className="w-6 h-6 text-primary" />
                    <h3 className="font-semibold text-white">{category.category}</h3>
                  </div>
                  <ul className="space-y-2">
                    {category.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-dark-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Surcharge Items */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <h2 className="text-3xl font-bold text-white">Items with Extra Fees</h2>
            </div>
            <p className="text-dark-300 mb-8">
              These items ARE allowed but require an additional fee due to special disposal requirements.
            </p>

            <div className="bg-dark-800 rounded-xl overflow-hidden border border-dark-700">
              <table className="w-full">
                <thead>
                  <tr className="bg-amber-900/20">
                    <th className="p-4 text-left font-semibold text-white">Item</th>
                    <th className="p-4 text-center font-semibold text-white">Fee</th>
                    <th className="p-4 text-left font-semibold text-white hidden md:table-cell">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {surchargeItems.map((item, index) => (
                    <tr key={index} className="border-t border-dark-700">
                      <td className="p-4 text-dark-200">{item.item}</td>
                      <td className="p-4 text-center font-semibold text-amber-500">{item.fee}</td>
                      <td className="p-4 text-dark-400 text-sm hidden md:table-cell">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Prohibited Items */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <XCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-3xl font-bold text-white">Prohibited Items (Illinois Law)</h2>
            </div>
            <p className="text-dark-300 mb-8">
              These items are <strong>banned by Illinois EPA regulations</strong> and CANNOT go in the dumpster.
              Violations can result in fines.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {config.prohibitedItems.map((prohibited, index) => (
                <div key={index} className="flex items-start gap-3 bg-red-900/10 border border-red-900/30 rounded-lg p-4">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">{prohibited.item}</p>
                    <p className="text-sm text-dark-400">{prohibited.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              <details className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden group">
                <summary className="p-6 cursor-pointer font-semibold text-white flex items-center justify-between">
                  Can I put furniture in a dumpster?
                  <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-6 text-dark-300">
                  Yes! Most furniture like tables, chairs, desks, and bookshelves can go in the dumpster.
                  However, mattresses, box springs, and upholstered furniture like couches have a surcharge
                  due to special disposal requirements.
                </div>
              </details>

              <details className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden group">
                <summary className="p-6 cursor-pointer font-semibold text-white flex items-center justify-between">
                  Can I throw away a TV or computer?
                  <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-6 text-dark-300">
                  No. Electronics including TVs, computers, monitors, and printers have been banned from
                  Illinois landfills since 2012. These must be recycled at an e-waste facility.
                </div>
              </details>

              <details className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden group">
                <summary className="p-6 cursor-pointer font-semibold text-white flex items-center justify-between">
                  Can I put concrete or bricks in a dumpster?
                  <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-6 text-dark-300">
                  Contact us first. Concrete, brick, and dirt are extremely heavy and may exceed weight
                  limits quickly. We offer special pricing for heavy materials - call {config.phone} for a quote.
                </div>
              </details>

              <details className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden group">
                <summary className="p-6 cursor-pointer font-semibold text-white flex items-center justify-between">
                  What happens if I put prohibited items in the dumpster?
                  <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-6 text-dark-300">
                  Prohibited items must be removed before we can haul the dumpster. You may be charged
                  additional fees for removal and proper disposal. In some cases, fines can be issued
                  by the EPA for hazardous materials.
                </div>
              </details>

              <details className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden group">
                <summary className="p-6 cursor-pointer font-semibold text-white flex items-center justify-between">
                  Can yard waste go in a dumpster?
                  <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-6 text-dark-300">
                  No. Yard waste including grass clippings, leaves, and brush has been banned from Illinois
                  landfills since 1990. This must be composted or taken to a yard waste facility.
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Have Questions About Your Items?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Not sure if something can go in the dumpster? Give us a call and we&apos;ll help you figure it out.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-4 px-8 rounded-lg transition-colors"
            >
              Book Your Dumpster
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

      <RelatedLinks
        heading="Keep reading"
        items={[
          { href: '/guides/dumpster-sizes', title: 'What size dumpster do I need?', description: 'Project-by-project size recommendations for cleanouts, renovations, and roofing.' },
          { href: '/guides/dumpster-rental-cost', title: 'How much does a dumpster rental cost?', description: 'Real pricing, what drives it up, how to avoid surprise fees.' },
          { href: '/pricing', title: 'See our pricing', description: 'Transparent pricing for every dumpster size — no hidden fees.' },
          { href: '/faq', title: 'Frequently asked questions', description: 'Detailed answers about weight limits, extensions, prohibited items, and more.' },
        ]}
      />
    </>
  )
}
