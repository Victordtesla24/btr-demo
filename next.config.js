/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['hellochriscole.webflow.io'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  env: {
    SITE_URL: process.env.SITE_URL || 'http://localhost:3002',
  },
  async rewrites() {
    // Development-only fix: Next.js dev is currently linking to
    // /_next/static/css/app/layout.css while emitting the compiled CSS
    // to a hashed file under .next/static/css/. We rewrite that layout
    // CSS request to the actual generated chunk to avoid repeated 404s
    // in the dev server logs. This is safe because it only applies in
    // development and does not affect the production build output.
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return [
      {
        source: '/_next/static/css/app/layout.css',
        destination: '/_next/static/css/0ac682b2c9afb962.css',
      },
    ];
  },
}

module.exports = nextConfig
