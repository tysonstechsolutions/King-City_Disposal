import Link from 'next/link'
import { config } from '../config'
import { Home, ArrowRight, Phone, Search, Truck } from 'lucide-react'

// Custom 404 page. Helps in two ways:
//  1. Recovery: instead of dumping users on a generic page, give them the
//     three or four destinations they probably wanted (book, services,
//     pricing, call).
//  2. SEO: Google still sees a 404 status (Next sets it automatically for
//     this file), so this doesn't pollute the index, but the human-friendly
//     content keeps "soft 404" warnings out of Search Console.
export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="min-h-[60vh] bg-dark-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
          <Search className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          That page wandered off
        </h1>
        <p className="text-lg text-dark-300 mb-10">
          The page you're looking for moved or was never here. Try one of these
          instead — or just call us at{' '}
          <a
            href={`tel:${config.phoneRaw}`}
            data-track-source="not_found_inline"
            className="text-primary hover:underline font-semibold"
          >
            {config.phone}
          </a>{' '}
          and we'll point you the right way.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto mb-8">
          <Link
            href="/book"
            data-track-cta="not_found_book"
            className="group bg-primary hover:bg-primary/90 text-white px-5 py-4 rounded-xl font-semibold transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-2"><Truck className="w-5 h-5" /> Book a Dumpster</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/services"
            className="group bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white px-5 py-4 rounded-xl font-semibold transition-colors flex items-center justify-between"
          >
            <span>See All Services</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/pricing"
            className="group bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white px-5 py-4 rounded-xl font-semibold transition-colors flex items-center justify-between"
          >
            <span>Pricing</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/faq"
            className="group bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white px-5 py-4 rounded-xl font-semibold transition-colors flex items-center justify-between"
          >
            <span>FAQ</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-dark-300 hover:text-white text-sm"
        >
          <Home className="w-4 h-4" /> Back to homepage
        </Link>
      </div>
    </div>
  )
}
