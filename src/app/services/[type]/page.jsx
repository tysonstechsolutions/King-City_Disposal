import Link from 'next/link'
import Script from 'next/script'
import { notFound } from 'next/navigation'
import { config } from '../../../config'
import { services, getService } from '../../../lib/services'
import {
  Phone,
  CheckCircle2,
  ArrowRight,
  Truck,
  Clock,
  MapPin,
} from 'lucide-react'

// Pre-render every service page at build time. This is the whole point of
// generateStaticParams — the URLs need to exist for Google to crawl them
// even before anyone visits.
export function generateStaticParams() {
  return services.map(s => ({ type: s.slug }))
}

export async function generateMetadata({ params }) {
  const svc = getService(params.type, {
    city: config.address.city,
    phone: config.phone,
    business: config.businessName,
  })
  if (!svc) {
    return { title: 'Service not found' }
  }

  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'
  return {
    title: svc.metaTitle,
    description: svc.metaDescription,
    alternates: {
      canonical: `${baseUrl}/services/${svc.slug}`,
    },
    openGraph: {
      title: svc.metaTitle,
      description: svc.metaDescription,
      url: `${baseUrl}/services/${svc.slug}`,
      siteName: config.businessName,
      locale: 'en_US',
      type: 'website',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: svc.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: svc.metaTitle,
      description: svc.metaDescription,
      images: ['/og-image.jpg'],
    },
  }
}

// Service + FAQ + Breadcrumb schema together — all of these can render
// rich results, and you want as many as Google will give you.
function ServiceSchema({ svc, baseUrl }) {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: svc.title,
    description: svc.metaDescription,
    serviceType: svc.title,
    provider: {
      '@type': 'LocalBusiness',
      '@id': `${config.websiteUrl}/#localbusiness`,
      name: config.businessName,
      telephone: config.phoneRaw,
    },
    areaServed: config.serviceTowns.slice(0, 20).map(t => ({
      '@type': 'City',
      name: t,
      containedInPlace: { '@type': 'State', name: 'Illinois' },
    })),
    url: `${baseUrl}/services/${svc.slug}`,
    offers: config.dumpsters.map(d => ({
      '@type': 'Offer',
      name: `${d.name} for ${svc.title}`,
      price: d.pricing['10-day'],
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    })),
    ...(config.reviews?.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: config.reviews.rating || '5.0',
            reviewCount: config.reviews.count,
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: svc.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${baseUrl}/services` },
      { '@type': 'ListItem', position: 3, name: svc.label,  item: `${baseUrl}/services/${svc.slug}` },
    ],
  }

  return (
    <>
      <Script id="svc-schema" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <Script id="svc-faq" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="svc-breadcrumb" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  )
}

export default function ServiceDetailPage({ params }) {
  const svc = getService(params.type, {
    city: config.address.city,
    phone: config.phone,
    business: config.businessName,
  })
  if (!svc) notFound()

  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'
  const otherServices = services
    .filter(s => s.slug !== svc.slug)
    .slice(0, 3)
    .map(s => ({ slug: s.slug, label: s.label }))

  return (
    <>
      <ServiceSchema svc={svc} baseUrl={baseUrl} />

      {/* Hero */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-white/70 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-white">Services</Link>
            <span>/</span>
            <span className="text-white">{svc.label}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{svc.h1}</h1>
          <p className="text-xl text-white/90 max-w-3xl mb-8">{svc.intro}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/book"
              data-track-cta={`service_${svc.slug}_hero_book`}
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-neutral-100 transition-colors"
            >
              Book Online <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              data-track-source={`service_${svc.slug}_hero`}
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              <Phone className="w-5 h-5" /> Call {config.phone}
            </a>
          </div>
        </div>
      </section>

      {/* What fits / Why us */}
      <section className="section bg-dark-900">
        <div className="container-custom grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">What fits in this dumpster</h2>
            <ul className="space-y-3">
              {svc.whatFits.map((item, i) => (
                <li key={i} className="flex gap-3 text-dark-200">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Why pick {config.businessName}</h2>
            <ul className="space-y-3">
              {svc.whyUs.map((item, i) => (
                <li key={i} className="flex gap-3 text-dark-200">
                  <Truck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-dark-800 border-y border-dark-700 py-10">
        <div className="container-custom grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-center text-white">
          <div className="flex flex-col items-center gap-2">
            <Clock className="w-7 h-7 text-primary" />
            <p className="font-semibold">Same-day delivery</p>
            <p className="text-sm text-dark-300">Order before noon, get it today</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <MapPin className="w-7 h-7 text-primary" />
            <p className="font-semibold">Locally owned in {config.address.city}, IL</p>
            <p className="text-sm text-dark-300">Real humans answer the phone</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-primary" />
            <p className="font-semibold">Flat pricing, no surprises</p>
            <p className="text-sm text-dark-300">From $475 with delivery + pickup</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-dark-900">
        <div className="container-custom max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Common questions about {svc.title.toLowerCase()}
          </h2>
          <div className="space-y-4">
            {svc.faq.map((f, i) => (
              <details key={i} className="bg-dark-800 rounded-xl p-6 border border-dark-700 group">
                <summary className="text-lg font-semibold text-white cursor-pointer list-none flex justify-between items-start gap-4">
                  <span>{f.q}</span>
                  <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-dark-300 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-primary-700 py-14">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            Ready to book?
          </h2>
          <p className="text-white/90 max-w-xl mx-auto mb-6">
            Pick a size, pick a date, and we’ll bring the dumpster. Most {svc.label.toLowerCase()} jobs are loaded and gone within the standard 10-day rental.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              data-track-cta={`service_${svc.slug}_bottom_book`}
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-neutral-100 transition-colors"
            >
              Book Now <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`tel:${config.phoneRaw}`}
              data-track-source={`service_${svc.slug}_bottom`}
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              <Phone className="w-5 h-5" /> {config.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Cross-links */}
      <section className="section bg-dark-900">
        <div className="container-custom max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Other services we offer
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {otherServices.map(s => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl p-4 text-center text-white font-medium transition-colors"
              >
                {s.label}
              </Link>
            ))}
            <Link
              href="/services"
              className="bg-primary/10 hover:bg-primary/20 border border-primary/40 rounded-xl p-4 text-center text-primary font-medium transition-colors"
            >
              All services →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
