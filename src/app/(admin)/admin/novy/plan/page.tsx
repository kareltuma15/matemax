import Link from "next/link";
import Stranka from "@/components/admin2/Stranka";
import { UkolRadek, NovyUkol } from "@/components/admin2/Ukoly";
import { Info, Prazdne } from "@/components/admin2/Prvky";
import KopirovatClaude from "@/components/admin2/KopirovatClaude";
import { ExperimentForm, PridatUkol } from "@/components/admin2/PlanPrvky";
import { nactiDoporuceni, nactiKontext, nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { cileSezony, posunDen } from "@/lib/admin2/metriky";
import { NAZVY_SLEDOVANI, kalendar, klicZapisu, nactiExperimenty, shrnutiProClauda, tydenVKostce, vyhodnot } from "@/lib/admin2/plan";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { KRONIKA } from "@/lib/obsah-kronika";
import { pragueDateStr } from "@/lib/date";

/**
 * Plán (fáze B4, PL-03 až PL-08): týden v kostce s navrženými úkoly a shrnutím pro Clauda, úkoly (Tento týden, Později, Hotovo),
 * kronika změn s vyhodnocením (před a po) a kalendář. Roadmapa produktu přijde ve fázi C.
 */
export const metadata = { title: "Plán · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;
type Ukol = { id: number; nazev: string; popis: string | null; stav: string; termin: string | null; tento_tyden: boolean; hotovo_at: string | null };
const dat = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: d.slice(0, 4) === pragueDateStr().slice(0, 4) ? undefined : "numeric" });

