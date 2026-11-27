import { Suspense } from "react";
import { redirect } from "next/navigation";
import Shell from "./Shell";
import { stavAdmina } from "@/lib/admin2/auth";
import { nactiDoporuceni, nactiKontext } from "@/lib/admin2/stranka";
import { ChybiMigrace } from "@/lib/admin2/data";

/**
 * Obal každé stránky nového adminu: ověří druhý faktor, spočítá odznaky (počet doporučení na Dnes)
 * a vykreslí rozvržení. Chyba výpočtu odznaků nikdy neshodí stránku.
 */
export default async function Stranka({ sekce, titulek, drobky, demo = false, bezFaktoru = false, children }: {
  sekce: string; titulek: string; drobky?: { nazev: string; href: string }[]; demo?: boolean; bezFaktoru?: boolean; children: React.ReactNode;
}) {
  const s = await stavAdmina(bezFaktoru);
  if (!s.ok) redirect(s.duvod === "overit_faktor" ? "/admin/novy/overeni" : "/prihlaseni?next=/admin/novy");
  const k = await nactiKontext();
  const odznaky: Record<string, number> = {};
  try { const d = await nactiDoporuceni(demo); odznaky.dnes = d.aktivni.length; } catch (e) { if (!(e instanceof ChybiMigrace)) console.error("[admin2] odznaky", e); }
  return (
    <Suspense>
      <Shell sekce={sekce} titulek={titulek} drobky={drobky} odznaky={odznaky} sdileni={k.sdileni} demo={k.demo || demo}>
        {!s.maFaktor && !bezFaktoru && (
          <div className="a2-banner mfa" data-testid="a2-mfa-banner"><span><b>Zapni druhý faktor.</b> Admin vidí údaje dětí, heslo samo nestačí.</span><a className="a2-btn a2-male" href="/admin/novy/zabezpeceni">Nastavit</a></div>
        )}
        {children}
      </Shell>
    </Suspense>
  );
}

export function ChybaMigrace() {
  return (
    <div className="a2-prazdne" data-testid="a2-chybi-migrace">
      <b>Chybí migrace databáze pro nový admin.</b>
      <span>V Supabase → SQL Editor spusť soubor supabase/migrations/20261127_admin_a2.sql. Do té doby můžeš zapnout demo data.</span>
      <a className="a2-btn a2-sek a2-male" href="?demo=1" style={{ alignSelf: "flex-start" }}>Ukázat demo data</a>
    </div>
  );
}
