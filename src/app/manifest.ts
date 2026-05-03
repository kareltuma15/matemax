import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MateMax – Přijímačky z matematiky",
    short_name: "MateMax",
    description: "Adaptivní matematický trenér pro 9. třídu. Příprava na CERMAT.",
    start_url: "/trenink",
    display: "standalone",
    background_color: "#0D1B3E",
    theme_color: "#0D1B3E",
    orientation: "portrait",
    categories: ["education"],
    icons: [
      {
        src: "/api/icon?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icon?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
