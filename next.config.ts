import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  // The preview is served through a proxied host; allow it for dev tooling.
  allowedDevOrigins: ["*.e2b.app", "*.trycloudflare.com"],
};

export default nextConfig;
