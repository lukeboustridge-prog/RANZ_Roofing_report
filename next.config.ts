import type { NextConfig } from "next";

// Security headers for all responses
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.r2.dev https://*.cloudflare.com https://*.clerk.com https://img.clerk.com",
      "connect-src 'self' https://*.clerk.accounts.dev https://clerk.com https://*.r2.cloudflarestorage.com",
      "frame-src 'self' https://*.clerk.accounts.dev",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Webpack configuration to externalize @react-pdf/renderer
  webpack: (config, { isServer }) => {
    // Externalize @react-pdf/renderer for ALL builds (server and client)
    // This prevents the "<Html> should not be imported outside pages/_document" error
    // because @react-pdf/renderer exports its own Html component that conflicts with Next.js
    config.externals = config.externals || [];

    if (isServer) {
      config.externals.push({
        "@react-pdf/renderer": "commonjs @react-pdf/renderer",
      });
    } else {
      // For client builds, completely exclude @react-pdf/renderer
      // It should never be used on the client anyway
      config.externals.push({
        "@react-pdf/renderer": "commonjs @react-pdf/renderer",
      });
    }

    // Add rule to ignore @react-pdf/renderer in client bundles
    // This prevents static analysis from pulling in the Html component
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback["@react-pdf/renderer"] = false;
    }

    return config;
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.cloudflare.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.clerk.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },

  // Server-only packages (not bundled for client)
  serverExternalPackages: ["@react-pdf/renderer"],

  // Experimental features
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
