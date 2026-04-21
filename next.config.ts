import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify requires "standalone" output for serverless functions
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/image/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },

  // Enable strict mode for catching issues early
  reactStrictMode: true,
};

export default nextConfig;
