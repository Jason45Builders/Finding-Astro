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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': [require('path').resolve(__dirname, './src'), require('path').resolve(__dirname, './lib')],
    };
    return config;
  },
};

module.exports = nextConfig;
