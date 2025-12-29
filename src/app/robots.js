// ============================================
// ROBOTS.TXT GENERATION
// ============================================
// This tells search engines what they can and can't crawl.
// Next.js automatically serves this at /robots.txt
//
// IMPORTANT: Never block /_next/ - Google needs these files!
// ============================================

import { config } from '../config'

export default function robots() {
  const baseUrl = config.websiteUrl || 'https://www.kingcitydisposal.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',          // Admin dashboard - don't index
          '/api/',            // API routes - don't index
          '/driver/',         // Driver pages - don't index
          '/_next/static/',   // Actually, let's allow this - Google needs it
        ],
      },
      {
        // Specific rules for Googlebot
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/driver/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
