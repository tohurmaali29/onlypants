import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/id/checkout", "/en/checkout", "/id/order", "/en/order"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
