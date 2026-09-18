import type { NextConfig } from "next";

// The Next.js server proxies /api and /uploads to the backend server-side, so
// the browser only ever talks to the site's own origin (same-origin: no CORS,
// no mixed content). Set INTERNAL_API_URL in the deployment env. It is read at
// BUILD time (rewrites are baked into the build), so provide it as a build var.
const INTERNAL_API = process.env.INTERNAL_API_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build for a small Docker runtime image.
  output: "standalone",
  reactCompiler: true,
  async redirects() {
    return [
      { source: "/admin/:path*", destination: "/dashboard/admin/:path*", permanent: false },
      { source: "/seller/:path*", destination: "/dashboard/seller/:path*", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${INTERNAL_API}/api/:path*` },
      { source: "/uploads/:path*", destination: `${INTERNAL_API}/uploads/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      // Production domain (uploaded images are served from the same origin).
      {
        protocol: "https",
        hostname: "shohozkitchen.com",
      },
      {
        protocol: "https",
        hostname: "www.shohozkitchen.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;
