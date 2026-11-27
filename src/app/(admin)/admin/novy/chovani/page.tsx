import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import { Info, Prazdne } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { isoPred } from "@/lib/admin2/metriky";
import { podil } from "@/lib/admin2/mala-cisla";
import { zobraz } from "@/lib/admin2/sdileni";
import { kliky, formular, nactiUdalosti, navstevy, scroll, stranky } from "@/lib/admin2/navstevy";
import { sloucenyZdroj } from "@/lib/admin2/rust";

/**
 * Chování (fáze B4, CH-01, CH-02, CH-04, CH-05): obrazovky podle lidí, scroll a poslední sekce úvodu, kliky na pojmenované prvky,
 * návštěvy seskupené po lidech a formuláře (kde lidé odcházejí). Všude jeden základ: lidé, ne zobrazení. Nic se nenahrává.
 */
export const metadata = { title: "Chování · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;
const TABY = [["obrazovky", "Obrazovky"], ["kliky", "Kliky"], ["navstevy", "Návštěvy po lidech"], ["formulare", "Formuláře"]] as const;
const OBDOBI = [["1", "Dnes"], ["7", "7 dní"], ["30", "30 dní"]] as const;

function Sloupce({ radky }: { radky: { nazev: string; lide: number }[] }) {
  const max = Math.max(1, ...radky.map((r) => r.lide));
  return <>{radky.map((r) => <span key={r.nazev} className="a2-sloupec"><span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{r.nazev}</span><span className="a2-pruh"><span style={{ width: `${(r.lide / max) * 100}%` }} /></span><b style={{ textAlign: "right" }}>{r.lide}</b></span>)}</>;
}

export default async function Chovani({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const tab = TABY.some(([k]) => k === sp.tab) ? (sp.tab as string) : "obrazovky";
  const dni = OBDOBI.some(([k]) => k === sp.dni) ? Number(sp.dni) : 7;
  const filtr = sp.f === "prihlaseni" || sp.f === "novi" || sp.f === "chyba" ? sp.f : null;
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="chovani" titulek="Chování" demo={demo}><ChybaMigrace /></Stranka>;
  const ud = await nactiUdalosti(z.k, isoPred(dni), new Set(z.zaci.map((x) => x.id)));
  const odkaz = (zmeny: Record<string, string | null>) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v); for (const [k, v] of Object.entries(zmeny)) { if (v) q.set(k, v); else q.delete(k); } return `/admin/novy/chovani${q.toString() ? `?${q}` : ""}`; };
  const prazdno = <Prazdne titulek="Zatím žádná data.">Měření stránek běží od 15. 11. 2026, nové názvy událostí od 26. 11. Přihlášení žáci a anonymní návštěvníci se počítají zvlášť.</Prazdne>;

  let telo: React.ReactNode;
  if (!ud.length) telo = prazdno;
  else if (tab === "obrazovky") {
    const st = stranky(ud), sc = scroll(ud, "/");
    telo = (
      <div className="a2-dva" data-testid="a2-obrazovky">
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Nejnavštěvovanější podle lidí</span><Info>Lidé = různí návštěvníci (denní otisk) nebo přihlášení žáci. Vstupní = první stránka dne, odchodová = poslední. Průměrný čas z odchodu ze stránky (měří se na veřejných stránkách).</Info></h2>
          <div className="a2-karta">
            {st.slice(0, 15).map((x) => (
              <div key={x.cesta} className="a2-zprava"><span className="a2-t">{x.nazev}</span><b>{x.lide}</b><span className="a2-s" style={{ gridColumn: "1 / -1" }}>{x.zobrazeni} zobrazení · vstupní {x.vstupni} · odchodová {x.odchody}{x.prumerSekund !== null ? ` · průměrně ${x.prumerSekund} s` : ""}</span></div>
            ))}
          </div>
        </section>
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Kam lidé na úvodní stránce dojdou?</span></h2>
          {!sc.lide ? <Prazdne titulek="Zatím nic." /> : (
            <div className="a2-karta">
              <Sloupce radky={sc.prahy.map((p) => ({ nazev: `aspoň ${p.prah} %`, lide: p.lide }))} />
              <span className="a2-s">{sc.lide} lidí odešlo z úvodu. {sc.prahy[1].lide < sc.lide / 2 ? "Méně než polovina dojde do poloviny stránky." : "Většina dojde aspoň do poloviny."}</span>
            </div>
          )}
          {sc.sekce.length > 0 && <div className="a2-karta"><b>Poslední viděná sekce</b><Sloupce radky={sc.sekce.map((x) => ({ nazev: x.sekce, lide: x.lide }))} /></div>}
        </section>
      </div>
    );
  } else if (tab === "kliky") {
    const k = kliky(ud);
    telo = (
      <div className="a2-dva" data-testid="a2-kliky">
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Nejklikanější prvky</span><Info>Jen pojmenované prvky z plánu měření (žádné texty tlačítek ani odpovědi). Lidé = kolik různých lidí kliklo.</Info></h2>
          {!k.prvky.length ? <Prazdne titulek="Zatím žádné kliky." /> : <div className="a2-karta">{k.bezNazvu > 0 && <span className="a2-s" style={{ fontSize: 12 }}>Starší kliky bez názvu (před úklidem měření 26. 11.): {k.bezNazvu}, nepočítají se.</span>}{k.prvky.slice(0, 20).map((x) => <div key={x.cil} className="a2-zprava"><span className="a2-t">{x.nazev}</span><b>{x.lide} {x.lide === 1 ? "člověk" : x.lide <= 4 ? "lidé" : "lidí"}</b><span className="a2-s" style={{ gridColumn: "1 / -1" }}>{x.stranka} · {x.kliku} kliků</span></div>)}</div>}
        </section>
        <section className="a2-sekce">
          <h2 className="a2-h2"><span>Opakované rychlé kliky</span><Info>3 kliky do 1 s na stejné místo. Často znamená, že něco nereaguje.</Info></h2>
          {!k.rage.length ? <Prazdne titulek="Žádné." /> : <div className="a2-karta"><Sloupce radky={k.rage} /></div>}
          <h2 className="a2-h2"><span>Na tyhle nikdo neklikl ({k.nikdo.length})</span></h2>
          <div className="a2-karta"><span className="a2-s">{k.nikdo.slice(0, 30).join(" · ") || "Na všechny pojmenované prvky někdo klikl."}</span></div>
        </section>
      </div>
    );
  } else if (tab === "navstevy") {
    const vse = navstevy(ud);
    const vyber = vse.filter((n) => !filtr || (filtr === "prihlaseni" ? !!n.userId : filtr === "novi" ? !n.userId : n.chyba));
    telo = (
      <section className="a2-sekce" data-testid="a2-navstevy">
        <div className="a2-cipy" role="group" aria-label="Filtr návštěv">
          {([[null, "Všechny"], ["prihlaseni", "Jen přihlášení"], ["novi", "Jen návštěvníci"], ["chyba", "S chybou"]] as const).map(([k, n]) => <Link key={n} className="a2-cip" aria-current={filtr === k ? "true" : undefined} href={odkaz({ f: k })}>{n} <b>{vse.filter((x) => !k || (k === "prihlaseni" ? !!x.userId : k === "novi" ? !x.userId : x.chyba)).length}</b></Link>)}
        </div>
        {!vyber.length ? <Prazdne titulek="Žádná návštěva neodpovídá filtru." /> : vyber.slice(0, 60).map((n, i) => {
          const zak = n.userId ? z.zaci.find((x) => x.id === n.userId) : undefined;
          const delka = Math.max(1, Math.round((Date.parse(n.konec) - Date.parse(n.zacatek)) / 60000));
          return (
            <div key={i} className="a2-karta" style={{ gap: 3 }}>
              <span className="a2-radek a2-mezi"><b style={{ fontSize: 14 }}>{zak ? <Link href={`/admin/novy/zaci/${zak.id}?tab=osa`} style={{ color: "var(--a-modra)" }}>{zobraz(zak, z.k.sdileni, z.ps).jmeno} ({zak.trida}.)</Link> : `Návštěvník (${n.zarizeni}, ${sloucenyZdroj(n.zdroj, z.nastaveni.kampane)})`}</b><span className="a2-s">{new Date(n.zacatek).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })} · {delka} min</span></span>
              <span className="a2-s">{n.kroky.join(" → ") || "jen otevřel stránku"}</span>
            </div>
          );
        })}
      </section>
    );
  } else {
    const r = formular(ud, "/registrace"), p = formular(ud, "/prihlaseni");
    telo = (
      <div className="a2-dva" data-testid="a2-formulare">
        {[["Registrace", r], ["Přihlášení", p]].map(([nazev, f]) => {
          const x = f as typeof r;
          return (
            <section key={nazev as string} className="a2-sekce">
              <h2 className="a2-h2"><span>{nazev as string}</span><Info>Otevřeli = různí lidé na stránce. Začali = klepli do formuláře. „Odešel u pole“ = poslední pole, do kterého klepli, než stránku zavřeli. Obsah polí se nikdy neukládá.</Info></h2>
              <div className="a2-karta">
                <span className="a2-s">Otevřelo <b>{x.otevreli}</b> · začalo vyplňovat <b>{x.zacali}</b>{nazev === "Registrace" ? <> · odeslalo <b>{x.odeslali}</b> ({podil(x.odeslali, x.otevreli)})</> : null}</span>
                <span className="a2-s">Odešli do 5 s bez vyplnění: {x.doPetiSekund}{x.medianSekund !== null ? ` · medián vyplnění ${x.medianSekund} s` : ""}</span>
              </div>
              {x.odesliU.length > 0 && <div className="a2-karta"><b>U kterého pole odcházejí</b><Sloupce radky={x.odesliU} /></div>}
              {x.chyby.length > 0 && <div className="a2-karta"><b>Chyby formuláře</b><Sloupce radky={x.chyby} /></div>}
              {x.pole.length > 0 && <div className="a2-karta"><b>Kam klepli nejdřív</b><Sloupce radky={x.pole} /></div>}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <Stranka sekce="chovani" titulek="Chování" demo={demo}>
      <nav className="a2-zalozky" aria-label="Části Chování">{TABY.map(([k, n]) => <Link key={k} href={odkaz({ tab: k === "obrazovky" ? null : k, f: null })} aria-current={tab === k ? "page" : undefined} data-testid={`a2-tab-${k}`}>{n}</Link>)}</nav>
      <div className="a2-cipy" role="group" aria-label="Období">{OBDOBI.map(([k, n]) => <Link key={k} className="a2-cip" aria-current={dni === Number(k) ? "true" : undefined} href={odkaz({ dni: k === "7" ? null : k })}>{n}</Link>)}</div>
      {telo}
    </Stranka>
  );
}
