import type { Metadata } from "next";

/** Admin se nesmí indexovat (KO-10). Hlavičky X-Robots-Tag a Cache-Control přidává i proxy. */
export const metadata: Metadata = {
  title: "MateMax Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
