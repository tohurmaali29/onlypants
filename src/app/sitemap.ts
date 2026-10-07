import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { HELP } from "@/lib/help-content";
import { locales } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog();
  const both = (path: string) => ({
    url: `${siteUrl}/id${path}`,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])) },
  });
  return [
    { ...both(""), changeFrequency: "daily", priority: 1 },
    { ...both("/shop"), changeFrequency: "daily", priority: 0.9 },
    ...catalog.map((p) => ({ ...both(`/p/${p.slug}`), lastModified: p.createdAt, priority: p.available > 0 ? 0.8 : 0.3 })),
    both("/contact"),
    ...Object.keys(HELP).map((s) => both(`/help/${s}`)),
  ];
}
