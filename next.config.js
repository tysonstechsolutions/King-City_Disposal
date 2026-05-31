/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static assets get long-cache headers from next/image. AVIF + WebP saves
  // 30-60% over JPEG on the hero + dumpster photos with no quality loss.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mapbox.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images at the CDN edge for ~1 year. Filenames are
    // content-hashed so this is safe.
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
  // Compress responses (HTML/CSS/JSON) at the edge. Default true on Vercel,
  // explicit for self-hosted deployments.
  compress: true,
  // Strip the X-Powered-By: Next.js header — small but harmless.
  poweredByHeader: false,
  // Enforce trailing slash consistency (no trailing slashes)
  trailingSlash: false,
  // Redirect duplicate pages to canonical URLs
  async redirects() {
    return [
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/week',
        destination: '/',
        permanent: true,
      },
    ]
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(self), payment=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Stripe Payment Element loads chunked scripts from m.stripe.network
              // in addition to js.stripe.com. Without m.stripe.network in script-src
              // and frame-src, the card form hangs on "Loading payment form..."
              // and the api.stripe.com/v1/elements calls cascade-fail with 401
              // (the iframe handshake never completes so the elements session
              // can't authenticate). Same for connect-src for the postMessage
              // back-channel between the parent and the Stripe iframe.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://js.stripe.com https://m.stripe.network https://*.supabase.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // *.stripe.com lets the Payment Element render card-brand logos
              // (Visa, Mastercard, etc.) inside the iframe.
              "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.supabase.co https://*.stripe.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://m.stripe.network https://maps.googleapis.com https://api.twilio.com https://api.resend.com wss://*.supabase.co",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
