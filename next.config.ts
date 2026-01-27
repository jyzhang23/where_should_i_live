import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow xlsx package to use Node.js APIs
  serverExternalPackages: ["xlsx"],
  
  // Ensure API routes can access the filesystem
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
