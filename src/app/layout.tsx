import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaSetup from "@/components/PwaSetup";

export const metadata: Metadata = {
  title: "MateMax – Chytrá příprava na přijímačky z matematiky",
  description: "Adaptivní matematický trenér pro žáky 8. a 9. třídy. Příprava na CERMAT přijímačky bez stresu.",
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
