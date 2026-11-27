import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import { Info, Prazdne } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { zobraz } from "@/lib/admin2/sdileni";
import { isoPred } from "@/lib/admin2/metriky";
import { malyVzorek, wilson } from "@/lib/admin2/mala-cisla";
import { kontrolyUloh, potlaceneUlohy } from "@/lib/admin2/kontroly";
import { ChybiMigraceUceni, MERI_SE_OD, NAZVY_PRIZNAKU, POPISY_PRIZNAKU, mrizka, nactiKarty, nactiOdpovedi, opakovani, statTemat, statUloh, type Odpoved, type Karta, type Priznak } from "@/lib/admin2/uceni";

/**
 * Učení (fáze B3, UC-01 až UC-06, UC-10): témata od nejslabšího, úlohy s příznaky, mřížka žáci × témata, opakování.
 * Úspěšnost = první pokus u všech, kdo úlohu začali. Data z logu odpovědí od 26. 11. 2026.
 */
export const metadata = { title: "Učení · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;
const TABY = [["temata", "Témata"], ["ulohy", "Úlohy"], ["mrizka", "Žáci × témata"], ["opakovani", "Opakování"]] as const;
const OBDOBI = [["30", "30 dní"], ["90", "90 dní"], ["vse", "Od začátku"]] as const;
const sek = (ms: number | null) => (ms === null ? "–" : ms < 60000 ? `${Math.round(ms / 1000)} s` : `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`);
const ton = (u: number | null) => (u === null ? "seda" : u >= 75 ? "ok" : u >= 50 ? "pozor" : "spatne");

export default async function Uceni({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const tab = TABY.some(([k]) => k === sp.tab) ? (sp.tab as string) : "temata";
  const obdobi = OBDOBI.some(([k]) => k === sp.dni) ? (sp.dni as string) : "30";
  const trida = sp.trida === "5" ? 5 : sp.trida === "9" ? 9 : null;
  const priznak = typeof sp.priznak === "string" && sp.priznak in NAZVY_PRIZNAKU ? (sp.priznak as Priznak) : null;
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="uceni" titulek="Učení" demo={demo}><ChybaMigrace /></Stranka>;

  let data: { odp: Odpoved[]; karty: Karta[] } | null = null;
  try {
    const [odp, karty] = await Promise.all([nactiOdpovedi(z.k, { od: obdobi === "vse" ? undefined : isoPred(Number(obdobi)) }), tab === "opakovani" ? nactiKarty(z.k) : Promise.resolve([] as Karta[])]);
    data = { odp, karty };
  } catch (e) { if (!(e instanceof ChybiMigraceUceni)) throw e; }

  const pocitane = new Set(z.zaci.map((x) => x.id));
  const odp = (data?.odp ?? []).filter((r) => pocitane.has(r.user_id) && (!trida || (r.trida === 5 ? 5 : 9) === trida));
  const karty = (data?.karty ?? []).filter((c) => pocitane.has(c.user_id));
  const zakMapa = new Map(z.zaci.map((x) => [x.id, x]));
  const jm = (id: string) => { const x = zakMapa.get(id); return x ? zobraz(x, z.k.sdileni, z.ps).jmeno : "?"; };
  const odkaz = (zmeny: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v);
    for (const [k, v] of Object.entries(zmeny)) { if (v) q.set(k, v); else q.delete(k); }
    return `/admin/novy/uceni${q.toString() ? `?${q}` : ""}`;
  };
  const prazdno = <Prazdne titulek="Zatím žádné odpovědi.">Log odpovědí se sbírá od {new Date(MERI_SE_OD + "T12:00:00").toLocaleDateString("cs-CZ")}. Čísla se objeví, jakmile žáci začnou trénovat. Pro ukázku zapni demo data.</Prazdne>;

  let telo: React.ReactNode;
  if (!data) telo = <Prazdne titulek="Chybí migrace logu odpovědí.">Spusť supabase/migrations/20261126_admin_a1.sql.</Prazdne>;
  else if (tab === "temata") {
    const t = statTemat(odp);
    telo = !t.length ? prazdno : (
      <section className="a2-sekce" data-testid="a2-temata">
        <h2 className="a2-h2"><span>Témata · od nejslabšího</span><Info>Úspěšnost = podíl správných odpovědí na první pokus u všech, kdo úlohu začali (přeskočení = neúspěch). Opakování se nepočítá. Trend = posledních 14 dní proti předchozím 14 (až od 10 pokusů v obou).</Info></h2>
        {t.map((s) => {
          const w = s.prvni ? wilson(s.spravne, s.prvni) : null;
          return (
            <Link key={s.tema} href={odkaz({ tab: "ulohy", tema: s.tema })} className="a2-karta" data-testid="a2-tema">
              <span className="a2-radek a2-mezi"><b>{s.nazev} <span className={`a2-tr t${s.trida}`}>{s.trida}.</span></b><span className={`a2-stitek ${ton(s.uspesnost)}`}>{s.uspesnost ?? "–"} %</span></span>
              <span className="a2-pruh"><span style={{ width: `${s.uspesnost ?? 0}%`, background: `var(--a-${ton(s.uspesnost) === "spatne" ? "spatne" : ton(s.uspesnost) === "pozor" ? "pozor" : "ok"})` }} /></span>
              <span className="a2-s">{s.zaci.length} {s.zaci.length === 1 ? "žák" : s.zaci.length <= 4 ? "žáci" : "žáků"} · {s.spravne} z {s.prvni} na první pokus{w ? ` (nejspíš ${w[0]}–${w[1]} %)` : ""} · {s.odpovedi} odpovědí · medián {sek(s.medianMs)}{s.trend !== null ? ` · trend ${s.trend > 0 ? "+" : ""}${s.trend} b.` : ""}</span>
              {malyVzorek(s.prvni) && <span className="a2-maly">malý vzorek</span>}
            </Link>
          );
        })}
      </section>
    );
  } else if (tab === "ulohy") {
    const tema = typeof sp.tema === "string" ? sp.tema : null;
    const potlacene = potlaceneUlohy(await kontrolyUloh(z.k.demo), odp);
    const vse = statUloh(odp).map((x) => (potlacene.has(x.uloha_id) ? { ...x, priznaky: [] as Priznak[], zkontrolovano: true } : { ...x, zkontrolovano: false }));
    const u = vse.filter((x) => (!tema || x.tema === tema) && (!priznak || x.priznaky.includes(priznak)));
    telo = (
      <section className="a2-sekce" data-testid="a2-ulohy">
        <div className="a2-cipy" role="group" aria-label="Příznak">
          <Link className="a2-cip" aria-current={!priznak ? "true" : undefined} href={odkaz({ priznak: null })}>Všechny <b>{vse.filter((x) => !tema || x.tema === tema).length}</b></Link>
          {(Object.keys(NAZVY_PRIZNAKU) as Priznak[]).map((p) => <Link key={p} className="a2-cip" aria-current={priznak === p ? "true" : undefined} href={odkaz({ priznak: p })} title={POPISY_PRIZNAKU[p]}>{NAZVY_PRIZNAKU[p]} <b>{vse.filter((x) => (!tema || x.tema === tema) && x.priznaky.includes(p)).length}</b></Link>)}
          {tema && <Link className="a2-cip" href={odkaz({ tema: null })}>× jen téma {vse.find((x) => x.tema === tema)?.nazevTematu ?? tema}</Link>}
        </div>
        {!u.length ? (odp.length ? <Prazdne titulek="Žádná úloha neodpovídá filtru." /> : prazdno) : u.slice(0, 100).map((x) => (
          <Link key={x.uloha_id} href={`/admin/novy/uceni/uloha/${encodeURIComponent(x.uloha_id)}`} className={`a2-karta${x.priznaky.length ? " a2-akce" : ""}`} data-oblast={x.priznaky.includes("podezrela") ? "penize" : undefined} data-testid="a2-uloha">
            <span className="a2-radek a2-mezi"><b>{x.uloha_id} · {x.nazevTematu}{x.zkontrolovano ? <span className="a2-stitek ok" style={{ marginLeft: 6 }}>zkontrolováno</span> : null}</b><span className="a2-s">{x.pokusy} {x.pokusy === 1 ? "pokus" : x.pokusy <= 4 ? "pokusy" : "pokusů"} · {x.zaci} {x.zaci === 1 ? "žák" : x.zaci <= 4 ? "žáci" : "žáků"}</span></span>
            {x.priznaky.length > 0 && <span className="a2-radek" style={{ gap: 4 }}>{x.priznaky.map((p) => <span key={p} className={`a2-stitek ${p === "podezrela" || p === "tezka" ? "spatne" : "pozor"}`} title={POPISY_PRIZNAKU[p]}>{NAZVY_PRIZNAKU[p]}</span>)}</span>}
            <span className="a2-s">Na první pokus {x.spravne} z {x.pokusy}{x.uspesnost !== null ? ` (${x.uspesnost} %)` : ""} · medián {sek(x.medianMs)}{x.kvartilyMs ? ` (${sek(x.kvartilyMs[0])}–${sek(x.kvartilyMs[1])})` : ""} · přeskočeno {x.preskoceno} · nápověda {x.napoveda}</span>
            {x.spatna && <span className="a2-s">Nejčastější špatná odpověď „{x.spatna.odpoved}“ {x.spatna.pocet}× (správně {x.spravnaPocet}×){x.tipovani ? ` · rychlé špatné odpovědi pod 5 s: ${x.tipovani} z ${x.spatnych}` : ""}</span>}
            {malyVzorek(x.pokusy) && <span className="a2-maly">malý vzorek</span>}
          </Link>
        ))}
      </section>
    );
  } else if (tab === "mrizka") {
    const m = mrizka(odp);
    const temata = m.temata.slice(0, 8);
    const zaci = [...m.radky.keys()].sort((a, b) => jm(a).localeCompare(jm(b), "cs"));
    telo = !zaci.length ? prazdno : (
      <section className="a2-sekce" data-testid="a2-mrizka">
        <p className="a2-s">V buňce úspěšnost na první pokus a počet úloh. Číslo je vždy vidět, barva jen doplňuje. Klepnutí otevře učení žáka.</p>
        <div className="a2-karta" style={{ overflowX: "auto", padding: 8 }}>
          <table className="a2-mrizka">
            <thead><tr><th scope="col">Žák</th>{temata.map((t) => <th key={t} scope="col">{statTemat(odp.filter((r) => r.tema === t))[0]?.nazev ?? t}</th>)}</tr></thead>
            <tbody>
              {zaci.map((id) => (
                <tr key={id}>
                  <th scope="row"><Link href={`/admin/novy/zaci/${id}?tab=uceni`} style={{ color: "var(--a-modra)" }}>{jm(id)}</Link></th>
                  {temata.map((t) => { const b = m.radky.get(id)?.get(t); return <td key={t}>{b ? <Link href={`/admin/novy/zaci/${id}?tab=uceni#t-${t}`} className={`a2-bunka ${ton(b.uspesnost)}`}>{b.uspesnost ?? "–"} %<small>{b.odpovedi}</small></Link> : <span className="a2-bunka seda">–<small>0</small></span>}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  } else {
    const o = opakovani(karty, odp);
    const max = Math.max(1, ...o.intervaly.map((i) => i.pocet));
    telo = (
      <section className="a2-dva" data-testid="a2-opakovani">
        <div className="a2-sekce">
          <h2 className="a2-h2"><span>Opakování v intervalech (SM-2)</span><Info>Karty opakování z appky. Na řadě = termín opakování je dnes nebo dřív. Úspěšnost v opakování z logu odpovědí v režimu opakování (od 26. 11. 2026).</Info></h2>
          <div className="a2-karta">
            <span className="a2-radek" style={{ gap: 16 }}><span><b style={{ fontSize: 22 }}>{o.naRade}</b><br /><span className="a2-s">dnes na řadě</span></span><span><b style={{ fontSize: 22 }}>{o.poTerminu}</b><br /><span className="a2-s">po termínu</span></span><span><b style={{ fontSize: 22 }}>{o.uspesnost ?? "–"}{o.uspesnost !== null ? " %" : ""}</b><br /><span className="a2-s">úspěšnost ({o.opakovani})</span></span></span>
            <span className="a2-s">{o.karet} karet · průměrný faktor snadnosti {o.prumerEase?.toLocaleString("cs-CZ") ?? "–"}</span>
          </div>
          <div className="a2-karta">
            <b>Jak dlouhé jsou intervaly?</b>
            {o.intervaly.map((i) => <span key={i.nazev} className="a2-radek" style={{ flexWrap: "nowrap" }}><span className="a2-s" style={{ width: 70, flex: "none" }}>{i.nazev}</span><span className="a2-pruh" style={{ flex: 1 }}><span style={{ width: `${(i.pocet / max) * 100}%` }} /></span><b style={{ width: 32, textAlign: "right" }}>{i.pocet}</b></span>)}
          </div>
        </div>
        <div className="a2-sekce">
          <h2 className="a2-h2"><span>Zapomínají stejné úlohy</span><Info>Žák neuspěl u stejné úlohy v opakování aspoň 4×. Pomůže vysvětlení nebo videolekce.</Info></h2>
          {!o.zapomina.length ? <Prazdne titulek="Nikdo.">Zatím žádný žák nezapomíná stejnou úlohu opakovaně.</Prazdne> : (
            <div className="a2-karta">
              {o.zapomina.slice(0, 20).map((x) => <span key={x.user_id + x.uloha_id} className="a2-radek a2-mezi"><Link href={`/admin/novy/zaci/${x.user_id}?tab=uceni`} style={{ color: "var(--a-modra)" }}>{jm(x.user_id)}</Link><span className="a2-s"><Link href={`/admin/novy/uceni/uloha/${encodeURIComponent(x.uloha_id)}`}>{x.uloha_id}</Link> · {x.neuspechu}× neúspěch</span></span>)}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <Stranka sekce="uceni" titulek="Učení" demo={demo}>
      <nav className="a2-zalozky" aria-label="Části Učení">
        {TABY.map(([k, n]) => <Link key={k} href={odkaz({ tab: k === "temata" ? null : k, priznak: null })} aria-current={tab === k ? "page" : undefined} data-testid={`a2-tab-${k}`}>{n}</Link>)}
      </nav>
      <div className="a2-radek a2-mezi">
        <div className="a2-cipy" role="group" aria-label="Období">{OBDOBI.map(([k, n]) => <Link key={k} className="a2-cip" aria-current={obdobi === k ? "true" : undefined} href={odkaz({ dni: k === "30" ? null : k })}>{n}</Link>)}</div>
        <div className="a2-cipy" role="group" aria-label="Třída">{([[null, "Obě"], ["5", "5."], ["9", "9."]] as const).map(([k, n]) => <Link key={n} className="a2-cip" aria-current={(trida ? String(trida) : null) === k ? "true" : undefined} href={odkaz({ trida: k })}>{n}</Link>)}</div>
      </div>
      {telo}
    </Stranka>
  );
}
