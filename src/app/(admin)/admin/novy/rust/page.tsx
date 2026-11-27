import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import GeneratorOdkazu from "@/components/admin2/GeneratorOdkazu";
import { Info, Prazdne } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { isoPred } from "@/lib/admin2/metriky";
import { podil } from "@/lib/admin2/mala-cisla";
import { zobraz } from "@/lib/admin2/sdileni";
import { nactiUdalosti } from "@/lib/admin2/navstevy";
import { NAZVY_VSTUPU, kohorty, nactiUtratu, penize, trychtyr, trychtyrUctu, zdroje, type Krok, type Vstup } from "@/lib/admin2/rust";
import { pragueDateStr } from "@/lib/date";

/**
 * Růst (fáze B4, RU-01 až RU-05, RU-08): trychtýř po lidech, zdroje s cenou za aktivovaného, generátor odkazů, retence a peníze.
 * Návštěvy webu jsou anonymní denní otisky bez cookies: jeden člověk ve dvou dnech = dvě návštěvy. Lidi počítáme jen u účtů.
 */
export const metadata = { title: "Růst · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;
const TABY = [["trychtyr", "Trychtýř"], ["zdroje", "Zdroje a odkazy"], ["retence", "Retence"], ["penize", "Peníze"]] as const;
const OBDOBI = [["7", "7 dní"], ["30", "30 dní"], ["90", "90 dní"]] as const;
const min = (m: number | null) => (m === null ? "" : m < 1 ? "do minuty" : m < 60 ? `${Math.round(m)} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);

function Trychtyr({ kroky, nazev }: { kroky: Krok[]; nazev: string }) {
  const max = Math.max(1, kroky[0]?.lide.length ?? 0);
  return (
    <div className="a2-karta" data-testid="a2-trychtyr">
      <b>{nazev}</b>
      {kroky.map((k, i) => (
        <div key={k.nazev} className="a2-sekce" style={{ gap: 2 }}>
          <span className="a2-sloupec"><span>{k.nazev}</span><span className="a2-pruh" style={{ height: 14 }}><span style={{ width: `${(k.lide.length / max) * 100}%` }} /></span><b style={{ textAlign: "right" }}>{k.lide.length}</b></span>
          {i > 0 && <span className="a2-s" style={{ fontSize: 12, paddingLeft: 4 }}>{podil(k.lide.length, kroky[i - 1].lide.length)} z předchozího kroku{k.medianMin !== null ? ` · medián ${min(k.medianMin)}` : ""}{k.ucty && k.odpadli.length ? <> · <Link href={`/admin/novy/zaci?ids=${k.odpadli.join(",")}`} style={{ color: "var(--a-modra)" }}>odpadli ({k.odpadli.length})</Link></> : ""}{k.ucty && k.lide.length ? <> · <Link href={`/admin/novy/zaci?ids=${k.lide.join(",")}`} style={{ color: "var(--a-modra)" }}>prošli</Link></> : ""}</span>}
        </div>
      ))}
    </div>
  );
}

export default async function Rust({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const tab = TABY.some(([k]) => k === sp.tab) ? (sp.tab as string) : "trychtyr";
  const dni = OBDOBI.some(([k]) => k === sp.dni) ? Number(sp.dni) : 30;
  const vstup = (["registrace", "uvod", "email", "vysledky"] as Vstup[]).includes(sp.vstup as Vstup) ? (sp.vstup as Vstup) : "registrace";
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="rust" titulek="Růst" demo={demo}><ChybaMigrace /></Stranka>;
  const od = isoPred(dni), dnes = pragueDateStr(), odDen = od.slice(0, 10);
  const pocitani = new Set(z.zaci.map((x) => x.id));
  const ud = tab === "trychtyr" || tab === "zdroje" ? await nactiUdalosti(z.k, od, pocitani) : [];
  const odkaz = (zmeny: Record<string, string | null>) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v); for (const [k, v] of Object.entries(zmeny)) { if (v) q.set(k, v); else q.delete(k); } return `/admin/novy/rust${q.toString() ? `?${q}` : ""}`; };
  const jm = (id: string) => { const x = z.zaci.find((y) => y.id === id); return x ? zobraz(x, z.k.sdileni, z.ps).jmeno : "?"; };

  let telo: React.ReactNode;
  if (tab === "trychtyr") {
    const anon = trychtyr(ud, vstup), ucty = trychtyrUctu(z.zaci, odDen, dnes);
    telo = (
      <>
        <div className="a2-cipy" role="group" aria-label="Vstup">{(Object.keys(NAZVY_VSTUPU) as Vstup[]).map((v) => <Link key={v} className="a2-cip" aria-current={vstup === v ? "true" : undefined} href={odkaz({ vstup: v === "registrace" ? null : v })}>{NAZVY_VSTUPU[v]} <b>{trychtyr(ud, v)[0]?.lide.length ?? 0}</b></Link>)}</div>
        <div className="a2-dva">
          <div className="a2-sekce">
            <h2 className="a2-h2"><span>Návštěvníci (anonymně)</span><Info>Člověk je v kroku, jen když prošel předchozím. Anonymní návštěvník = denní otisk zařízení bez cookies, kroky se počítají v rámci jednoho dne. Roboti a náhledy odkazů se neměří.</Info></h2>
            {anon[0]?.lide.length ? <Trychtyr kroky={anon} nazev={NAZVY_VSTUPU[vstup]} /> : <Prazdne titulek="Zatím nikdo.">Měří se od 15. 11. 2026 (nové názvy událostí od 26. 11.).</Prazdne>}
          </div>
          <div className="a2-sekce">
            <h2 className="a2-h2"><span>Účty (od registrace)</span><Info>Od registrace jsou to účty žáků bez testovacích a admina, zvlášť od anonymních návštěv. Klepnutím na „odpadli“ otevřeš ty žáky.</Info></h2>
            <Trychtyr kroky={ucty} nazev={`Noví žáci za ${dni} dní`} />
          </div>
        </div>
      </>
    );
  } else if (tab === "zdroje") {
    const utrata = await nactiUtratu(z.k, od);
    const zz = zdroje(ud, z.zaci, z.nastaveni.kampane, utrata, odDen, dnes);
    const vse = zz.reduce((s, x) => s + x.navstevy, 0), prime = zz.find((x) => x.nazev === "Přímo / neznámo")?.navstevy ?? 0;
    const odkud = new Map<string, number>(); for (const x of z.zaci) if (x.odkud && x.registrace.slice(0, 10) >= odDen) odkud.set(x.odkud, (odkud.get(x.odkud) ?? 0) + 1);
    telo = (
      <div className="a2-dva">
        <section className="a2-sekce" data-testid="a2-zdroje">
          <h2 className="a2-h2"><span>Zdroje · {dni} dní</span><Info>Návštěvy = vstupy na web (denní otisky). Registrace, aktivovaní a platící podle zdroje uloženého u účtu. Útrata ze zadané útraty za reklamu. Domény Facebooku jsou sloučené, návrat z platby (Stripe) není zdroj.</Info></h2>
          <p className="a2-zaver" style={{ fontSize: 13 }}>Přímo / neznámo: {podil(prime, vse)} návštěv. Cíl je pod 30 %: každý vlastní odkaz s kampaní z generátoru vpravo.</p>
          {!zz.length ? <Prazdne titulek="Zatím žádná data." /> : zz.map((x) => (
            <div key={x.nazev} className="a2-karta">
              <span className="a2-radek a2-mezi"><b>{x.nazev}</b>{x.utrata !== null && <span className="a2-stitek">{x.utrata.toLocaleString("cs-CZ")} Kč</span>}</span>
              <span className="a2-s">návštěvy {x.navstevy} · registrace {x.registrace} · aktivovaní {x.aktivovani} · platící {x.platici}{x.utrata !== null ? ` · ${x.aktivovani ? `${Math.round(x.utrata / x.aktivovani).toLocaleString("cs-CZ")} Kč za aktivovaného` : "0 aktivovaných"}` : ""}</span>
              {x.zaciIds.length > 0 && <Link className="a2-s" style={{ color: "var(--a-modra)" }} href={`/admin/novy/zaci?ids=${x.zaciIds.join(",")}`}>Žáci ({x.zaciIds.length})</Link>}
            </div>
          ))}
          {odkud.size > 0 && <div className="a2-karta"><b>Odkud se dozvěděli (sami uvedli při registraci)</b>{[...odkud].sort((a, b) => b[1] - a[1]).map(([k, n]) => <span key={k} className="a2-radek a2-mezi"><span>{k}</span><b>{n}</b></span>)}</div>}
        </section>
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Generátor odkazů</span></h2>
          <GeneratorOdkazu demo={z.k.demo} />
          <Link className="a2-btn a2-sek a2-male" href="/admin/analytika" style={{ alignSelf: "flex-start" }}>Zadat útratu za reklamu (starý vzhled)</Link>
        </section>
      </div>
    );
  } else if (tab === "retence") {
    const k = kohorty(z.zaci, z.dny);
    telo = !k.length ? <Prazdne titulek="Zatím žádní žáci." /> : (
      <section className="a2-sekce" data-testid="a2-retence">
        <p className="a2-s">Řádek = žáci registrovaní v týdnu (od pondělí). Buňka = kolik z nich trénovalo v 1., 2., 3.… týdnu po registraci. Klepnutím otevřeš ty žáky.</p>
        <div className="a2-karta" style={{ overflowX: "auto", padding: 8 }}>
          <table className="a2-mrizka">
            <thead><tr><th scope="col">Týden</th><th scope="col">Žáků</th>{[1, 2, 3, 4, 5].map((n) => <th key={n} scope="col">{n}. týden</th>)}</tr></thead>
            <tbody>{k.map((r) => (
              <tr key={r.tyden}>
                <th scope="row">{new Date(r.tyden + "T12:00:00").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}</th>
                <td><Link href={`/admin/novy/zaci?ids=${r.zaci.join(",")}`} style={{ color: "var(--a-modra)", fontWeight: 800 }}>{r.zaci.length}</Link></td>
                {[0, 1, 2, 3, 4].map((i) => { const b = r.tydny[i]; return <td key={i}>{b ? <Link className={`a2-bunka ${b.aktivni.length === 0 ? "seda" : b.aktivni.length / r.zaci.length >= 0.5 ? "ok" : "pozor"}`} href={b.aktivni.length ? `/admin/novy/zaci?ids=${b.aktivni.join(",")}` : "#"}>{b.aktivni.length}<small>z {r.zaci.length}</small></Link> : <span className="a2-s">–</span>}</td>; })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    );
  } else {
    const p = await penize(z.k, z.zaci, od);
    const testy = z.zaci.filter((x) => x.propojeno_vysledky);
    telo = (
      <div className="a2-dva" data-testid="a2-penize">
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Peníze</span><Info>Platící = aktivní předplatné Premium přes Stripe (99 Kč měsíčně). Zaplacené a vrácené platby, nová a zrušená předplatná a selhané platby z webhooků Stripe, ukládají se od 27. 11. 2026.</Info></h2>
          <div className="a2-karta">
            <span className="a2-radek" style={{ gap: 16 }}><span><b style={{ fontSize: 22 }}>{p.mesicne.toLocaleString("cs-CZ")} Kč</b><br /><span className="a2-s">měsíčně · {p.platici.length} platí</span></span></span>
            <span className="a2-s">Za {dni} dní: zaplaceno {p.zaplaceno.toLocaleString("cs-CZ")} Kč · vráceno {p.vraceno.toLocaleString("cs-CZ")} Kč · nová předplatná {p.nova} · zrušená {p.zrusena} · selhané platby {p.selhalo}</span>
            {p.platici.length > 0 && <Link className="a2-s" style={{ color: "var(--a-modra)" }} href={`/admin/novy/zaci?ids=${p.platici.join(",")}`}>Platící žáci</Link>}
          </div>
          <div className="a2-karta">
            <b>Ruční a zkušební Premium ({p.rucne.length})</b>
            {!p.rucne.length && <span className="a2-s">Nikdo.</span>}
            {p.rucne.map((r) => <span key={r.id} className="a2-radek a2-mezi"><Link href={`/admin/novy/zaci/${r.id}?tab=platby`} style={{ color: "var(--a-modra)" }}>{jm(r.id)}</Link><span className="a2-s">{r.do ? `do ${new Date(r.do).toLocaleDateString("cs-CZ")}` : "bez konce"}</span></span>)}
          </div>
        </section>
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Testy nanečisto → MateMax</span><Info>Kolik žákům z testů nanečisto propojilo účet (Mám kód z testu). Kolik žáků bylo na testech celkem, ví Vyhodnocení, MateMax zatím ne, proto cíl 40 % zatím nejde spočítat.</Info></h2>
          <div className="a2-karta">
            <span className="a2-s">Propojených účtů: <b>{testy.length}</b>{testy.length ? <> · <Link href={`/admin/novy/zaci?segment=z_testu`} style={{ color: "var(--a-modra)" }}>otevřít</Link></> : ""}</span>
            <span className="a2-s">Z nich trénovali za posledních 7 dní: {testy.filter((x) => x.dny_7 > 0).length} · Premium: {testy.filter((x) => x.premium !== "zdarma").length}</span>
            <span className="a2-s">Cíl sezóny: aspoň 3 rodiny s Kompletní přípravou do 28. 2. (prodej je ve Wixu, napojení ve fázi D).</span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <Stranka sekce="rust" titulek="Růst" demo={demo}>
      <nav className="a2-zalozky" aria-label="Části Růstu">{TABY.map(([k, n]) => <Link key={k} href={odkaz({ tab: k === "trychtyr" ? null : k })} aria-current={tab === k ? "page" : undefined} data-testid={`a2-tab-${k}`}>{n}</Link>)}</nav>
      {tab !== "retence" && <div className="a2-cipy" role="group" aria-label="Období">{OBDOBI.map(([k, n]) => <Link key={k} className="a2-cip" aria-current={dni === Number(k) ? "true" : undefined} href={odkaz({ dni: k === "30" ? null : k })}>{n}</Link>)}</div>}
      {telo}
    </Stranka>
  );
}
