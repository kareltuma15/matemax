import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { stavAdmina } from "@/lib/admin2/auth";
import "./admin2.css";

/**
 * Nový admin (admin 2.1). Vlastní rozvržení bez studentské lišty, chráněné na serveru:
 * nepřihlášený → přihlášení, kdo není admin → domů, admin s druhým faktorem bez ověření → ověření.
 * Stránky si rozvržení (Shell) vykreslují samy, protože každá zná svůj název a drobečky.
 */
export const metadata: Metadata = {
  title: "MateMax Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminNovyLayout({ children }: { children: React.ReactNode }) {
  const s = await stavAdmina(true);
  if (!s.ok) {
    if (s.duvod === "neprihlasen") redirect("/prihlaseni?next=/admin/novy");
    redirect("/");
  }
  return children;
}
