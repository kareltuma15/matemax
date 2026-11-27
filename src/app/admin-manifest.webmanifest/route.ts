import { NextResponse } from "next/server";

/**
 * Manifest aplikace „MateMax Admin“ (KO-11): vlastní ikona na ploše telefonu, start rovnou na Dnes.
 * Na iPhonu jde push jen z aplikace přidané na plochu (Sdílet → Přidat na plochu).
 */
export function GET() {
  return NextResponse.json({
    name: "MateMax Admin",
    short_name: "MM Admin",
    description: "Admin MateMaxu: Dnes, Žáci, Zprávy, Plán.",
    id: "/admin/novy",
    start_url: "/admin/novy",
    scope: "/admin/novy",
    display: "standalone",
    background_color: "#F5F6FA",
    theme_color: "#5B55D6",
    lang: "cs",
    icons: [
      { src: "/api/icon?size=192&admin=1", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/icon?size=512&admin=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Večerní kolečko", url: "/admin/novy/kolecko" },
      { name: "Zprávy", url: "/admin/novy/zpravy" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
