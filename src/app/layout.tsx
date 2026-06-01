import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import PwaSetup from "@/components/PwaSetup";
import { THEME_SCRIPT } from "@/lib/theme";

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
    <html lang="cs" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full" style={{ background: "var(--surface-1)", color: "var(--text-primary)" }}>
        <PwaSetup />
        {children}
      </body>
    </html>
  );
}
