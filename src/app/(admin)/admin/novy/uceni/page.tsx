import Link from "next/link";
import Stranka from "@/components/admin2/Stranka";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Učení přijde ve fázi B. Ukazuje, kolik dat z nového logu odpovědí už je. */
export const metadata = { title: "Učení · MateMax Admin" };

export default async function Uceni() {
  let pocet: number | null = null;
  if (supabaseAdmin) { const { count } = await supabaseAdmin.from("odpovedi").select("id", { count: "exact", head: true }); pocet = count ?? 0; }
  return (
    <Stranka sekce="uceni" titulek="Učení">
      <div className="a2-prazdne">
        <b>Přijde ve fázi B (do 22. 1.).</b>
        <span>Témata, úlohy s příznaky (podezřelá, moc těžká, moc lehká), opakování a připravenost. Data se sbírají od 27. 11. 2026: v logu je zatím {pocet ?? "?"} odpovědí.</span>
        <span>Do té doby: úspěšnost po tématech je na kartě žáka a těžké úlohy ve staré <Link href="/admin/analytika" style={{ color: "var(--a-modra)" }}>Analytice</Link>.</span>
      </div>
    </Stranka>
  );
}
