const backendUrl = process.env.BACKEND_URL || 'http://localhost:8005';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyTimeout: 300_000,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
