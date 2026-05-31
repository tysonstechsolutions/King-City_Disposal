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
          '/driver/',         // Driver staging pages - don't index
          '/invoice/',        // Per-customer invoices - private URLs
          '/receipt/',        // Per-customer receipts - private URLs
          '/my-rentals',      // Customer self-service - phone-gated
          '/payment-success', // Post-checkout, no SEO value
          '/extension-confirmed', // Post-action, no SEO value
        ],
      },
      {
        // Googlebot gets the same rules; specifying it explicitly stops
        // Googlebot-Image / Googlebot-News from inheriting * patterns we
        // didn't intend to apply.
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/driver/', '/invoice/', '/receipt/', '/my-rentals', '/payment-success', '/extension-confirmed'],
      },
      {
        // Bingbot — same rules. Bing has a non-trivial share of mobile
        // traffic via Edge and DuckDuckGo (which uses Bing's index).
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/driver/', '/invoice/', '/receipt/', '/my-rentals', '/payment-success', '/extension-confirmed'],
      },
      {
        // Block resource-hungry / low-value crawlers that waste server CPU
        // without sending real referral traffic.
        userAgent: ['AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot'],
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
