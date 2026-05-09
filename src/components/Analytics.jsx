'use client'

// ============================================
// ANALYTICS LOADER
// ============================================
// Loads GA4, Microsoft Clarity, and Meta Pixel only when the respective
// public env var is set. Also installs:
// - a single global click listener that auto-tracks every tel:/sms: link
// - a scroll-depth tracker (25/50/75/100 milestones) for engagement
// - Web Vitals reporting (LCP/CLS/INP) → ranking signals to GA4
//
// All instrumentation runs whether or not analytics providers are configured;
// without providers it's a no-op so it stays safe to ship.

import Script from 'next/script'
import { useEffect } from 'react'
import { useReportWebVitals } from 'next/web-vitals'
import { captureAttribution, track } from '../lib/analytics'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || ''

export default function Analytics() {
  // Forward Core Web Vitals to GA4 as the standard `web_vitals` event.
  // Google uses LCP, CLS, and INP as ranking signals; if any are bad, the
  // site won't rank as well. By reporting them you can see in GA4 which
  // pages are slow and prioritize fixes. Quantize the value per Google's
  // own guidance (CLS ×1000, others rounded ms).
  useReportWebVitals((metric) => {
    try {
      const value = metric.name === 'CLS'
        ? Math.round(metric.value * 1000)
        : Math.round(metric.value)
      track('web_vitals', {
        metric_name: metric.name,
        metric_value: value,
        metric_id: metric.id,
        metric_rating: metric.rating,
        page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      })
    } catch {}
  })

  useEffect(() => {
    // Stash UTM + referrer for later (e.g., when the user submits the booking form).
    captureAttribution()

    // Global delegation: any tel: or sms: link click reports an event.
    // Using capture phase so we beat any handlers that might stopPropagation.
    const clickHandler = (e) => {
      const link = e.target.closest?.('a')
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (href.startsWith('tel:')) {
        track('phone_click', {
          source: link.dataset.trackSource || guessSource(link),
          number: href.slice(4),
        })
      } else if (href.startsWith('sms:')) {
        track('sms_click', {
          source: link.dataset.trackSource || guessSource(link),
        })
      } else if (link.dataset.trackCta) {
        // Any element marked data-track-cta="..." reports a generic event.
        track('cta_click', {
          cta: link.dataset.trackCta,
          href: link.getAttribute('href'),
        })
      }
    }
    document.addEventListener('click', clickHandler, true)

    // Scroll-depth tracking. Fires once per milestone per page so a single
    // session doesn't spam events. Reset on route change via popstate.
    const fired = new Set()
    const milestones = [25, 50, 75, 100]
    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const pct = Math.round((window.scrollY / scrollable) * 100)
      for (const m of milestones) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m)
          track('scroll_depth', { percent: m, page: window.location.pathname })
        }
      }
    }
    let scrollRaf = 0
    const throttledScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0
        onScroll()
      })
    }
    window.addEventListener('scroll', throttledScroll, { passive: true })
    const onNav = () => fired.clear()
    window.addEventListener('popstate', onNav)

    return () => {
      document.removeEventListener('click', clickHandler, true)
      window.removeEventListener('scroll', throttledScroll)
      window.removeEventListener('popstate', onNav)
    }
  }, [])

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {CLARITY_ID && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>
      )}
    </>
  )
}

// Walk up the DOM looking for a section/header/footer landmark to label
// where on the page a phone click came from. Owner can use this in GA4
// to figure out which CTAs convert (e.g., "header_cta" vs "city_page_bottom").
function guessSource(link) {
  let el = link
  for (let i = 0; i < 8 && el; i++) {
    const id = el.id || ''
    const tag = el.tagName?.toLowerCase()
    if (tag === 'header') return 'header'
    if (tag === 'footer') return 'footer'
    if (tag === 'nav') return 'nav'
    if (id) return id
    el = el.parentElement
  }
  return 'page'
}
