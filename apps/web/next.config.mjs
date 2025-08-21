/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  async rewrites() {
    const API_URL = process.env.OQR_API_URL || 'http://localhost:4000'
    return [
      { source: '/api/:path*', destination: `${API_URL}/:path*` },
    ]
  },
}

export default nextConfig
