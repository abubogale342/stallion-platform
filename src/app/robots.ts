import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/utils/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/login", "/auth", "/no-access", "/api"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
