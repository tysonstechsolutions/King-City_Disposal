'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { config } from '../config'
import { Menu, X, Phone } from 'lucide-react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Dumpster Sizes', href: '/dumpsters' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Service Area', href: '/service-area' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Contact', href: '/contact' },
  ]

  // Check if current page has dark hero (homepage)
  const hasDarkHero = pathname === '/'

  return (
    <header className={`${hasDarkHero ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'} border-b sticky top-0 z-50`}>
      <nav className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className={`text-xl md:text-2xl font-bold ${hasDarkHero ? 'text-white' : 'text-neutral-900'}`}>
              {config.businessName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? hasDarkHero ? 'text-primary-400' : 'text-primary-600'
                    : hasDarkHero ? 'text-neutral-300 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CTA Button + Phone */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={`tel:${config.phoneRaw}`}
              className={`flex items-center gap-2 font-semibold ${hasDarkHero ? 'text-white' : 'text-neutral-900'}`}
            >
              <Phone className="w-4 h-4" />
              <span>{config.phone}</span>
            </a>
            <Link
              href="/book"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              Book Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className={`lg:hidden p-2 ${hasDarkHero ? 'text-white' : 'text-neutral-900'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className={`lg:hidden py-4 border-t ${hasDarkHero ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <div className="flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    pathname === item.href
                      ? hasDarkHero ? 'bg-neutral-800 text-primary-400' : 'bg-neutral-100 text-primary-600'
                      : hasDarkHero ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className={`border-t ${hasDarkHero ? 'border-neutral-800' : 'border-neutral-200'} mt-3 pt-4 px-4`}>
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="flex items-center gap-2 text-primary-600 font-semibold mb-4"
                >
                  <Phone className="w-5 h-5" />
                  {config.phone}
                </a>
                <Link
                  href="/book"
                  className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Book Now
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
