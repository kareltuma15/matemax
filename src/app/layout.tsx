import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import PwaSetup from "@/components/PwaSetup";
import ProgressSync from "@/components/ProgressSync";
import { THEME_SCRIPT } from "@/lib/theme";
import { EXAMPLES_LABEL, DAILY_MINUTES } from "@/lib/site-stats";

const SITE_DESCRIPTION = `Adaptivní matematický trenér pro žáky 8. a 9. třídy. ${EXAMPLES_LABEL} příkladů, chytrý algoritmus, ${DAILY_MINUTES} minut denně.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://matemax.matematika-snadno.cz"),
  title: "MateMax — Příprava na přijímačky z matematiky",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "MateMax — Příprava na přijímačky z matematiky",
    description: SITE_DESCRIPTION,
    locale: "cs_CZ",
    type: "website",
    siteName: "MateMax",
  },
  twitter: {
    card: "summary_large_image",
    title: "MateMax — Příprava na přijímačky z matematiky",
    description: SITE_DESCRIPTION,
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {/* Anti-flash: apply theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full" style={{ background: "var(--surface-1)", color: "var(--text-primary)" }}>
        <PwaSetup />
        <ProgressSync />
        {children}
      </body>
    </html>
  );
}
