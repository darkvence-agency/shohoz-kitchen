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
  async headers() {
    // Files under public/ are served with `max-age=0` by default, so the browser
    // re-validates every one of them on every page load. From Dhaka that round
    // trip measures ~0.69s per image even when the answer is 304. These are brand
    // assets that change rarely — when one does change, give the file a new name
    // (as with hero-01.webp) rather than overwriting it.
    return [
      {
        source: "/:path(categories|images|products)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
      {
        // The logo sits at the public root and loads in the header of every page.
        source: "/:file(logo|logo-mark).svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
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
        hostname: "picsum.photos",
      },
      // Uploaded product/category images. fileToUrl() on the API builds these
      // from BACKEND_URL, so the API's own host has to be allowed here or
      // next/image refuses to optimise them.
      {
        protocol: "https",
        hostname: "api.13.140.168.218.sslip.io",
      },
      {
        protocol: "https",
        hostname: "api.shohozkitchen.com",
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
