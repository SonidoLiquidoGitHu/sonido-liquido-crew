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
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dl.dropboxusercontent.com",
        pathname: "/**",
      },
    ],
  },

  reactStrictMode: true,
};

export default nextConfig;
