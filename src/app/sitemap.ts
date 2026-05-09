import { MetadataRoute } from 'next'
import { config } from '../config'
import { services } from '../lib/services'

// Helper to create URL-friendly slug from town name
function slugify(town: string): string {
  return town
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Stable lastModified per page. Using new Date() told Google every page
// changed every time the sitemap was fetched, which wastes crawl budget
// AND makes Google distrust the timestamps. Bump these only when the
// underlying page content actually changes.
const LAST_MOD = {
  home:        '2026-05-09',
  dumpsters:   '2026-05-09',
  pricing:     '2026-05-09',
  book:        '2026-05-09',
  serviceArea: '2026-04-01',
  about:       '2026-04-01',
  contact:     '2026-05-09',
  faq:         '2026-04-01',
  guides:      '2026-03-01',
  legal:       '2026-01-01',
  cityPage:    '2026-04-01',
  dumpsterId:  '2026-04-01',
  services:    '2026-05-09',
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'

  // Static pages - these are the main pages that should be indexed
  const staticPages = [
    { url: baseUrl,                                       lastModified: LAST_MOD.home,        changeFrequency: 'weekly'  as const, priority: 1.0 },
    { url: `${baseUrl}/dumpsters`,                        lastModified: LAST_MOD.dumpsters,   changeFrequency: 'weekly'  as const, priority: 0.9 },
    { url: `${baseUrl}/pricing`,                          lastModified: LAST_MOD.pricing,     changeFrequency: 'weekly'  as const, priority: 0.9 },
    { url: `${baseUrl}/book`,                             lastModified: LAST_MOD.book,        changeFrequency: 'weekly'  as const, priority: 0.9 },
    { url: `${baseUrl}/services`,                         lastModified: LAST_MOD.services,    changeFrequency: 'weekly'  as const, priority: 0.9 },
    { url: `${baseUrl}/service-area`,                     lastModified: LAST_MOD.serviceArea, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/about`,                            lastModified: LAST_MOD.about,       changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/contact`,                          lastModified: LAST_MOD.contact,     changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/faq`,                              lastModified: LAST_MOD.faq,         changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/guides/dumpster-sizes`,            lastModified: LAST_MOD.guides,      changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guides/dumpster-rental-cost`,      lastModified: LAST_MOD.guides,      changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guides/what-can-go-in-dumpster`,   lastModified: LAST_MOD.guides,      changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/privacy`,                          lastModified: LAST_MOD.legal,       changeFrequency: 'yearly'  as const, priority: 0.3 },
    { url: `${baseUrl}/terms`,                            lastModified: LAST_MOD.legal,       changeFrequency: 'yearly'  as const, priority: 0.3 },
  ]

  const cityPages = config.serviceTowns.map((town: string) => ({
    url: `${baseUrl}/dumpster-rental/${slugify(town)}-il`,
    lastModified: LAST_MOD.cityPage,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const dumpsterPages = config.dumpsters.map((dumpster: { id: string }) => ({
    url: `${baseUrl}/dumpsters/${dumpster.id}`,
    lastModified: LAST_MOD.dumpsterId,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Service-specific landing pages — each one targets a distinct
  // search intent (residential, construction, roofing, etc.).
  const servicePages = services.map((s: { slug: string }) => ({
    url: `${baseUrl}/services/${s.slug}`,
    lastModified: LAST_MOD.services,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...cityPages, ...dumpsterPages, ...servicePages]
}
