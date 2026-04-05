import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from local network for mobile testing
  allowedDevOrigins: [
    // Local network IPs - you can access from your phone on same WiFi
    ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
  ],
};

export default nextConfig;
