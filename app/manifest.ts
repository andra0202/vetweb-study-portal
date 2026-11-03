import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VetWeb Study Portal",
    short_name: "VetWeb Study",
    description: "VetWeb research participation portal",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffaff",
    theme_color: "#a22da7",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
