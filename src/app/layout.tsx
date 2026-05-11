import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaSetup from "@/components/PwaSetup";

export const metadata: Metadata = {
  metadataBase: new URL("https://matemax.matematika-snadno.cz"),
  title: "MateMax — Příprava na přijímačky z matematiky",
  description: "Adaptivní matematický trenér pro žáky 8. a 9. třídy. 700+ příkladů, chytrý algoritmus, 10 minut denně.",
  openGraph: {
    title: "MateMax — Příprava na přijímačky z matematiky",
    description: "Adaptivní matematický trenér pro žáky 8. a 9. třídy. 700+ příkladů, chytrý algoritmus, 10 minut denně.",
    locale: "cs_CZ",
    type: "website",
    siteName: "MateMax",
  },
  twitter: {
    card: "summary_large_image",
    title: "MateMax — Příprava na přijímačky z matematiky",
    description: "Adaptivní matematický trenér pro žáky 8. a 9. třídy. 700+ příkladů, chytrý algoritmus, 10 minut denně.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MateMax",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D1B3E",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className="h-full scroll-smooth">
      <body className="min-h-full" style={{ background: "#F8FAFF", color: "#0D1B3E" }}>
        <PwaSetup />
        {children}
      </body>
    </html>
  );
}
