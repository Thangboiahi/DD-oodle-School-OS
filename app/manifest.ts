import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DD-oodle School OS",
    short_name: "DD-oodle",
    description: "Multi-institution School Operations and Learning Ecosystem",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#1D4ED8",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
