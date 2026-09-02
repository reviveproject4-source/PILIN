/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const businessCheckUrl =
      process.env.BUSINESS_CHECK_URL || 'https://pilin-business-check.vercel.app';

    return [
      {
        source: '/check',
        destination: `${businessCheckUrl}/check`,
      },
      {
        source: '/check/:path*',
        destination: `${businessCheckUrl}/check/:path*`,
      },
    ];
  },
};

export default nextConfig;
