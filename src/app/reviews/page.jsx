import Link from 'next/link'
import Script from 'next/script'
import { config } from '../../config'
import { reviews, getAggregateRating } from '../../lib/reviews'
import BreadcrumbSchema from '../../components/BreadcrumbSchema'
import Breadcrumbs from '../../components/Breadcrumbs'
import { Star, ArrowRight, Phone, Quote } from 'lucide-react'

// ============================================
// /reviews PAGE
// ============================================
// Captures the "[business name] reviews" branded-search intent. People
// searching that exact phrase are very close to converting — giving them
// a clean reviews page on the brand domain (vs. only seeing Google /
// Yelp listings) keeps the click on your site.
//
// Two pieces of schema:
//   1. AggregateRating (for the star snippet)
//   2. Per-review Review entries (eligible for the carousel)
// ============================================

const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'
const aggregate = getAggregateRating()

export const metadata = {
  title: `${config.businessName} Reviews | ${aggregate?.rating || '5.0'} Stars from ${aggregate?.count || 0} Customers`,
  description: `Read real customer reviews of ${config.businessName} dumpster rental service in ${config.address.city}, IL and Southern Illinois. ${aggregate?.rating || '5.0'} stars from ${aggregate?.count || 0} reviews.`,
  alternates: { canonical: `${baseUrl}/reviews` },
  openGraph: {
    title: `${config.businessName} Reviews — ${aggregate?.rating || '5.0'} Stars`,
    description: `Real customer reviews of ${config.businessName} dumpster rental service in Southern Illinois.`,
    url: `${baseUrl}/reviews`,
    type: 'website',
  },
}

function ReviewsSchema() {
  // Page-level review aggregate so this URL itself qualifies for a star
  // snippet, not just the homepage / LocalBusiness entity.
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}/#localbusiness`,
    "name": config.businessName,
    "url": baseUrl,
    "telephone": config.phoneRaw,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": config.address.city,
      "addressRegion": config.address.state,
      "addressCountry": "US",
    },
    ...(aggregate ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": aggregate.rating,
        "reviewCount": aggregate.count,
        "bestRating": "5",
        "worstRating": "1",
      },
    } : {}),
    "review": reviews.map(r => ({
      "@type": "Review",
      "author": { "@type": "Person", "name": r.author },
      "datePublished": r.datePublished,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": String(r.rating),
        "bestRating": "5",
        "worstRating": "1",
      },
      "reviewBody": r.body,
    })),
  }

  return (
    <Script
      id="reviews-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

function renderStars(rating) {
  return [...Array(5)].map((_, i) => (
    <Star
      key={i}
      className={`w-5 h-5 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-dark-600'}`}
      aria-hidden="true"
    />
  ))
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export default function ReviewsPage() {
  return (
    <>
      <ReviewsSchema />
      <BreadcrumbSchema items={[{ name: 'Reviews', path: '/reviews' }]} />

      {/* Hero with aggregate rating */}
      <section className="bg-primary-700 text-white py-16">
        <div className="container-custom text-center">
          <Breadcrumbs items={[{ name: 'Reviews', path: '/reviews' }]} className="mb-6 justify-center" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {config.businessName} Reviews
          </h1>
          {aggregate && (
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex gap-1">{renderStars(Number(aggregate.rating))}</div>
              <span className="text-3xl font-bold">{aggregate.rating}</span>
              <span className="text-white/80">/ 5</span>
            </div>
          )}
          <p className="text-xl text-white/90">
            {aggregate ? `Based on ${aggregate.count} customer review${aggregate.count === 1 ? '' : 's'}` : 'Real reviews from real customers'}
          </p>
        </div>
      </section>

      {/* Reviews list */}
      <section className="section bg-dark-900">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            {reviews.length === 0 ? (
              <div className="text-center text-dark-300 py-16">
                <p>No reviews to display yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article
                    key={review.author + review.datePublished}
                    className="bg-dark-800 rounded-xl border border-dark-700 p-6"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex gap-1 mb-2" aria-label={`${review.rating} out of 5 stars`}>
                          {renderStars(review.rating)}
                        </div>
                        <h2 className="font-semibold text-white text-lg">{review.author}</h2>
                        <p className="text-sm text-dark-400">{review.location}</p>
                      </div>
                      <time
                        dateTime={review.datePublished}
                        className="text-sm text-dark-500 flex-shrink-0"
                      >
                        {formatDate(review.datePublished)}
                      </time>
                    </div>
                    <div className="flex gap-3">
                      <Quote className="w-6 h-6 text-dark-600 flex-shrink-0" aria-hidden="true" />
                      <p className="text-dark-200 leading-relaxed">{review.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Leave-a-review prompt */}
      <section className="section bg-dark-800">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto bg-dark-900 border border-dark-700 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Worked with us recently?</h2>
            <p className="text-dark-300 mb-6">
              We&apos;d genuinely appreciate a review. Honest feedback helps other
              folks in {config.address.city} and Southern Illinois find us.
            </p>
            {config.googlePlaceId ? (
              <a
                href={`https://search.google.com/local/writereview?placeid=${config.googlePlaceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Leave a Google Review <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <a
                href={`tel:${config.phoneRaw}`}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" /> Call {config.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-12">
        <div className="container-custom text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to join our happy customers?
          </h2>
          <Link
            href="/book"
            className="inline-flex items-center justify-center gap-2 bg-dark-900 hover:bg-dark-800 text-primary font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Book a Dumpster <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  )
}
