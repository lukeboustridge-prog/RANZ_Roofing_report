import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://reports.ranz.co.nz";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/reports/",
          "/sign-in/",
          "/sign-up/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