export default async function Plan({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const k = await nactiKontext();
  const pohled = sp.pohled === "pozdeji" || sp.pohled === "hotovo" ? sp.pohled : "tyden";
  let ukoly: Ukol[] = [];
  if (!k.demo && !demo && supabaseAdmin) {
    const { data } = await supabaseAdmin.from("admin_ukoly").select("id, nazev, popis, stav, termin, tento_tyden, hotovo_at").order("priorita").order("termin", { nullsFirst: false }).order("created_at", { ascending: false }).limit(300);
    ukoly = (data ?? []) as Ukol[];
  }
  const vyber = ukoly.filter((u) => pohled === "hotovo" ? u.stav === "hotovo" : u.stav !== "hotovo" && (pohled === "tyden" ? u.tento_tyden : !u.tento_tyden));
  const z = await bezMigrace(() => nactiZaklad(demo));
  let dop: Awaited<ReturnType<typeof nactiDoporuceni>> | null = null;
  try { dop = await nactiDoporuceni(demo); } catch { dop = null; }
  const dnes = pragueDateStr();
  const tyden = z ? tydenVKostce(z.zaci, z.dny, dnes) : null;
  const [experimenty, udalosti] = await Promise.all([nactiExperimenty(k.demo || demo), kalendar({ ...k, demo: k.demo || demo }, dnes)]);
  const zapisy = KRONIKA.zapisy.filter((x) => x.datum).sort((a, b) => (a.datum! < b.datum! ? 1 : -1)).slice(0, 8);
  const navrhy = (dop?.aktivni ?? []).slice(0, 3);
  const cile = z ? cileSezony(z.zaci, z.nastaveni) : [];
  const md = tyden ? shrnutiProClauda(tyden, dop?.aktivni ?? [], cile, zapisy.filter((x) => experimenty[klicZapisu(x)] && z).map((x) => `- Změna ${dat(x.datum!)}: ${x.popis.slice(0, 80)}… → ${vyhodnot(x.datum!, experimenty[klicZapisu(x)], z!.zaci, z!.dny, dnes).zaver}`)) : "";

  return (
    <Stranka sekce="plan" titulek="Plán" demo={demo}>
      {tyden && (
        <section className="a2-sekce" data-testid="a2-tyden">
          <h2 className="a2-h2"><span>Týden v kostce · {dat(tyden.od)}–{dat(tyden.do)}</span><Info>Poslední celý týden (pondělí až neděle) proti předchozímu. Stejné definice jako dlaždice na Dnes a pondělní report. Procentní změna až od základu 20.</Info></h2>
          <div className="a2-dva">
            <div className="a2-karta">
              {tyden.zmeny.map((m) => <span key={m.id} className="a2-radek a2-mezi"><span>{m.nazev}</span><b>{m.text}</b></span>)}
              <span className="a2-s">Trénovalo aspoň 1 den: {tyden.trenovali} · dní tréninku celkem {tyden.dniTreninku}</span>
              <span className="a2-s">Nejvíc se změnilo: {tyden.zmeny[0] && tyden.zmeny[0].ted !== tyden.zmeny[0].pred ? `${tyden.zmeny[0].nazev.toLowerCase()} ${tyden.zmeny[0].pred} → ${tyden.zmeny[0].ted}` : "nic výrazného"}</span>
            </div>
            <div className="a2-karta">
              <b>Navržené úkoly na tento týden</b>
              {!navrhy.length && <span className="a2-s">Nic nečeká, fronta akcí je prázdná.</span>}
              {navrhy.map((d) => <span key={d.klic} className="a2-radek a2-mezi" style={{ flexWrap: "nowrap" }}><span style={{ minWidth: 0 }}>{d.titulek}</span><PridatUkol nazev={d.titulek.slice(0, 200)} popis={d.proc} zaci={d.lide} zdroj={d.klic.slice(0, 80)} demo={k.demo || demo} /></span>)}
              <KopirovatClaude text={md} popis="Kopírovat týden pro Clauda" />
              <span className="a2-s" style={{ fontSize: 12 }}>Shrnutí obsahuje jen pseudonymy (Žák 1, Žák 2), žádná jména, e-maily ani ID. Nic se nikam neposílá.</span>
            </div>
          </div>
        </section>
      )}

      <section className="a2-sekce">
        <h2 className="a2-h2"><span>Úkoly</span></h2>
        <div className="a2-cipy" role="group" aria-label="Pohled">
          {([["tyden", "Tento týden"], ["pozdeji", "Později"], ["hotovo", "Hotovo"]] as const).map(([kk, n]) => <Link key={kk} className="a2-cip" aria-current={pohled === kk ? "true" : undefined} href={`/admin/novy/plan${kk === "tyden" ? "" : `?pohled=${kk}`}`}>{n} <b>{ukoly.filter((u) => kk === "hotovo" ? u.stav === "hotovo" : u.stav !== "hotovo" && (kk === "tyden" ? u.tento_tyden : !u.tento_tyden)).length}</b></Link>)}
        </div>
        <div className="a2-karta">
          {(k.demo || demo) && <span className="a2-s">V demu se úkoly neukládají.</span>}
          {!k.demo && !demo && !vyber.length && <span className="a2-s">Žádné úkoly v tomto pohledu.</span>}
          {vyber.map((u) => <UkolRadek key={u.id} id={u.id} nazev={u.nazev} popis={u.popis} stav={u.stav} termin={u.termin} />)}
          {!k.demo && !demo && <NovyUkol otevrit={sp.novy === "1"} />}
        </div>
      </section>

      <div className="a2-dva">
        <section className="a2-sekce" data-testid="a2-kronika">
          <h2 className="a2-h2"><span>Kronika změn</span><Link href="/admin/obsah">celá kronika</Link></h2>
          {zapisy.map((x) => {
            const kl = klicZapisu(x);
            const e = experimenty[kl] ?? null;
            const v = e && z ? vyhodnot(x.datum!, e, z.zaci, z.dny, dnes) : null;
            const kVyhodnoceni = e && e.vyhodnotit <= dnes;
            return (
              <div key={kl} className={`a2-karta${kVyhodnoceni ? " a2-akce" : ""}`} data-oblast={kVyhodnoceni ? "obsah" : undefined}>
                <span className="a2-radek a2-mezi"><b style={{ fontSize: 14 }}>{x.popis.split(/[:(]/)[0].slice(0, 80)}</b><span className="a2-s">{dat(x.datum!)}</span></span>
                {e && <span className="a2-s">Proč: {e.proc || "neuvedeno"} · sleduje se: {NAZVY_SLEDOVANI[e.sledovat]} · vyhodnotit {dat(e.vyhodnotit)}</span>}
                {v && <span className="a2-zaver" style={{ fontSize: 13 }}>Před: {v.pred} · po: {v.po}. {v.zaver}{v.malyVzorek ? " Malý vzorek, jen orientačně." : ""}</span>}
                <ExperimentForm klic={kl} vychozi={e} datum={posunDen(x.datum!, 14)} demo={k.demo || demo} />
              </div>
            );
          })}
        </section>
        <section className="a2-sekce" data-testid="a2-kalendar">
          <h2 className="a2-h2"><span>Kalendář: co se blíží</span></h2>
          {!udalosti.length ? <Prazdne titulek="Nic naplánovaného." /> : (
            <div className="a2-karta">
              {udalosti.map((u, i) => <span key={i} className="a2-radek a2-mezi" style={{ flexWrap: "nowrap" }}><span style={{ minWidth: 0 }}>{u.nazev}</span><span className="a2-s" style={{ whiteSpace: "nowrap" }}>{dat(u.datum)}</span></span>)}
            </div>
          )}
          <h2 className="a2-h2"><span>Doporučení ({dop?.aktivni.length ?? 0})</span><Link href="/admin/novy">na Dnes</Link></h2>
          {!dop || !dop.aktivni.length ? <Prazdne titulek="Nic nečeká." /> : dop.aktivni.map((d) => (
            <div key={d.klic} className="a2-karta a2-akce" data-oblast={d.oblast}><span className="a2-t" style={{ fontSize: 14 }}>{d.titulek}</span><span className="a2-s">{d.proc}</span></div>
          ))}
        </section>
      </div>
    </Stranka>
  );
}
