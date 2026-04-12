import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Restrict dev origins to localhost only (not wildcard)
  allowedDevOrigins: ["http://localhost:3000"],
};

export default nextConfig;
