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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://js.stripe.com https://*.supabase.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://maps.googleapis.com https://api.twilio.com https://api.resend.com wss://*.supabase.co",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
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
