import Link from 'next/link'
import Image from 'next/image'
import { config } from '../config'
import { services } from '../lib/services'
import { Phone, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-neutral-900 text-white" role="contentinfo">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-3 mb-4 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-neutral-900 rounded-lg"
              aria-label={`${config.businessName} - Go to homepage`}
            >
              <Image
                src="/images/logo.png"
                alt="King City Disposal logo - Dumpster rental in Southern Illinois"
                width={50}
                height={50}
                className="h-12 w-auto"
              />
              <span className="text-xl font-bold text-white">
                {config.businessName}
              </span>
            </Link>
            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
              Reliable dumpster rentals for Southern Illinois. Fast delivery, transparent pricing.
            </p>
            <div className="flex items-center gap-2 text-neutral-400">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm">{config.address.city}, {config.address.state}</span>
            </div>
          </div>

          {/* Quick Links */}
          <nav aria-label="Quick links">
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2" role="list">
              <li>
                <Link href="/services" className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/dumpsters" className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Dumpster Sizes
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/service-area" className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Service Area
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/my-rentals" className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  My Rentals
                </Link>
              </li>
            </ul>
          </nav>

          {/* Service-specific landing pages — every link here is an SEO
              entry point for a different search intent (residential,
              construction, roofing, etc.). Internal links from the footer
              also flow PageRank to the service pages. */}
          <nav aria-label="Service-specific landing pages">
            <h3 className="font-semibold text-white mb-4">Project Type</h3>
            <ul className="space-y-2" role="list">
              {services.map(s => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Services */}
          <nav aria-label="Dumpster rental options">
            <h3 className="font-semibold text-white mb-4">Dumpster Rentals</h3>
            <ul className="space-y-2" role="list">
              {config.dumpsters.map((dumpster) => (
                <li key={dumpster.id}>
                  <Link href={`/book?size=${dumpster.id}`} className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                    {dumpster.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/guides/dumpster-sizes" className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Size Guide
                </Link>
              </li>
              <li>
                <Link href="/guides/dumpster-rental-cost" className="text-neutral-400 hover:text-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Pricing Guide
                </Link>
              </li>
              <li>
                <Link href="/book" className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Book Online →
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-white mb-4">Contact Us</h3>
            <ul className="space-y-3" role="list">
              <li>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="flex items-center gap-3 text-white font-semibold hover:text-primary-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded"
                  aria-label={`Call us at ${config.phone}`}
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  <span>{config.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${config.email}`}
                  className="flex items-center gap-3 text-neutral-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded"
                  aria-label={`Email us at ${config.email}`}
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  <span className="text-sm">{config.email}</span>
                </a>
              </li>
              <li className="text-neutral-400 text-sm pt-2">
                <p>Mon-Fri: 7am - 5pm</p>
                <p>Sat: 8am - 12pm</p>
                <p>Sun: Closed</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-neutral-400 text-sm">
            © {currentYear} {config.businessName}. All rights reserved.
          </p>
          <nav aria-label="Legal links">
            <ul className="flex items-center gap-6" role="list">
              <li>
                <Link href="/privacy" className="text-neutral-400 hover:text-neutral-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-neutral-400 hover:text-neutral-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="text-center mt-6 pt-4 border-t border-neutral-800">
          <p className="text-neutral-500 text-sm">
            Website by <a href="https://tysonstechsolutions.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 rounded">Tyson's Tech Solutions</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
