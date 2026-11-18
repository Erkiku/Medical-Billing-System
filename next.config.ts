import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When an external backend URL is configured, proxy /api calls to it.
  // Otherwise, use the built-in Next.js serverless API routes connected to Supabase.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
