import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(); // Auto-update last modified date

  return [
    // Core pages
    {
      url: process.env.NEXT_PUBLIC_CLIENT_URL!,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0, // Highest priority (homepage)
    },
    // Auth routes that should be indexed
    {
      url: `${process.env.NEXT_PUBLIC_CLIENT_URL}/auth/forgot-password`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${process.env.NEXT_PUBLIC_CLIENT_URL}/auth/login`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${process.env.NEXT_PUBLIC_CLIENT_URL}/auth/signup`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.7,
    },
  ];
}
