import { ImageResponse } from 'next/og'
import { config } from '../config'

// ============================================
// SHARED OG IMAGE TEMPLATE
// ============================================
// Per-route opengraph-image.jsx files call renderOG({ eyebrow, headline,
// subhead }) to render a branded social-share card. Keeps all routes
// visually consistent and lets you tweak one place to restyle every card.
//
// Edge runtime requirement: Next.js ImageResponse uses Satori under the
// hood — Edge-only. Cards generate on-demand and are cached by the CDN.
// ============================================

export const ogConfig = {
  runtime: 'edge',
  // Force-dynamic to skip build-time prerendering — @vercel/og + Windows
  // paths-with-spaces breaks the local build. Generates on first request
  // and the edge cache holds it indefinitely after that.
  dynamic: 'force-dynamic',
  size: { width: 1200, height: 630 },
  contentType: 'image/png',
}

export function renderOG({ eyebrow, headline, accentHeadline, subhead, footerNote }) {
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
        {/* Top: brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '12px', height: '64px', background: '#dc2626', borderRadius: '4px' }} />
          <div style={{ fontSize: 28, fontWeight: 600, color: '#cbd5e1' }}>
            {config.businessName}
          </div>
        </div>

        {/* Middle: eyebrow + headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            marginTop: '20px',
          }}
        >
          {eyebrow && (
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#f87171',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '12px',
              }}
            >
              {eyebrow}
            </div>
          )}
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {headline}
          </div>
          {accentHeadline && (
            <div
              style={{
                fontSize: 80,
                fontWeight: 800,
                color: '#f87171',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              {accentHeadline}
            </div>
          )}
          {subhead && (
            <div
              style={{
                fontSize: 28,
                color: '#cbd5e1',
                marginTop: '24px',
                maxWidth: '900px',
                lineHeight: 1.3,
              }}
            >
              {subhead}
            </div>
          )}
        </div>

        {/* Bottom: phone + note */}
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
              fontSize: 32,
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
          <div style={{ fontSize: 22, color: '#94a3b8' }}>
            {footerNote || 'No hidden fees • Family owned'}
          </div>
        </div>
      </div>
    ),
    { ...ogConfig.size }
  )
}
