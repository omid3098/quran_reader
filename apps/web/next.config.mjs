const basePath = process.env.BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  experimental: {
    typedRoutes: true,
  },
  // For GitHub Pages under a subpath, set at build time:
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
}

export default nextConfig
