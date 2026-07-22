/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};

if (process.env.SENTRY_DSN) {
  try {
    const { withSentryConfig } = require("@sentry/nextjs");
    module.exports = withSentryConfig(nextConfig, { silent: true });
  } catch {
    module.exports = nextConfig;
  }
} else {
  module.exports = nextConfig;
}
