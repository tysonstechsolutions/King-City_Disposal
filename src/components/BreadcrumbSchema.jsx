import Script from 'next/script'
import { config } from '../config'

// ============================================
// BREADCRUMB SCHEMA
// ============================================
// Emits BreadcrumbList JSON-LD so Google can display "Home > Section > Page"
// under the SERP entry instead of the bare URL — lifts CTR on competitive
// queries.
//
// Usage:
//   <BreadcrumbSchema items={[
//     { name: 'Services', path: '/services' },
//     { name: 'Residential', path: '/services/residential' },
//   ]} />
//
// "Home" is auto-prepended; you only pass the trail beneath it. Paths are
// relative to config.websiteUrl.
// ============================================

export default function BreadcrumbSchema({ items, id }) {
  const base = config.websiteUrl || 'https://www.kingcitydisposal.com'

  const trail = [
    { name: 'Home', path: '/' },
    ...items,
  ]

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": trail.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": `${base}${item.path}`.replace(/\/$/, '') || base,
    })),
  }

  // Stable ID per crumb trail so Next can hash and dedupe identical schemas.
  const scriptId = id || `breadcrumb-${items.map(i => i.path.replace(/[^a-z0-9]/gi, '')).join('-')}`

  return (
    <Script
      id={scriptId}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
