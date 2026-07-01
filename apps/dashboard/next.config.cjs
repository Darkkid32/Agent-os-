/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@agent-os/ui'],
  eslint: {
    dirs: ['src'],
  },
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
