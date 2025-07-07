import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
