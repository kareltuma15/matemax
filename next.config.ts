import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Service worker se NESMÍ cachovat. Když prohlížeč drží starou verzi
        // sw.js, servíruje staré stránky a uživatel uvízne na neaktuálním kódu,
        // ze kterého se sám nedostane (viz nález #18).
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
