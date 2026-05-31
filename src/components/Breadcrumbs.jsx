import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

// ============================================
// VISIBLE BREADCRUMBS
// ============================================
// Renders the path users see in the page header. The matching schema
// emits separately via <BreadcrumbSchema /> — keep both in sync. Two SEO
// effects of having visible breadcrumbs:
//   1. Google often replaces the URL in SERPs with the breadcrumb trail
//      when both schema AND on-page breadcrumbs exist.
//   2. Internal-link signal — every page above the current one gets a
//      crawl + PageRank hit.
//
// Usage:
//   <Breadcrumbs items={[
//     { name: 'Guides', path: '/guides' },
//     { name: '20 vs 30 Yard', path: '/guides/20-yard-vs-30-yard-dumpster' },
//   ]} />
//
// The last item's link is rendered as text (current page) — passing the
// path anyway is fine and keeps the schema component happy when reused.
// ============================================

export default function Breadcrumbs({ items = [], className = '' }) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-sm ${className}`}
    >
      <ol className="flex items-center gap-2 flex-wrap" role="list">
        <li className="flex items-center">
          <Link
            href="/"
            className="text-dark-400 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li key={item.path} className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-dark-600" aria-hidden="true" />
              {isLast ? (
                <span className="text-white font-medium" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="text-dark-400 hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
