/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'is*.mzstatic.com' },
    ],
  },
};

export default nextConfig;
