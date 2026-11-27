import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return buildSecurityHeaders();
  },
};

export default nextConfig;
