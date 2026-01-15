import Link from 'next/link'
import Image from 'next/image'
import { config } from '../config'
import { Phone, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-neutral-900 text-white">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3 mb-4">
              <Image
                src="/images/logo.png"
                alt={config.businessName}
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
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{config.address.city}, {config.address.state}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dumpsters" className="text-neutral-400 hover:text-white text-sm transition-colors">
                  Dumpster Sizes
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-neutral-400 hover:text-white text-sm transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/service-area" className="text-neutral-400 hover:text-white text-sm transition-colors">
                  Service Area
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-neutral-400 hover:text-white text-sm transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-neutral-400 hover:text-white text-sm transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/my-rentals" className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">
                  My Rentals
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-white mb-4">Dumpster Rentals</h3>
            <ul className="space-y-2">
              {config.dumpsters.map((dumpster) => (
                <li key={dumpster.id}>
                  <Link href={`/book?size=${dumpster.id}`} className="text-neutral-400 hover:text-white text-sm transition-colors">
                    {dumpster.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/guides/dumpster-sizes" className="text-neutral-400 hover:text-white text-sm transition-colors">
                  Size Guide
                </Link>
              </li>
              <li>
                <Link href="/guides/dumpster-rental-cost" className="text-neutral-400 hover:text-white text-sm transition-colors">
                  Pricing Guide
                </Link>
              </li>
              <li>
                <Link href="/book" className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors">
                  Book Online →
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-white mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="flex items-center gap-3 text-white font-semibold hover:text-primary-400 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>{config.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${config.email}`}
                  className="flex items-center gap-3 text-neutral-400 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{config.email}</span>
                </a>
              </li>
              <li className="text-neutral-400 text-sm pt-2">
                <p>Mon-Fri: 7am - 6pm</p>
                <p>Sat: 8am - 2pm</p>
                <p>Sun: Closed</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-dark-400 text-sm">
            © {currentYear} {config.businessName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-dark-400 hover:text-neutral-300 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-dark-400 hover:text-neutral-300 text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
        <div className="text-center mt-6 pt-4 border-t border-neutral-800">
          <p className="text-neutral-500 text-sm">
            Website by <a href="https://tysonstechsolutions.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 transition-colors">Tyson's Tech Solutions</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
