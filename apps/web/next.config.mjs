/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  experimental: {
    typedRoutes: true,
  },
  // For GitHub Pages under a subpath, set at build time:
  // In local dev, ignore NEXT_PUBLIC_BASE_PATH to avoid 404 at '/'
  basePath: !isDev && process.env.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH : undefined,
  assetPrefix: !isDev && process.env.NEXT_PUBLIC_BASE_PATH ? `${process.env.NEXT_PUBLIC_BASE_PATH}/` : undefined,
  trailingSlash: true,
}

export default nextConfig
