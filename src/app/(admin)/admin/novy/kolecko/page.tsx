import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import Kolecko, { type KartaKolecka } from "@/components/admin2/Kolecko";
import { nactiDoporuceni, nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { cileSezony } from "@/lib/admin2/metriky";
import { zobraz } from "@/lib/admin2/sdileni";
import { kdy } from "@/lib/admin2/cas";
import { DRUHY_SCHRANKY, ChybiMigraceB, nactiSchranku, type Polozka } from "@/lib/admin2/zpravy";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";

/**
 * Večerní kolečko (DN-02): průvodce na 15 minut. Pořadí: Schránka → fronta akcí → cíle sezóny → plán na zítra.
 */
export const metadata = { title: "Večerní kolečko · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;

async function schrankaBezchyby(k: Parameters<typeof nactiSchranku>[0]): Promise<Polozka[]> {
  try { return await nactiSchranku(k, { stav: "nove" }); } catch (e) { if (e instanceof ChybiMigraceB) return []; throw e; }
}

export default async function KoleckoStranka({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const drobky = [{ nazev: "Dnes", href: "/admin/novy" }];
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="dnes" titulek="Večerní kolečko" drobky={drobky} demo={demo}><ChybaMigrace /></Stranka>;

  const podleId = new Map(z.zaci.map((x) => [x.id, x]));
  const jm = (id: string | null) => { const x = id ? podleId.get(id) : undefined; return x ? `${zobraz(x, z.k.sdileni, z.ps).jmeno} (${x.trida}.)` : null; };
  const [schranka, { aktivni }, ukoly] = await Promise.all([
    schrankaBezchyby(z.k),
    nactiDoporuceni(demo),
    z.k.demo || !supabaseAdmin ? Promise.resolve([] as { id: number; nazev: string; popis: string | null }[])
      : supabaseAdmin.from("admin_ukoly").select("id, nazev, popis").eq("tento_tyden", true).in("stav", ["novy", "delam"]).order("priorita").order("created_at").limit(3).then((r) => (r.data ?? []) as { id: number; nazev: string; popis: string | null }[]),
  ]);

  const karty: KartaKolecka[] = [];
  for (const p of schranka.slice(0, 10)) {
    const kdo = jm(p.user_id) ?? (z.k.sdileni ? "Neznámý odesílatel" : p.od ?? "Anonym");
    karty.push({
      klic: `s${p.id}`, druh: "zprava", stitek: `${DRUHY_SCHRANKY[p.druh]} · ${kdy(p.created_at)}`, titulek: kdo,
      bublina: p.text, text: p.druh === "chyba_ulohy" ? `Úloha ${p.uloha_id ?? "?"}` : p.druh === "odpoved" && p.predmet ? `Na: ${p.predmet.replace(/^Re:\s*/i, "")}` : null,
      odkaz: p.druh === "chyba_ulohy" && p.uloha_id ? { text: "Zobrazit úlohu", href: `/nahled?ids=${encodeURIComponent(p.uloha_id)}` } : { text: "Odpovědět ve Schránce", href: "/admin/novy/zpravy" },
      schrankaId: p.id,
    });
  }
  for (const d of aktivni.slice(0, 7)) {
    const lide = d.lide.slice(0, 5).map(jm).filter(Boolean).join(", ");
    karty.push({
      klic: d.klic, druh: "akce", stitek: d.oblast === "penize" ? "Peníze" : d.oblast === "aktivace" ? "Aktivace" : d.oblast === "navrat" ? "Návrat" : d.oblast === "obsah" ? "Obsah" : d.oblast === "zpravy" ? "Zprávy" : d.oblast === "uceni" ? "Učení" : "Růst",
      titulek: d.titulek, text: d.proc, radky: lide ? [`${lide}${d.lide.length > 5 ? ` a ${d.lide.length - 5} další` : ""}`] : [],
      odkaz: d.akce.typ === "odkaz" ? { text: d.akce.text, href: d.akce.href } : d.lide.length ? { text: d.akce.typ === "email" ? "Otevřít žáky (e-mail z karty)" : "Otevřít žáky", href: `/admin/novy/zaci?ids=${d.lide.join(",")}` } : undefined,
      doporuceni: { klic: d.klic, pravidlo: d.pravidlo, ukol: d.akce.typ === "ukol" ? d.akce.ukol : undefined },
    });
  }
  const cile = cileSezony(z.zaci, z.nastaveni);
  if (cile.length) karty.push({
    klic: `cile-${pragueDateStr()}`, druh: "cile", stitek: "Cíle sezóny", titulek: "Jak plníš cíle",
    radky: cile.map((c) => `${c.nazev}: ${c.hodnota === null ? "zatím neměříme" : `${c.hodnota} z ${c.od}–${c.az} ${c.jednotka}`} do ${new Date(c.doKdy + "T12:00:00").toLocaleDateString("cs-CZ")}${c.tempo !== null ? ` · tempem ${c.tempo}` : ""}`),
    odkaz: { text: "Detail cílů", href: "/admin/novy#h-cile" },
  });
  if (ukoly.length) for (const u of ukoly) karty.push({ klic: `u${u.id}`, druh: "plan", stitek: "Plán týdne", titulek: u.nazev, text: u.popis, ukolId: u.id, odkaz: { text: "Plán", href: "/admin/novy/plan" } });
  else karty.push({ klic: `plan-${pragueDateStr()}`, druh: "plan", stitek: "Plán na zítra", titulek: "Plán týdne je prázdný", text: "Přidej si 3 úkoly na zítra v Plánu.", odkaz: { text: "Otevřít plán", href: "/admin/novy/plan" } });

  return (
    <Stranka sekce="dnes" titulek="Večerní kolečko" drobky={drobky} demo={demo}>
      <Kolecko karty={karty} />
    </Stranka>
  );
}
