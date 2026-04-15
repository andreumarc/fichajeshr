/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
  rewrites: async () => [
    {
      source: '/api/v1/:path*',
      // BACKEND_URL set in Vercel env vars pointing to Railway backend
      destination: `${process.env.BACKEND_URL ?? 'http://localhost:3001'}/api/v1/:path*`,
    },
  ],
};

export default nextConfig;
