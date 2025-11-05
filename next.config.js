/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable CSS optimization to work around Next.js 14.2.x webpack bug
  // See: https://github.com/vercel/next.js/issues/61241
  experimental: {
    optimizeCss: false,
  },
};

module.exports = nextConfig;
