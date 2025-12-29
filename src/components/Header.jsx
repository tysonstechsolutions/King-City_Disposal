'use client'

import { useState } from 'react'
import Link from 'next/link'
import { config } from '../config'
import { Menu, X, Phone, Truck } from 'lucide-react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Dumpster Sizes', href: '/dumpsters' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Service Area', href: '/service-area' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Contact', href: '/contact' },
  ]

  return (
    <header className="bg-dark-900/95 backdrop-blur-sm border-b border-dark-800 sticky top-0 z-50">
      <nav className="container-custom">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-2xl text-white tracking-wide">
                {config.businessName.split(' ')[0]}
              </span>
              <span className="font-display text-2xl text-primary-400 tracking-wide ml-1">
                {config.businessName.split(' ').slice(1).join(' ')}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-dark-300 hover:text-white font-medium transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CTA Button + Phone */}
          <div className="hidden md:flex items-center gap-4">
            <a 
              href={`tel:${config.phoneRaw}`}
              className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span className="font-semibold">{config.phone}</span>
            </a>
            <Link href="/pricing" className="btn-accent">
              Get a Quote
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 text-dark-300 hover:text-white"
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
          <div className="lg:hidden py-4 border-t border-dark-800 animate-slide-up">
            <div className="flex flex-col gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-3 text-dark-300 hover:text-white hover:bg-dark-800 rounded-lg font-medium transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="border-t border-dark-800 mt-2 pt-4 px-4">
                <a 
                  href={`tel:${config.phoneRaw}`}
                  className="flex items-center gap-2 text-primary-400 font-semibold mb-4"
                >
                  <Phone className="w-5 h-5" />
                  {config.phone}
                </a>
                <Link 
                  href="/pricing" 
                  className="btn-accent w-full text-center block"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get a Quote
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
