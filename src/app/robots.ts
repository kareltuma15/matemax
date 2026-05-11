import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/report-preview", "/api/"],
    },
    sitemap: "https://matemax.matematika-snadno.cz/sitemap.xml",
  };
}
