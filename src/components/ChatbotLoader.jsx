'use client'

// ============================================
// CHATBOT LOADER — defer ChatbotWidget bundle off the critical path
// ============================================
// The widget itself is ~1,300 lines + lucide icons. Bundling it into every
// page (even /privacy, /receipt, /admin/*) bloated First Load JS by ~30 kB
// for no conversion benefit. This wrapper:
//   1. Skips rendering entirely on routes where the chatbot would never
//      convert (legal, transactional, admin, driver).
//   2. Dynamic-imports the widget so its JS is fetched only when needed,
//      and never blocks the main bundle.
//   3. Defers loading until the browser is idle on conversion pages so it
//      doesn't compete with the LCP image.

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// SSR off — the widget uses useState/useRef/window APIs heavily and there's
// no SEO value in rendering it server-side (it's behind a button).
const ChatbotWidget = dynamic(() => import('./ChatbotWidget'), {
  ssr: false,
  loading: () => null,
})

// Pages where the chatbot would never convert and just bloats the page.
const EXCLUDED_PREFIXES = [
  '/admin',
  '/driver',
  '/invoice',
  '/receipt',
  '/payment-success',
  '/extension-confirmed',
  '/privacy',
  '/terms',
  '/sms-terms',
  '/sms-opt-in',
]

export default function ChatbotLoader() {
  const pathname = usePathname() || ''
  const [ready, setReady] = useState(false)

  // Wait for the browser to be idle before fetching the widget chunk —
  // keeps it from competing with above-the-fold rendering. requestIdleCallback
  // isn't in Safari, fall back to a small setTimeout.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback || clearTimeout
    const handle = schedule(() => setReady(true))
    return () => cancel(handle)
  }, [])

  const excluded = EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (excluded) return null
  if (!ready) return null

  return <ChatbotWidget />
}
