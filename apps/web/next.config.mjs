/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone' removed — Vercel manages output automatically
  experimental: { typedRoutes: false },
  headers: async () => [
    {
      source: '/kiosk/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    },
  ],
  // No rewrites needed — API routes live inside this Next.js app at /api/v1/*
};

export default nextConfig;
