import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard/", "/editor/"],
      },
    ],
    sitemap: "https://voice-to-video.nextcode.ltd/sitemap.xml",
  };
}
