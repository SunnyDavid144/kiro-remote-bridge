import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the LAN IP to access dev resources (HMR, JS bundles)
  allowedDevOrigins: ["192.168.1.180"],

  // Rewrites let the frontend proxy API/health requests to the backend.
  async rewrites() {
    return [
      {
        source: "/health",
        destination: "http://127.0.0.1:3100/health",
      },
    ];
  },
};

export default nextConfig;
