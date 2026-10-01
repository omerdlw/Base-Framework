import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  return [
    {
      changeFrequency: "daily",
      lastModified: new Date(),
      priority: 1,
      url: siteUrl,
    },
    {
      changeFrequency: "weekly",
      lastModified: new Date(),
      priority: 0.8,
      url: `${siteUrl}/account`,
    },
  ];
}
