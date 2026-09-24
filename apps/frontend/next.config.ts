import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a self-contained server with minimal dependencies
  output: "standalone",

  // Desativa o botão vermelho do Turbopack / Next.js Dev Overlay
  devIndicators: false,

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },

  // Allow cross-origin image sources (for menu item images from external CDNs)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Rewrites para redirecionar chamadas /api para o backend local (porta 3002)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3002/api/:path*",
      },
    ];
  },
};

export default nextConfig;
