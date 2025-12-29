import Link from 'next/link'
import { config } from '../config'
import { Truck, Phone, Mail, MapPin, Clock } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-dark-900 border-t border-dark-800">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="font-display text-xl text-white">
                {config.businessName}
              </span>
            </Link>
            <p className="text-dark-400 text-sm leading-relaxed mb-4">
              {config.tagline}
            </p>
            <div className="flex items-center gap-2 text-dark-300">
              <MapPin className="w-4 h-4 text-primary-500" />
              <span className="text-sm">{config.address.city}, {config.address.state}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dumpsters" className="footer-link text-sm">
                  Dumpster Sizes
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="footer-link text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/service-area" className="footer-link text-sm">
                  Service Area
                </Link>
              </li>
              <li>
                <Link href="/faq" className="footer-link text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="footer-link text-sm">
                  Contact Us
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
                  <Link href={`/dumpsters#${dumpster.id}`} className="footer-link text-sm">
                    {dumpster.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/faq#prohibited" className="footer-link text-sm">
                  What Can't Go In?
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
                  className="flex items-center gap-3 text-dark-300 hover:text-primary-400 transition-colors"
                >
                  <Phone className="w-4 h-4 text-primary-500" />
                  <span className="text-sm">{config.phone}</span>
                </a>
              </li>
              <li>
                <a 
                  href={`mailto:${config.email}`}
                  className="flex items-center gap-3 text-dark-300 hover:text-primary-400 transition-colors"
                >
                  <Mail className="w-4 h-4 text-primary-500" />
                  <span className="text-sm">{config.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-dark-300">
                <Clock className="w-4 h-4 text-primary-500 mt-0.5" />
                <div className="text-sm">
                  <p>Mon-Fri: {config.hours.monday}</p>
                  <p>Sat: {config.hours.saturday}</p>
                  <p>Sun: {config.hours.sunday}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-dark-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-dark-500 text-sm">
            © {currentYear} {config.businessName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-dark-500 hover:text-dark-300 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-dark-500 hover:text-dark-300 text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
