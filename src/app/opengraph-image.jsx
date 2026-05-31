import { ImageResponse } from 'next/og'
import { config } from '../config'

// ============================================
// ROOT OG IMAGE — homepage
// ============================================
// Next.js generates this at /opengraph-image at build time. The route
// is picked up by Open Graph crawlers (Facebook, LinkedIn, Slack, iMessage,
// X/Twitter) when a user shares the URL, replacing the static /og-image.jpg.
//
// Per-page OG images live in app/<route>/opengraph-image.jsx and inherit
// nothing from this file — each is its own ImageResponse.
//
// Edge runtime is REQUIRED for ImageResponse — much faster cold-start and
// supports the satori font/SVG rendering.
// ============================================

export const runtime = 'edge'
// Force dynamic — prerendering at build time fails on Windows paths with
// spaces (a @vercel/og + Node URL.fileURLToPath quirk). Generating
// on-demand still gets edge-cached by Vercel so latency is fine.
export const dynamic = 'force-dynamic'
export const alt = `${config.businessName} — Dumpster Rental in Southern Illinois`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  const startingPrice = config.dumpsters[0].pricing['10-day']

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0d1a2d 0%, #1e3a5f 100%)',
          padding: '60px',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top: brand badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '12px',
              height: '64px',
              background: '#dc2626',
              borderRadius: '4px',
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 600, color: '#cbd5e1' }}>
            {config.businessName}
          </div>
        </div>

        {/* Middle: headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            marginTop: '20px',
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Dumpster Rentals
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: '#f87171',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Made Simple
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#cbd5e1',
              marginTop: '24px',
              maxWidth: '900px',
            }}
          >
            Same-day delivery in {config.address.city} & Southern Illinois.
            Starting at ${startingPrice}.
          </div>
        </div>

        {/* Bottom: phone */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #2a4470',
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#dc2626',
              padding: '12px 24px',
              background: 'rgba(220, 38, 38, 0.1)',
              borderRadius: '12px',
              border: '2px solid #dc2626',
            }}
          >
            {config.phone}
          </div>
          <div style={{ fontSize: 24, color: '#94a3b8' }}>
            No hidden fees • Family owned
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
