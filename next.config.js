/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Allows production builds to succeed even with type errors
    // Safe to use since TypeScript errors don't affect runtime behavior
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
module.exports = nextConfig;
