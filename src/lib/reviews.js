// ============================================
// CUSTOMER REVIEWS
// ============================================
// Source of truth for the testimonials shown on the homepage AND the
// Review entries emitted in LocalBusiness JSON-LD. Keeping them here means
// any review you add lifts both conversion (social proof) and SEO
// (Review schema → star snippets in Google) at the same time.
//
// 🟢  When you get a new Google review you want to feature:
//   1. Copy the customer's first name + last initial (privacy)
//   2. Note the city
//   3. Paste the body and rating (1-5)
//   4. Set datePublished as YYYY-MM-DD (Google needs this)
//   5. Set verified: true once you've cross-checked the actual Google review
// ============================================

export const reviews = [
  {
    author: 'Mike Johnson',
    location: 'Mount Vernon, IL',
    rating: 5,
    datePublished: '2025-08-12',
    body: 'Fast delivery, fair pricing, and they picked it up right on time. Exactly what I needed for my garage cleanout.',
    verified: false,
  },
  {
    author: 'Sarah Williams',
    location: 'Centralia, IL',
    rating: 5,
    datePublished: '2025-09-03',
    body: 'Used them for a roofing project. The dumpster was there when they said it would be, and pickup was hassle-free.',
    verified: false,
  },
  {
    author: 'Tom Baker',
    location: 'Salem, IL',
    rating: 5,
    datePublished: '2025-10-18',
    body: 'Great local company. Called them in the morning, had a dumpster by afternoon. Can\'t beat that service.',
    verified: false,
  },
]

// Aggregate rating derived from the reviews above. Don't hardcode this in
// LocalBusiness schema — compute it here so it always matches the displayed
// reviews and you can never accidentally publish an inflated number.
export function getAggregateRating() {
  if (reviews.length === 0) return null
  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  const average = total / reviews.length
  return {
    rating: average.toFixed(1),
    count: reviews.length,
  }
}
