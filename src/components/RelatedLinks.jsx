import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// ============================================
// RELATED LINKS BLOCK
// ============================================
// Internal-linking block to drop at the bottom of long-form pages
// (guides, services, FAQ). Two SEO wins:
//   1. Distributes PageRank to deeper pages.
//   2. Increases dwell time + reduces bounce — both UX metrics Google
//      uses as ranking signals.
//
// Pass 2-4 related items. Pages with a single related link don't get
// the visual treatment they need to drive clicks, so we don't render
// fewer than 2.
//
// Usage:
//   <RelatedLinks
//     heading="Keep reading"
//     items={[
//       { href: '/guides/dumpster-sizes', title: 'What size dumpster do I need?', description: '...' },
//       { href: '/pricing', title: 'Pricing', description: '...' },
//     ]}
//   />
// ============================================

export default function RelatedLinks({ heading = 'Related pages', items = [] }) {
  if (!Array.isArray(items) || items.length < 2) return null

  return (
    <section className="section bg-dark-900">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">{heading}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-primary/50 rounded-xl p-5 transition-all"
              >
                <h3 className="text-white font-semibold mb-2 flex items-center justify-between gap-2">
                  <span>{item.title}</span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </h3>
                {item.description && (
                  <p className="text-sm text-dark-300 line-clamp-2">{item.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
