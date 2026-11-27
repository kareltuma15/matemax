import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import HromadneOdeslani from "@/components/admin2/HromadneOdeslani";
import { Prazdne, zaku } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { segmenty } from "@/lib/admin2/segmenty";
import { zobraz } from "@/lib/admin2/sdileni";
import { odeslano24h, vylouceniZLogu } from "@/lib/admin2/zpravy";
import { KDY, NAZVY, obsahEmailu, type EmailZaka } from "@/lib/emaily/katalog";
import { sestavHtml } from "@/lib/emaily/sablona";
import { pragueDateStr } from "@/lib/date";

/**
 * Hromadné odeslání (ZP-12): segment → šablona → náhled konkrétních zpráv a kdo se přeskočí → test → potvrzení.
 * Testovací režim je výchozí. Ochrana proti dvojímu odeslání: kdo šablonu dostal za 7 dní, se přeskočí (i na serveru).
 */
export const metadata = { title: "Hromadné odeslání · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;
const SABLONY: EmailZaka[] = ["nezacal", "plan", "styska", "spi", "advent"];

export default async function Hromadne({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const drobky = [{ nazev: "Zprávy", href: "/admin/novy/zpravy?tab=sablony" }];
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="zpravy" titulek="Hromadné odeslání" drobky={drobky} demo={demo}><ChybaMigrace /></Stranka>;

  const dnes = pragueDateStr();
  const segs = segmenty(z.nastaveni, dnes);
  const seg = segs.find((s) => s.klic === sp.segment) ?? null;
  const trida = sp.trida === "5" ? 5 : sp.trida === "9" ? 9 : null;
  const sablona = SABLONY.includes(sp.sablona as EmailZaka) ? (sp.sablona as EmailZaka) : null;
  const odkaz = (zmeny: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v);
    for (const [k, v] of Object.entries(zmeny)) { if (v) q.set(k, v); else q.delete(k); }
    return `/admin/novy/zpravy/hromadne?${q}`;
  };

  const vybrani = seg ? z.zaci.filter((x) => seg.test(x) && (!trida || x.trida === trida)) : [];
  const { nedavno, problem } = sablona && !z.k.demo ? await vylouceniZLogu(vybrani.map((x) => x.id), sablona) : { nedavno: new Set<string>(), problem: new Set<string>() };
  // Stejná pravidla jako při odeslání na serveru (odesliHromadne)
  const duvod = (id: string, odhlasen: boolean, maEmail: boolean) => !maEmail ? "bez e-mailu" : odhlasen ? "odhlásil se z e-mailů" : problem.has(id) ? "vrácený e-mail nebo spam" : nedavno.has(id) ? "stejnou šablonu dostal za posledních 7 dní" : null;
  const prijemci = vybrani.filter((x) => !duvod(x.id, x.odhlasen_emaily, !!x.email));
  const preskoceni = vybrani.filter((x) => duvod(x.id, x.odhlasen_emaily, !!x.email));
  const i = Math.max(0, Math.min(prijemci.length - 1, Number(sp.i) || 0));
  const nahledZak = prijemci[i];
  const zbyva = Math.max(0, 100 - (await odeslano24h(z.k)) - 5);
  const nahled = sablona && nahledZak ? sestavHtml(obsahEmailu(sablona, { trida: nahledZak.trida, dnes })) : null;
  const jm = (id: string) => { const x = z.zaci.find((y) => y.id === id); return x ? zobraz(x, z.k.sdileni, z.ps).jmeno : "?"; };

  return (
    <Stranka sekce="zpravy" titulek="Hromadné odeslání" drobky={drobky} demo={demo}>
      <div className="a2-kroky" data-testid="a2-hromadne">
        <div className="a2-krok"><i className={seg ? "ok" : "akt"}>{seg ? "✓" : "1"}</i><div className="a2-sekce">
          <b>Komu{seg ? `: ${seg.nazev}${trida ? ` · ${trida}. třída` : ""} · ${zaku(vybrani.length)}` : ""}</b>
          <div className="a2-cipy" role="group" aria-label="Segment">
            {segs.map((s) => <Link key={s.klic} className="a2-cip" aria-current={seg?.klic === s.klic ? "true" : undefined} href={odkaz({ segment: s.klic, i: null })}>{s.nazev} <b>{z.zaci.filter((x) => s.test(x) && (!trida || x.trida === trida)).length}</b></Link>)}
          </div>
          <div className="a2-cipy" role="group" aria-label="Třída">
            {([[null, "Obě třídy"], ["5", "5. třída"], ["9", "9. třída"]] as const).map(([k, n]) => <Link key={n} className="a2-cip" aria-current={(trida ? String(trida) : null) === k ? "true" : undefined} href={odkaz({ trida: k, i: null })}>{n}</Link>)}
          </div>
        </div></div>

        <div className="a2-krok"><i className={sablona ? "ok" : seg ? "akt" : ""}>{sablona ? "✓" : "2"}</i><div className="a2-sekce">
          <b>Šablona{sablona ? `: ${NAZVY[sablona]}` : ""}</b>
          {seg && <div className="a2-cipy" role="group" aria-label="Šablona">{SABLONY.map((s) => <Link key={s} className="a2-cip" aria-current={sablona === s ? "true" : undefined} href={odkaz({ sablona: s, i: null })} title={KDY[s]}>{NAZVY[s]}</Link>)}</div>}
          {sablona && <span className="a2-s">Automaticky chodí: {KDY[sablona].toLowerCase()}. Žákům se tyká, jedno tlačítko.</span>}
        </div></div>

        <div className="a2-krok"><i className={seg && sablona ? "akt" : ""}>3</i><div className="a2-sekce">
          <b>Náhled konkrétních zpráv</b>
          {seg && sablona && (prijemci.length === 0 ? <Prazdne titulek="Není komu poslat.">Všichni vybraní se přeskočí, důvody jsou níž.</Prazdne> : (
            <>
              <div className="a2-radek a2-mezi"><span className="a2-s">{i + 1} z {prijemci.length} · {jm(nahledZak.id)} · {nahledZak.trida}. třída</span>
                <span className="a2-radek">{i > 0 && <Link className="a2-btn a2-sek a2-male" href={odkaz({ i: String(i - 1) })}>← Předchozí</Link>}{i < prijemci.length - 1 && <Link className="a2-btn a2-sek a2-male" href={odkaz({ i: String(i + 1) })}>Další →</Link>}</span>
              </div>
              {nahled && <iframe title="Náhled e-mailu" srcDoc={nahled} sandbox="" style={{ width: "100%", height: 460, border: "1px solid var(--a-linka)", borderRadius: 12, background: "#fff" }} />}
            </>
          ))}
          {seg && sablona && preskoceni.length > 0 && (
            <div className="a2-karta"><span className="a2-t">Přeskočí se ({preskoceni.length})</span>
              {preskoceni.slice(0, 20).map((x) => <span key={x.id} className="a2-s">{jm(x.id)}: {duvod(x.id, x.odhlasen_emaily, !!x.email)}</span>)}
            </div>
          )}
        </div></div>
      </div>
      {seg && sablona && prijemci.length > 0 && <HromadneOdeslani ids={prijemci.map((x) => x.id)} sablona={sablona} trida={trida ?? prijemci[0].trida} naostro={z.nastaveni.emailyNaostro} zbyva={zbyva} />}
      <p className="a2-s">Marketingové zprávy (novinky, akce) jen těm, kdo souhlasili s novinkami: {z.zaci.filter((x) => x.souhlas_novinky).length} žáků. Jestli jsou připomínky tréninku marketing, je potřeba ověřit právně.</p>
    </Stranka>
  );
}
