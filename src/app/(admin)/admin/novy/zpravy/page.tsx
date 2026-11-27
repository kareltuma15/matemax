import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import Schranka, { type PolozkaKarty } from "@/components/admin2/Schranka";
import { Info, Prazdne } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { zobraz } from "@/lib/admin2/sdileni";
import { kdy, doba } from "@/lib/admin2/cas";
import { malyVzorek, podil } from "@/lib/admin2/mala-cisla";
import { ChybiMigraceB, DRUHY_SCHRANKY, dopadSablon, dorucitelnost, kroky, nactiSchranku, nactiZpravy, nazevSablony, nazevStavu, type Polozka, type StavRadek, type Zprava } from "@/lib/admin2/zpravy";
import { isoPred } from "@/lib/admin2/metriky";

/**
 * Zprávy (fáze B2, ZP-01 až ZP-08, ZP-13): Schránka, odeslané zprávy se stavy a šablony s dopadem.
 * Stará sekce E-maily (náhledy šablon, denní běh nanečisto) zůstává dostupná odkazem.
 */
export const metadata = { title: "Zprávy · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;

const TABY = [["schranka", "Schránka"], ["odeslane", "Odeslané"], ["sablony", "Šablony a dopad"]] as const;
const FILTRY_ODESLANE = [["vse", "Vše"], ["zak", "Žákům"], ["rodic", "Rodičům"], ["push", "Push"], ["problemy", "Problémy"]] as const;

export default async function Zpravy({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const tab = TABY.some(([k]) => k === sp.tab) ? (sp.tab as string) : "schranka";
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="zpravy" titulek="Zprávy" demo={demo}><ChybaMigrace /></Stranka>;

  const zakMapa = new Map(z.zaci.map((x) => [x.id, x]));
  const jmeno = (uid: string | null) => { const x = uid ? zakMapa.get(uid) : undefined; return x ? zobraz(x, z.k.sdileni, z.ps).jmeno : null; };
  const komu = (m: Zprava) => {
    const j = jmeno(m.user_id);
    if (m.prijemce_typ === "rodic") return j ? `Rodič: ${j}` : z.k.sdileni ? "Rodič" : m.prijemce ?? "Rodič";
    if (m.prijemce_typ === "admin") return "Ty (test)";
    if (j) return j;
    return z.k.sdileni ? "Příjemce skrytý" : m.prijemce ?? (m.kanal === "push" ? "Anonymní odběr" : "Neznámý");
  };
  const odkaz = (zmeny: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v);
    for (const [k, v] of Object.entries(zmeny)) { if (v) q.set(k, v); else q.delete(k); }
    return `/admin/novy/zpravy${q.toString() ? `?${q}` : ""}`;
  };

  // Načtení dat (jen data v try/catch, JSX až potom)
  let data: { schranka: Polozka[]; zpravy: Zprava[]; stavy: Map<string, StavRadek[]> } | null = null;
  try {
    const [schranka, zz] = await Promise.all([
      nactiSchranku(z.k, { stav: "vse" }),
      tab === "schranka" ? Promise.resolve({ zpravy: [] as Zprava[], stavy: new Map<string, StavRadek[]>() }) : nactiZpravy(z.k, { od: isoPred(30) }),
    ]);
    data = { schranka, ...zz };
  } catch (e) {
    if (!(e instanceof ChybiMigraceB)) throw e;
  }
  const chybi = !data;
  const { schranka, zpravy, stavy } = data ?? { schranka: [] as Polozka[], zpravy: [] as Zprava[], stavy: new Map<string, StavRadek[]>() };
  const pocetNovych = schranka.filter((p) => p.stav === "nove").length;
  let telo: React.ReactNode = null;
  {

    if (tab === "schranka") {
      const stav = sp.stav === "vyrizeno" ? "vyrizeno" : "nove";
      const druh = typeof sp.druh === "string" && sp.druh in DRUHY_SCHRANKY ? sp.druh : null;
      const vybrane = schranka.filter((p) => p.stav === stav && (!druh || p.druh === druh));
      const karty: PolozkaKarty[] = vybrane.map((p) => {
        const zak = p.user_id ? zakMapa.get(p.user_id) : undefined;
        const d = (p.detail ?? {}) as Record<string, unknown>;
        const kontext = p.druh === "odpoved" ? `Na: ${p.predmet?.replace(/^Re:\s*/i, "") ?? "e-mail"}${!zak && !z.k.sdileni && p.od ? ` · od ${p.od}` : ""}`
          : p.druh === "zpetna_vazba" ? `${d.hodnoceni ? `${d.hodnoceni} z 5` : ""}${Array.isArray(d.libi) && d.libi.length ? ` · líbí se: ${(d.libi as string[]).join(", ")}` : ""}`
          : p.druh === "chyba_ulohy" ? `Úloha ${p.uloha_id ?? "?"}${d.odpoved ? ` · odpověď žáka „${String(d.odpoved)}“` : ""}${d.duvod ? ` · ${DUVODY_CHYBY[String(d.duvod)] ?? String(d.duvod).replace(/_/g, " ")}` : ""}` : null;
        return {
          id: p.id, druh: p.druh, druhNazev: DRUHY_SCHRANKY[p.druh], kdo: zak ? zobraz(zak, z.k.sdileni, z.ps).jmeno : z.k.sdileni ? "Neznámý odesílatel" : p.od ?? "Anonym",
          zakId: zak?.id ?? null, trida: zak?.trida ?? null, kdy: kdy(p.created_at), text: p.text, kontext: kontext || null, ulohaId: p.uloha_id,
          nove: p.stav === "nove", mohuOdpovedet: p.druh === "odpoved" ? !!p.od || !!zak : !!zak,
        };
      });
      const pocty = (dr: string | null) => schranka.filter((p) => p.stav === stav && (!dr || p.druh === dr)).length;
      telo = (
        <>
          <div className="a2-cipy" role="group" aria-label="Stav">
            <Link className="a2-cip" aria-current={stav === "nove" ? "true" : undefined} href={odkaz({ stav: null, druh: null })}>Nové <b>{pocetNovych}</b></Link>
            <Link className="a2-cip" aria-current={stav === "vyrizeno" ? "true" : undefined} href={odkaz({ stav: "vyrizeno", druh: null })}>Vyřízené</Link>
            {(["odpoved", "zpetna_vazba", "chyba_ulohy"] as const).map((d) => <Link key={d} className="a2-cip" aria-current={druh === d ? "true" : undefined} href={odkaz({ druh: druh === d ? null : d })}>{DRUHY_SCHRANKY[d]} <b>{pocty(d)}</b></Link>)}
          </div>
          {karty.length === 0
            ? <Prazdne titulek={stav === "nove" ? "Nic nového." : "Zatím nic vyřízeného."}>Odpovědi na e-maily se sbírají od 27. 11. Přijímání odpovědí začne po nastavení poddomény v Resendu, do té doby chodí odpovědi jen do tvé schránky. Zpětná vazba z appky a nahlášené chyby chodí sem.</Prazdne>
            : <Schranka polozky={karty} naostro={z.nastaveni.emailyNaostro} />}
        </>
      );
    } else if (tab === "odeslane") {
      const filtr = FILTRY_ODESLANE.some(([k]) => k === sp.filtr) ? (sp.filtr as string) : "vse";
      const bezTestu = sp.testy !== "1";
      const vyber = zpravy.filter((m) => (!bezTestu || !m.testovaci) && (filtr === "vse" || (filtr === "push" ? m.kanal === "push" : filtr === "problemy" ? kroky(m, stavy.get(m.id) ?? []).problem : m.prijemce_typ === filtr && m.kanal === "email")));
      const dor = dorucitelnost(zpravy);
      telo = (
        <>
          <div className="a2-cipy" role="group" aria-label="Filtr zpráv">
            {FILTRY_ODESLANE.map(([k, n]) => <Link key={k} className="a2-cip" aria-current={filtr === k ? "true" : undefined} href={odkaz({ filtr: k === "vse" ? null : k })}>{n}{k === "problemy" ? <b>{zpravy.filter((m) => kroky(m, stavy.get(m.id) ?? []).problem).length}</b> : null}</Link>)}
            <Link className="a2-cip" aria-pressed={!bezTestu} href={odkaz({ testy: bezTestu ? "1" : null })}>{bezTestu ? "Ukázat testovací" : "Skrýt testovací"}</Link>
          </div>
          <div className="a2-dva">
            <section className="a2-sekce">
              <h2 className="a2-h2">Za 30 dní · {vyber.length}</h2>
              {vyber.length === 0 ? <Prazdne titulek="Žádné zprávy.">Log zpráv běží od 27. 11. Starší e-maily jsou jen v sekci E-maily (starý vzhled).</Prazdne> : (
                <div className="a2-karta" data-testid="a2-odeslane">
                  {vyber.slice(0, 200).map((m) => {
                    const kr = kroky(m, stavy.get(m.id) ?? []);
                    const posledni = (stavy.get(m.id) ?? []).at(-1);
                    return (
                      <div key={m.id} className="a2-zprava" data-testid="a2-zprava">
                        <span className="a2-t">{m.user_id && zakMapa.has(m.user_id) ? <Link href={`/admin/novy/zaci/${m.user_id}?tab=zpravy`}>{komu(m)}</Link> : komu(m)} · {m.predmet ?? nazevSablony(m.sablona)}</span>
                        <span className="a2-tecky" aria-label={`Stav: ${nazevStavu(m.stav)}`} title={nazevStavu(m.stav)}>
                          <b className={kr.odeslano ? "ok" : "sp"} /><b className={kr.problem ? "sp" : kr.doruceno ? "ok" : ""} /><b className={kr.kliknuto ? "ok" : ""} /><b className={kr.odpoved ? "ok" : ""} />
                        </span>
                        <span className="a2-s" style={{ gridColumn: "1 / -1" }}>
                          {m.kanal === "push" ? "push" : "e-mail"} · {nazevSablony(m.sablona)} · {kdy(m.odeslano_at)}
                          {kr.problem ? <> · <b style={{ color: "var(--a-spatne)" }}>{nazevStavu(m.stav)}{posledni?.detail && STAV_DETAIL.has(m.stav) ? `: ${posledni.detail}` : ""}</b></> : kr.odpoved ? ` · odpověděl za ${doba(m.odeslano_at, (stavy.get(m.id) ?? []).find((s) => s.stav === "odpovezeno")?.cas ?? m.stav_at)}` : ` · ${nazevStavu(m.stav).toLowerCase()}`}
                          {m.testovaci ? " · test" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="a2-s">Tečky: odesláno · doručeno (u push zobrazeno) · kliknuto · odpověděl. Otevření jsou jen orientační, proto je neukazuju jako tečku.</p>
            </section>
            <section className="a2-sekce">
              <h2 className="a2-h2">Doručitelnost · 30 dní</h2>
              <div className="a2-karta" data-testid="a2-dorucitelnost">
                <div className="a2-radek a2-mezi"><span className="a2-t">{dor.vraceno + dor.spam === 0 ? "V pořádku" : "Pozor na adresy"}</span><span className={`a2-stitek ${dor.vraceno + dor.spam === 0 ? "ok" : "pozor"}`}>{podil(dor.vraceno + dor.spam, dor.celkem)}</span></div>
                <span className="a2-s">Vráceno {dor.vraceno} · spam {dor.spam} · potlačeno {dor.potlaceno} · neodešlo {dor.selhalo} (z {dor.celkem} e-mailů)</span>
                <span className="a2-s">Vrácená adresa a spam: appka tomu žákovi další připomínky neposílá.</span>
              </div>
              <Link className="a2-btn a2-sek" href="/admin/emaily">Náhledy šablon a denní běh (starý vzhled)</Link>
            </section>
          </div>
        </>
      );
    } else {
      const dopad = dopadSablon(zpravy, stavy, z.dny);
      telo = (
        <>
          <p className="a2-s">Za posledních 30 dní, bez testovacích zpráv. Dopad = kolik různých žáků po zprávě trénovalo (den zprávy nebo dva další dny).</p>
          {dopad.length === 0 ? <Prazdne titulek="Zatím žádná data.">Log zpráv běží od 27. 11., první čísla budou po prvních připomínkách (denně 16:00).</Prazdne> : (
            <div className="a2-dlazdice" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }} data-testid="a2-sablony">
              {dopad.map((d) => (
                <div key={d.sablona} className="a2-karta" data-testid="a2-sablona">
                  <div className="a2-radek a2-mezi"><span className="a2-t">{d.nazev}</span>{malyVzorek(d.zaci) && <span className="a2-maly">malý vzorek</span>}</div>
                  <span className="a2-s">odesláno {d.odeslano} · {d.kanal === "push" ? "zobrazeno" : "doručeno"} {d.doruceno} · kliknuto {d.kliknuto}{d.odpovedi ? ` · odpovědi ${d.odpovedi}` : ""}{d.problemy ? ` · problémy ${d.problemy}` : ""}</span>
                  <span className="a2-s"><b style={{ color: "var(--a-text)" }}>Trénovali do 48 h: {podil(d.trenovali, d.zaci)}</b> <Info>Počítá se po dnech: žák s tréninkem v den zprávy nebo v dalších dvou dnech. Trénoval = dokončil trénink, test nebo diagnostiku. U reportu rodičům se počítá dítě.</Info></span>
                  <span className="a2-radek">
                    {d.lide.length > 0 && <Link className="a2-btn a2-sek a2-male" href={`/admin/novy/zaci?ids=${d.lide.join(",")}`}>Komu ({d.zaci})</Link>}
                    {d.lideTrenovali.length > 0 && <Link className="a2-btn a2-sek a2-male" href={`/admin/novy/zaci?ids=${d.lideTrenovali.join(",")}`}>Trénovali ({d.trenovali})</Link>}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link className="a2-btn a2-akc" href="/admin/novy/zpravy/hromadne" style={{ alignSelf: "flex-start" }}>Hromadné odeslání</Link>
        </>
      );
    }
  }

  return (
    <Stranka sekce="zpravy" titulek="Zprávy" demo={demo}>
      <nav className="a2-zalozky" aria-label="Části Zpráv">
        {TABY.map(([k, n]) => <Link key={k} href={odkaz({ tab: k === "schranka" ? null : k, stav: null, druh: null, filtr: null })} aria-current={tab === k ? "page" : undefined} data-testid={`a2-tab-${k}`}>{n}{k === "schranka" && pocetNovych ? ` (${pocetNovych})` : ""}</Link>)}
      </nav>
      {chybi ? <Prazdne titulek="Chybí migrace pro Zprávy.">V Supabase → SQL Editor spusť supabase/migrations/20261128_admin_b1.sql. Do té doby můžeš zapnout demo data.</Prazdne> : telo}
    </Stranka>
  );
}

const STAV_DETAIL = new Set(["vraceno", "selhalo", "potlaceno"]);
const DUVODY_CHYBY: Record<string, string> = { spatny_vysledek: "špatný výsledek", nejasne_zadani: "nejasné zadání", chyba_obrazku: "chyba v obrázku", jine: "jiné" };
