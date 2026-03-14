'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { config } from '../config'
import {
  Package,
  Truck,
  Users,
  FileText,
  CreditCard,
  FolderOpen,
  Receipt,
  BarChart3,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Bookings', icon: Package },
  { href: '/admin/capacity', label: 'Fleet', icon: Truck },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/documents', label: 'Docs', icon: FolderOpen },
  { href: '/admin/expenses', label: 'Expenses', icon: Receipt },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

export default function AdminNav() {
  const pathname = usePathname()

  const isActive = (href) => {
    if (href === '/admin') {
      return pathname === '/admin' || pathname.startsWith('/admin/booking/')
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </div>
          <p className="text-neutral-500 text-sm hidden md:block">{config.businessName}</p>
        </div>
      </div>
    </nav>
  )
}
