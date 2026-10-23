import type { NextConfig } from "next";

const DEFAULT_BACKEND_URL = "https://x-acai-api.srv2043482.hstgr.cloud";

function sanitizeUrl(raw?: string): string {
  if (!raw) return DEFAULT_BACKEND_URL;
  // Remove UTF-8 BOM (\uFEFF), quebras de linha e espaços
  const cleaned = raw.replace(/^\uFEFF/, '').trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  return DEFAULT_BACKEND_URL;
}

const backendUrl = sanitizeUrl(process.env.NEXT_PUBLIC_API_URL || process.env.API_URL);

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,

  env: {
    NEXT_PUBLIC_API_URL: backendUrl,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
