import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import { Prazdne } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { zobraz } from "@/lib/admin2/sdileni";
import { nactiRodice } from "@/lib/admin2/rodiny";
import { nactiZpravy, nazevStavu, type Zprava } from "@/lib/admin2/zpravy";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Rodiče (ZA-10): rodiče s dětmi a odběrem týdenního přehledu, stav posledního reportu, vzkazy dětem.
 * Zákazník je rodina: u rodiny je vidět, jestli platí a odkud dítě přišlo. Kontakt z Wixu přijde ve fázi D.
 */
export const metadata = { title: "Rodiče · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;
const FILTRY = [["vse", "Všichni"], ["report", "Odebírají report"], ["nepotvrdil", "Nepotvrdili odběr"], ["plati", "Platí"]] as const;

export default async function Rodice({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const drobky = [{ nazev: "Žáci", href: "/admin/novy/zaci" }];
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="zaci" titulek="Rodiče" drobky={drobky} demo={demo}><ChybaMigrace /></Stranka>;
  const filtr = FILTRY.some(([k]) => k === sp.f) ? (sp.f as string) : "vse";
  const zakMapa = new Map(z.zaci.map((x) => [x.id, x]));
  const [rodice, zpr, vzkazy] = await Promise.all([
    nactiRodice(z.k, z.zaci),
    nactiZpravy(z.k, { limit: 1000 }).catch(() => ({ zpravy: [] as Zprava[] })),
    z.k.demo || !supabaseAdmin ? Promise.resolve([] as { parent_email: string }[]) : supabaseAdmin.from("parent_messages").select("parent_email").limit(2000).then((r) => (r.data ?? []) as { parent_email: string }[]),
  ]);
  const posledniReport = (deti: string[]) => zpr.zpravy.filter((m) => m.sablona === "report" && m.user_id && deti.includes(m.user_id) && !m.testovaci).sort((a, b) => b.odeslano_at.localeCompare(a.odeslano_at))[0] ?? null;
  const plati = (deti: string[]) => deti.some((d) => { const x = zakMapa.get(d); return x && x.premium !== "zdarma"; });
  const vyber = rodice.filter((r) => filtr === "vse" || (filtr === "report" && r.overeno && r.report !== "vypnuto") || (filtr === "nepotvrdil" && !r.overeno) || (filtr === "plati" && plati(r.deti)));
  const pocet = (k: string) => rodice.filter((r) => k === "vse" || (k === "report" && r.overeno && r.report !== "vypnuto") || (k === "nepotvrdil" && !r.overeno) || (k === "plati" && plati(r.deti))).length;

  return (
    <Stranka sekce="zaci" titulek="Rodiče" drobky={drobky} demo={demo}>
      <div className="a2-cipy" role="group" aria-label="Filtr rodičů">
        {FILTRY.map(([k, n]) => <Link key={k} className="a2-cip" aria-current={filtr === k ? "true" : undefined} href={`/admin/novy/zaci/rodice${k === "vse" ? "" : `?f=${k}`}`}>{n} <b>{pocet(k)}</b></Link>)}
      </div>
      {!vyber.length ? <Prazdne titulek={rodice.length ? "Nikdo neodpovídá filtru." : "Zatím žádný propojený rodič."}>Rodič se propojí v appce (Profil → Rodič) nebo přes /rodice. Týdenní přehled chodí jen potvrzeným rodičům žáků s Premium.</Prazdne> : (
        <div className="a2-sekce" data-testid="a2-rodice">
          {vyber.map((r) => {
            const rep = posledniReport(r.deti);
            const vz = vzkazy.filter((v) => v.parent_email?.toLowerCase() === r.email).length;
            return (
              <div key={r.email} className="a2-karta" data-testid="a2-rodic">
                <span className="a2-radek a2-mezi"><b>{z.k.sdileni ? `Rodina: ${r.deti.map((d) => { const x = zakMapa.get(d); return x ? zobraz(x, true, z.ps).jmeno : "?"; }).join(", ")}` : r.email}</b>
                  <span className="a2-radek" style={{ gap: 4 }}>{plati(r.deti) && <span className="a2-stitek ok">Premium</span>}<span className={`a2-stitek ${r.overeno ? "ok" : "pozor"}`}>{r.overeno ? "potvrzeno" : "nepotvrdil odběr"}</span></span></span>
                <span className="a2-s">{r.deti.length === 1 ? "Dítě" : "Děti"}: {r.deti.map((d) => { const x = zakMapa.get(d); return x ? <Link key={d} href={`/admin/novy/zaci/${d}?tab=rodina`} style={{ color: "var(--a-modra)", marginRight: 6 }}>{zobraz(x, z.k.sdileni, z.ps).jmeno} ({x.trida}.)</Link> : null; })}</span>
                <span className="a2-s">Přehled: {r.report === "tydne" ? "každé pondělí" : r.report === "mesicne" ? "jednou za měsíc" : r.report === "vypnuto" ? "vypnutý" : "neznámo"} · poslední report: {rep ? `${new Date(rep.odeslano_at).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })}, ${nazevStavu(rep.stav).toLowerCase()}` : "zatím neodešel (log od 27. 11.)"}{vz ? ` · vzkazy dítěti ${vz}` : ""}</span>
                {r.deti[0] && <a className="a2-btn a2-sek a2-male" style={{ alignSelf: "flex-start" }} href={`/nahled?rodic=1`} target="_blank" rel="noopener">Ukázka přehledu, který rodič dostává</a>}
              </div>
            );
          })}
        </div>
      )}
    </Stranka>
  );
}
