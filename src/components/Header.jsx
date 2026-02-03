'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  // Handle keyboard navigation for mobile menu
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
  }, [mobileMenuOpen])

  return (
    <header
      className="bg-accent-950 border-b border-accent-800 sticky top-0 z-50"
      onKeyDown={handleKeyDown}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-accent-950 rounded-lg"
            aria-label={`${config.businessName} - Go to homepage`}
          >
            <Image
              src="/images/logo.png"
              alt="King City Disposal"
              width={48}
              height={48}
              className="h-10 md:h-12 w-auto"
              priority
            />
            <span className="text-lg md:text-xl font-bold text-white whitespace-nowrap">
              {config.businessName}
            </span>
          </Link>

          {/* Desktop Navigation - centered */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2" role="navigation">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-accent-950 rounded-md px-3 py-2 whitespace-nowrap ${
                  pathname === item.href
                    ? 'text-primary-400 bg-accent-900'
                    : 'text-white/80 hover:text-white hover:bg-accent-900/50'
                }`}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CTA Button + Phone */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <a
              href={`tel:${config.phoneRaw}`}
              className="flex items-center gap-2 font-semibold text-white hover:text-primary-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-accent-950 rounded px-2 py-1 whitespace-nowrap"
              aria-label={`Call us at ${config.phone}`}
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xl:inline">{config.phone}</span>
              <span className="xl:hidden">Call</span>
            </a>
            <Link
              href="/book"
              className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg hover:shadow-primary-600/25 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-accent-950 whitespace-nowrap"
            >
              Book Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-white hover:bg-accent-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-accent-950 rounded-lg transition-colors"
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="lg:hidden py-4 border-t border-accent-800"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-inset ${
                    pathname === item.href
                      ? 'bg-accent-800 text-primary-400'
                      : 'text-white/80 hover:bg-accent-800 hover:text-white'
                  }`}
                  onClick={closeMobileMenu}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              ))}
              <div className="border-t border-accent-800 mt-3 pt-4 px-4">
                <a
                  href={`tel:${config.phoneRaw}`}
                  className="flex items-center gap-2 text-primary-400 font-semibold mb-4 focus:outline-none focus:ring-2 focus:ring-primary-400 rounded px-2 py-1"
                  aria-label={`Call us at ${config.phone}`}
                >
                  <Phone className="w-5 h-5" aria-hidden="true" />
                  {config.phone}
                </a>
                <Link
                  href="/book"
                  className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                  onClick={closeMobileMenu}
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
