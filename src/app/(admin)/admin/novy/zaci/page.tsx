import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import VyberZaku, { type KartaZaka } from "@/components/admin2/VyberZaku";
import { Info, Prazdne, zaku } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace, filtryDoAdresy, nactiFiltry } from "@/lib/admin2/data";
import { DEFINICE, NAZEV_STAVU, krokyAktivace, lideMetriky, stavZaka, uspesnost, vyhovujeFiltru, denZ, dnyMezi, type MetrikaId } from "@/lib/admin2/metriky";
import { segmenty, serad, type Razeni } from "@/lib/admin2/segmenty";
import { nazevZdroje } from "@/lib/admin2/nastaveni";
import { zobraz } from "@/lib/admin2/sdileni";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";

/**
 * Žáci (ZA-01 až ZA-03): hledání, segmenty jako čipy, karty žáků s tečkami aktivace, řazení,
 * hromadné akce a export. ?metrika=… ukáže přesně ty lidi, kteří stojí za dlaždicí na Dnes.
 */
export const metadata = { title: "Žáci · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;

const TON: Record<string, string> = { novy: "", aktivni: "ok", usina: "pozor", spi: "spatne", nezacal: "seda" };

export default async function Zaci({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  let obsah: React.ReactNode;
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="zaci" titulek="Žáci" demo={demo}><ChybaMigrace /></Stranka>;
  {
    const f = nactiFiltry(sp);
    const dnes = pragueDateStr();
    const segs = segmenty(z.nastaveni, dnes);
    const segKlic = typeof sp.segment === "string" ? sp.segment : null;
    const seg = segs.find((s) => s.klic === segKlic) ?? null;
    const metrika = typeof sp.metrika === "string" && sp.metrika in DEFINICE ? (sp.metrika as MetrikaId) : null;
    const ids = typeof sp.ids === "string" && sp.ids ? new Set(sp.ids.split(",")) : null;
    const hledat = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
    const razeni: Razeni = sp.razeni === "aktivita" || sp.razeni === "pauza" ? sp.razeni : "registrace";

    let seznam = z.zaci.filter((x) => vyhovujeFiltru(x, f));
    let popis = "";
    if (metrika) {
      const m = lideMetriky(metrika, seznam, z.dny, f.od, f.do);
      const lide = new Set(m.lide);
      seznam = seznam.filter((x) => lide.has(x.id));
      popis = `${DEFINICE[metrika].nazev}: ${m.lide.length}${metrika === "aktivovani" ? ` z ${m.zaklad.length}` : ""} (${new Date(f.od + "T12:00:00").toLocaleDateString("cs-CZ")} až ${new Date(f.do + "T12:00:00").toLocaleDateString("cs-CZ")})`;
    }
    if (seg) seznam = seznam.filter(seg.test);
    if (ids) seznam = seznam.filter((x) => ids.has(x.id));
    if (hledat) seznam = seznam.filter((x) => { const zz = zobraz(x, z.k.sdileni, z.ps); return [zz.jmeno, z.k.sdileni ? "" : x.email ?? "", x.prezdivka ?? ""].some((s) => s.toLowerCase().includes(hledat)); });
    seznam = serad(seznam, razeni, dnes);

    const stitkyMapa = new Map<string, string[]>();
    if (!z.k.demo && supabaseAdmin) {
      const { data } = await supabaseAdmin.from("admin_stitky").select("user_id, stitek").limit(5000);
      for (const r of data ?? []) stitkyMapa.set(r.user_id as string, [...(stitkyMapa.get(r.user_id as string) ?? []), r.stitek as string]);
    }
    const karty: KartaZaka[] = seznam.map((x) => {
      const st = stavZaka(x, z.nastaveni, dnes);
      const pred = dnyMezi(denZ(x.registrace), dnes);
      const u = uspesnost(x);
      return {
        id: x.id, jmeno: zobraz(x, z.k.sdileni, z.ps).jmeno, trida: x.trida,
        prisel: `Přišel ${pred === 0 ? "dnes" : pred === 1 ? "včera" : new Date(x.registrace).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })} · ${nazevZdroje(x.zdroj, z.nastaveni.kampane)}`,
        stav: NAZEV_STAVU[st], stavTon: TON[st],
        posledni: x.posledni_aktivita ? `naposledy ${dnyMezi(x.posledni_aktivita, dnes) === 0 ? "dnes" : `před ${dnyMezi(x.posledni_aktivita, dnes)} d`}` : "zatím netrénoval",
        treninky: `${x.dny_celkem} ${x.dny_celkem === 1 ? "den" : x.dny_celkem >= 2 && x.dny_celkem <= 4 ? "dny" : "dní"} s tréninkem${u !== null ? ` · ${u} % (${x.odpovedi})` : ""}`,
        kroky: krokyAktivace(x), stitky: stitkyMapa.get(x.id) ?? [],
      };
    });

    const zakladni = z.zaci.filter((x) => vyhovujeFiltru(x, f));
    const odkaz = (zmeny: Record<string, string | null>) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && !["segment", "metrika", "ids"].includes(k)) q.set(k, v);
      for (const [k, v] of Object.entries(zmeny)) { if (v) q.set(k, v); else q.delete(k); }
      return `/admin/novy/zaci${q.toString() ? `?${q}` : ""}`;
    };
    const exportQ = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) exportQ.set(k, v);

    obsah = (
      <>
        <form className="a2-radek" action="/admin/novy/zaci" role="search">
          {Object.entries(sp).filter(([k, v]) => typeof v === "string" && v && k !== "q").map(([k, v]) => <input key={k} type="hidden" name={k} value={v as string} />)}
          <input type="search" name="q" defaultValue={hledat} placeholder="Hledat jméno, přezdívku, e-mail" aria-label="Hledat žáka" id="zaci-hledat" style={{ flex: 1 }} />
          <button type="submit" className="a2-btn a2-sek">Hledat</button>
        </form>
        <div className="a2-cipy" role="group" aria-label="Segmenty" data-testid="a2-segmenty">
          <Link className="a2-cip" aria-current={!seg && !metrika && !ids ? "true" : undefined} href={odkaz({})}>Všichni <b>{zakladni.length}</b></Link>
          {segs.map((s) => <Link key={s.klic} className="a2-cip" aria-current={seg?.klic === s.klic ? "true" : undefined} href={odkaz({ segment: s.klic })} title={s.popis}>{s.nazev} <b>{zakladni.filter(s.test).length}</b></Link>)}
          {z.nastaveni.segmenty.map((s) => <Link key={s.nazev} className="a2-cip" href={`/admin/novy/zaci?${s.dotaz}`}>★ {s.nazev}</Link>)}
        </div>
        {(popis || ids) && (
          <div className="a2-banner" style={{ background: "var(--a-akcent-slaby)" }}>
            <span>{popis || `Vybraní žáci (${seznam.length})`} {metrika && <Info>{DEFINICE[metrika].definice}</Info>}</span>
            <Link className="a2-btn a2-sek a2-male" href={odkaz({})}>Zrušit výběr</Link>
          </div>
        )}
        <div className="a2-radek a2-mezi">
          <span className="a2-s">{zaku(seznam.length)}{f.trida ? ` · ${f.trida}. třída` : ""}{f.zdroj ? ` · ${nazevZdroje(f.zdroj, z.nastaveni.kampane)}` : ""}</span>
          <span className="a2-cipy" role="group" aria-label="Řazení">
            {([["registrace", "Nejnovější"], ["aktivita", "Poslední aktivita"], ["pauza", "Nejdelší pauza"]] as const).map(([k, n]) => <Link key={k} className="a2-cip" aria-current={razeni === k ? "true" : undefined} href={odkaz({ razeni: k === "registrace" ? null : k, segment: seg?.klic ?? null, metrika, ids: ids ? [...ids].join(",") : null })}>{n}</Link>)}
          </span>
        </div>
        {karty.length === 0 ? <Prazdne titulek="Nikdo neodpovídá filtrům.">Zkus jiný segment nebo období. <Link href="/admin/novy/zaci" style={{ color: "var(--a-modra)" }}>Zobrazit všechny</Link></Prazdne>
          : <VyberZaku zaci={karty} naostro={z.nastaveni.emailyNaostro} exportHref={`/admin/novy/zaci/export${exportQ.toString() ? `?${exportQ}` : ""}`} demo={z.k.demo} />}
        <p className="a2-s">Tečky aktivace: e-mail ověřen · diagnostika · 1. trénink · návrat 2. den. Filtry: {filtryDoAdresy(f) || "7 dní, obě třídy"}.</p>
      </>
    );
  }
  return <Stranka sekce="zaci" titulek="Žáci" demo={demo}>{obsah}</Stranka>;
}
