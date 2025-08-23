/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  transpilePackages: ['ollama'],
  experimental: {
    typedRoutes: true,
  },
  // For GitHub Pages under a subpath, set at build time:
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH ? `${process.env.NEXT_PUBLIC_BASE_PATH}/` : undefined,
  trailingSlash: true,
}

export default nextConfig
