// ============================================
// CLIENT-SIDE ANALYTICS WRAPPER
// ============================================
// Single entry point for tracking events. Each provider (GA4, Meta Pixel,
// Microsoft Clarity, Vercel Web Analytics, etc.) is called only if its
// respective env var is set. When nothing is configured this module is a
// no-op — safe to call from anywhere.
//
// To enable each provider, set these env vars in Vercel (or .env.local):
//   NEXT_PUBLIC_GA_MEASUREMENT_ID   → "G-XXXXXXXXXX"  (Google Analytics 4)
//   NEXT_PUBLIC_META_PIXEL_ID       → "123456789..."  (Meta / Facebook Pixel)
//   NEXT_PUBLIC_CLARITY_PROJECT_ID  → "abc1234567"    (Microsoft Clarity)
//
// Then events fired with `track('phone_click', { source: 'header' })`
// flow into all configured providers automatically.
// ============================================

'use client'

const isBrowser = () => typeof window !== 'undefined'

// Best-effort phone-call event. Goes to GA4 as a custom event AND a
// Meta Pixel "Lead" event (carrier of phone calls in their model).
export function track(eventName, params = {}) {
  if (!isBrowser()) return

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params)
    }
  } catch {
    // analytics must never throw into business code
  }

  try {
    if (typeof window.fbq === 'function') {
      // Map our internal events to standard Pixel events where possible.
      const fbEventMap = {
        phone_click: 'Lead',
        contact_submit: 'Lead',
        booking_started: 'InitiateCheckout',
        booking_submitted: 'AddPaymentInfo',
        purchase: 'Purchase',
      }
      const fbEvent = fbEventMap[eventName]
      if (fbEvent) {
        const fbParams = {}
        if (params.value != null) fbParams.value = params.value
        if (params.currency) fbParams.currency = params.currency
        if (params.transaction_id) fbParams.eventID = params.transaction_id
        window.fbq('track', fbEvent, fbParams)
      } else {
        window.fbq('trackCustom', eventName, params)
      }
    }
  } catch {}
}

// Track a phone click. Pass the source location ("header", "footer",
// "city_page", etc.) to figure out which CTAs actually drive calls.
export function trackPhoneClick(source) {
  track('phone_click', { source: source || 'unknown' })
}

// Track a successful Stripe purchase. value is in DOLLARS, not cents.
export function trackPurchase({ transactionId, valueDollars, currency = 'USD', items }) {
  track('purchase', {
    transaction_id: transactionId,
    value: valueDollars,
    currency,
    items,
  })
}

// Capture UTM + referrer + landing page from the current URL/session.
// Returns an object suitable for posting along with a booking. Falls back
// to sessionStorage so a user who lands via an ad and then navigates to
// /book still keeps their attribution.
const ATTRIBUTION_KEY = 'kcd_attribution'

export function captureAttribution() {
  if (!isBrowser()) return {}

  // First-touch wins: if we already have attribution stashed, keep it.
  try {
    const stashed = sessionStorage.getItem(ATTRIBUTION_KEY)
    if (stashed) return JSON.parse(stashed)
  } catch {}

  const url = new URL(window.location.href)
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']
  const data = {}
  for (const k of utmKeys) {
    const v = url.searchParams.get(k)
    if (v) data[k] = v.slice(0, 200)
  }
  data.referrer = (document.referrer || '').slice(0, 500) || null
  data.landing_page = url.pathname

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data))
  } catch {}

  return data
}

export function getAttribution() {
  if (!isBrowser()) return {}
  try {
    const stashed = sessionStorage.getItem(ATTRIBUTION_KEY)
    return stashed ? JSON.parse(stashed) : {}
  } catch {
    return {}
  }
}
