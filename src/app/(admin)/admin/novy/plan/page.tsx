import Link from "next/link";
import Stranka from "@/components/admin2/Stranka";
import { UkolRadek, NovyUkol } from "@/components/admin2/Ukoly";
import { Prazdne } from "@/components/admin2/Prvky";
import { nactiDoporuceni, nactiKontext } from "@/lib/admin2/stranka";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { KRONIKA } from "@/lib/obsah-kronika";

/**
 * Plán (fáze A: úkoly a přehled doporučení; roadmapa, kalendář a týden v kostce přijdou ve fázi B a C).
 * Úkoly vznikají ručně nebo jedním klepnutím z karty akce na Dnes.
 */
export const metadata = { title: "Plán · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;
type Ukol = { id: number; nazev: string; popis: string | null; stav: string; termin: string | null; tento_tyden: boolean; hotovo_at: string | null };

export default async function Plan({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const k = await nactiKontext();
  const pohled = sp.pohled === "pozdeji" || sp.pohled === "hotovo" ? sp.pohled : "tyden";
  let ukoly: Ukol[] = [];
  if (!k.demo && supabaseAdmin) {
    const { data } = await supabaseAdmin.from("admin_ukoly").select("id, nazev, popis, stav, termin, tento_tyden, hotovo_at").order("priorita").order("termin", { nullsFirst: false }).order("created_at", { ascending: false }).limit(300);
    ukoly = (data ?? []) as Ukol[];
  }
  const vyber = ukoly.filter((u) => pohled === "hotovo" ? u.stav === "hotovo" : u.stav !== "hotovo" && (pohled === "tyden" ? u.tento_tyden : !u.tento_tyden));
  let dop: Awaited<ReturnType<typeof nactiDoporuceni>> | null = null;
  try { dop = await nactiDoporuceni(false); } catch { dop = null; }
  const posledni = KRONIKA.zapisy.filter((z) => z.datum).sort((a, b) => (a.datum! < b.datum! ? 1 : -1)).slice(0, 5);
  return (
    <Stranka sekce="plan" titulek="Plán">
      <section className="a2-sekce">
        <div className="a2-cipy" role="group" aria-label="Pohled">
          {([["tyden", "Tento týden"], ["pozdeji", "Později"], ["hotovo", "Hotovo"]] as const).map(([kk, n]) => <Link key={kk} className="a2-cip" aria-current={pohled === kk ? "true" : undefined} href={`/admin/novy/plan${kk === "tyden" ? "" : `?pohled=${kk}`}`}>{n} <b>{ukoly.filter((u) => kk === "hotovo" ? u.stav === "hotovo" : u.stav !== "hotovo" && (kk === "tyden" ? u.tento_tyden : !u.tento_tyden)).length}</b></Link>)}
        </div>
        <div className="a2-karta">
          {k.demo && <span className="a2-s">V demu se úkoly neukládají.</span>}
          {!k.demo && !vyber.length && <span className="a2-s">Žádné úkoly v tomto pohledu.</span>}
          {vyber.map((u) => <UkolRadek key={u.id} id={u.id} nazev={u.nazev} popis={u.popis} stav={u.stav} termin={u.termin} />)}
          {!k.demo && <NovyUkol otevrit={sp.novy === "1"} />}
        </div>
      </section>
      <div className="a2-dva">
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Doporučení ({dop?.aktivni.length ?? 0})</span><Link href="/admin/novy">na Dnes</Link></h2>
          {!dop || !dop.aktivni.length ? <Prazdne titulek="Nic nečeká." /> : dop.aktivni.map((d) => (
            <div key={d.klic} className="a2-karta a2-akce" data-oblast={d.oblast}><span className="a2-t" style={{ fontSize: 14 }}>{d.titulek}</span><span className="a2-s">{d.proc}</span></div>
          ))}
        </section>
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Kronika novinek</span><Link href="/admin/obsah">celá kronika</Link></h2>
          <div className="a2-karta">
            {posledni.map((z, i) => <span key={i} className="a2-radek a2-mezi"><span style={{ minWidth: 0 }}>{z.popis}</span><span className="a2-s">{new Date(z.datum + "T12:00:00").toLocaleDateString("cs-CZ")}</span></span>)}
            <span className="a2-s">Vyhodnocení změn, roadmapa, kalendář a týden v kostce přijdou ve fázi B a C.</span>
          </div>
        </section>
      </div>
    </Stranka>
  );
}
