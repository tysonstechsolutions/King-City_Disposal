// ============================================
// DYNAMIC SITEMAP GENERATION
// ============================================
// This generates an XML sitemap that Google uses to discover all pages.
// Next.js automatically serves this at /sitemap.xml
//
// Why this matters:
// - Helps Google find all your pages faster
// - Tells Google which pages are most important (priority)
// - Shows when pages were last updated
// ============================================

import { config } from '../config'

// Helper to create URL-friendly slug from town name
function slugify(town) {
  return town
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default async function sitemap() {
  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'
  const currentDate = new Date().toISOString()

  // ============================================
  // STATIC PAGES - Core site pages
  // ============================================
  const staticPages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/dumpsters`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/service-area`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/book`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]

  // ============================================
  // LOCATION PAGES - One page per service town
  // These are CRITICAL for local SEO!
  // ============================================
  const locationPages = config.serviceTowns.map((town) => ({
    url: `${baseUrl}/dumpster-rental/${slugify(town)}-il`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // ============================================
  // DUMPSTER SIZE PAGES - Dedicated pages per size
  // ============================================
  const dumpsterPages = config.dumpsters.map((dumpster) => ({
    url: `${baseUrl}/dumpsters/${dumpster.id}`,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // ============================================
  // GUIDE PAGES - Informational content for SEO
  // ============================================
  const guidePages = [
    {
      url: `${baseUrl}/guides/dumpster-sizes`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guides/dumpster-rental-cost`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  // ============================================
  // COMBINE ALL PAGES
  // ============================================
  return [
    ...staticPages,
    ...locationPages,
    ...dumpsterPages,
    ...guidePages,
  ]
}
