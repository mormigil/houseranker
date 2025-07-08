import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['www.compass.com', 'compass.com'],
  },
  webpack: (config) => {
    // Ignore source map files from chrome-aws-lambda
    config.module.rules.push({
      test: /\.map$/,
      use: 'ignore-loader',
    });
    
    return config;
  },
};

export default nextConfig;
