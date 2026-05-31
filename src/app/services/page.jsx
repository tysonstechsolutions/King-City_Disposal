import Link from 'next/link'
import Script from 'next/script'
import { config } from '../../config'
import { services } from '../../lib/services'
import {
  ArrowRight,
  Phone,
  Home,
  Hammer,
  Building,
  Trash2,
  Layers,
  TreeDeciduous,
  Box,
} from 'lucide-react'
import BreadcrumbSchema from '../../components/BreadcrumbSchema'

const ICONS = { Home, Hammer, Building, Trash2, Layers, TreeDeciduous, Box }

const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'

const startingPrice = config.dumpsters[0].pricing['10-day']

export const metadata = {
  title: `Dumpster Rental Services in ${config.address.city}, IL`,
  description: `${services.length} dumpster rental services in ${config.address.city}, IL: residential, construction, roofing, junk removal, yard waste, and more. Same-day delivery from $${startingPrice}. Call ${config.phone}.`,
  alternates: { canonical: `${baseUrl}/services` },
  openGraph: {
    title: `Dumpster Rental Services in ${config.address.city}, IL`,
    description: `Residential, construction, roofing, junk removal, concrete, yard waste, estate cleanout. Same-day delivery from $${startingPrice}.`,
    url: `${baseUrl}/services`,
    siteName: config.businessName,
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: `${config.businessName} services` }],
  },
}

function ServicesIndexSchema() {
  // ItemList of services so Google understands this is a category page
  // and may give it sitelinks under the brand search.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: services.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${baseUrl}/services/${s.slug}`,
      name: s.title,
    })),
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${baseUrl}/services` },
    ],
  }
  return (
    <>
      <Script id="services-itemlist" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Script id="services-breadcrumb" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  )
}

export default function ServicesPage() {
  return (
    <>
      <ServicesIndexSchema />
      <BreadcrumbSchema items={[{ name: 'Services', path: '/services' }]} />

      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Dumpster Rental Services in {config.address.city}, IL
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Pick the page that matches your project — every one ships from
            the same fleet and the same prices, but you'll find the details
            and tips that fit your specific job.
          </p>
        </div>
      </section>

      <section className="section bg-dark-900">
        <div className="container-custom max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map(s => {
              const Icon = ICONS[s.icon] || Box
              return (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl p-6 transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="w-6 h-6 text-primary" />
                    <h2 className="text-lg font-semibold text-white">{s.label}</h2>
                  </div>
                  <p className="text-sm text-dark-300 mb-4 line-clamp-2">{s.title}</p>
                  <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-primary-700 py-14">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Not sure which size you need?</h2>
          <p className="text-white/90 max-w-xl mx-auto mb-6">
            Call us — we'll size it right for your project, often saving you money.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`tel:${config.phoneRaw}`}
              data-track-source="services_index_bottom"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-neutral-100 transition-colors"
            >
              <Phone className="w-5 h-5" /> {config.phone}
            </a>
            <Link
              href="/book"
              data-track-cta="services_index_book"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Book Online <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
