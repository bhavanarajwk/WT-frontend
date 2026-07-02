import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Turbopack is enabled via `pnpm dev` (`next dev --turbopack`).
  experimental: {
    optimizePackageImports: ["@tanstack/react-query", "@base-ui/react"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_BASE_URL || "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
