import type { MetadataRoute } from "next";
import { EXAMPLES_LABEL, DAILY_MINUTES } from "@/lib/site-stats";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MateMax — Přijímačky z matematiky",
    short_name: "MateMax",
    description: `Adaptivní příprava na přijímačky z matematiky. ${EXAMPLES_LABEL} příkladů, ${DAILY_MINUTES} minut denně.`,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D1B3E",
    theme_color: "#0D1B3E",
    categories: ["education"],
    lang: "cs",
    icons: [
      { src: "/api/icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: "Trénovat", short_name: "Trénovat", url: "/trenink", icons: [{ src: "/api/icon?size=96", sizes: "96x96" }] },
      { name: "Profil", short_name: "Profil", url: "/profil", icons: [{ src: "/api/icon?size=96", sizes: "96x96" }] }
    ]
  };
}
