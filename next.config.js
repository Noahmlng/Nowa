/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 确保CSS正确处理
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig; 