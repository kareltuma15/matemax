import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import ZkontrolovanoTlacitko from "@/components/admin2/ZkontrolovanoTlacitko";
import { Info, Prazdne } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { zobraz } from "@/lib/admin2/sdileni";
import { malyVzorek } from "@/lib/admin2/mala-cisla";
import { ChybiMigraceUceni, NAZVY_PRIZNAKU, POPISY_PRIZNAKU, nactiOdpovedi, prvniPokusy, statUloh, type Odpoved } from "@/lib/admin2/uceni";
import { kontrolyUloh } from "@/lib/admin2/kontroly";
import { allExamples } from "@/data/examples";
import { temaLabel } from "@/types";

/**
 * Detail úlohy (UC-04): zadání a správná odpověď, rozložení odpovědí a času, kdo ji pokazil, příznaky
 * a tlačítko „Zkontrolováno“ (příznak zmizí, dokud nepřibude 10 nových pokusů).
 */
export const metadata = { title: "Úloha · MateMax Admin" };
type P = Promise<{ id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;
const sek = (ms: number) => (ms < 60000 ? `${Math.round(ms / 1000)} s` : `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`);
const bezLatex = (s: string) => s.replace(/\$+/g, "").replace(/\\(text|mathrm)\{([^}]*)\}/g, "$2").replace(/\\(cdot|times)/g, "·").replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2").replace(/\\[a-z]+/gi, "").replace(/[{}]/g, "");

export default async function DetailUlohy({ params, searchParams }: { params: P; searchParams: SP }) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw).slice(0, 60);
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const drobky = [{ nazev: "Učení", href: "/admin/novy/uceni?tab=ulohy" }];
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="uceni" titulek={id} drobky={drobky} demo={demo}><ChybaMigrace /></Stranka>;

  let rr: Odpoved[] | null = null;
  try { rr = await nactiOdpovedi(z.k, { ulohaId: id }); } catch (e) { if (!(e instanceof ChybiMigraceUceni)) throw e; }
  const pocitane = new Set(z.zaci.map((x) => x.id));
  const odp = (rr ?? []).filter((r) => pocitane.has(r.user_id));
  const prvni = prvniPokusy(odp);
  const s = statUloh(odp)[0] ?? null;
  const ex = allExamples.find((e) => e.id === id);
  const kontrola = (await kontrolyUloh(z.k.demo)).get(id) ?? null;
  const zakMapa = new Map(z.zaci.map((x) => [x.id, x]));
  const jm = (uid: string) => { const x = zakMapa.get(uid); return x ? zobraz(x, z.k.sdileni, z.ps).jmeno : "?"; };

  const odpovedi = new Map<string, number>();
  for (const r of prvni) { const k = r.preskoceno ? "přeskočeno" : (r.spravne_napoprve ?? r.spravne) ? "správně" : r.odpoved ?? "bez odpovědi"; odpovedi.set(k, (odpovedi.get(k) ?? 0) + 1); }
  const rozlozeni = [...odpovedi].sort((a, b) => b[1] - a[1]);
  const casy = prvni.filter((r) => r.cas_ms !== null && !r.preskoceno).map((r) => r.cas_ms!);
  const kose = [["do 15 s", 0, 15000], ["15–60 s", 15000, 60000], ["1–3 min", 60000, 180000], ["3+ min", 180000, Infinity]] as const;
  const max = Math.max(1, ...rozlozeni.map(([, n]) => n));
  const pokazili = prvni.filter((r) => !r.preskoceno && !(r.spravne_napoprve ?? r.spravne));
  const noveOdKontroly = kontrola ? prvni.filter((r) => r.created_at > kontrola.cas).length : null;

  return (
    <Stranka sekce="uceni" titulek={id} drobky={drobky} demo={demo}>
      <section className="a2-karta" data-testid="a2-detail-ulohy">
        <span className="a2-radek a2-mezi"><b style={{ fontSize: 17 }}>{id}</b><span className="a2-s">{ex ? `${temaLabel(ex.tema)} · úroveň ${ex.obtiznost}${ex.trida === 5 ? " · 5. třída" : ""}` : "úloha v katalogu nenalezena"}</span></span>
        {ex && <div className="a2-bublina">{bezLatex(ex.zadani).slice(0, 600)}</div>}
        {ex && <span className="a2-s">Správná odpověď: <b style={{ color: "var(--a-text)" }}>{bezLatex(ex.odpoved)}</b></span>}
        <div className="a2-radek">
          <a className="a2-btn a2-sek a2-male" href={`/nahled?ids=${encodeURIComponent(id)}`} target="_blank" rel="noopener">Náhled jako žák</a>
          <Link className="a2-btn a2-sek a2-male" href="/admin/obsah">Upravit v Obsahu</Link>
          <ZkontrolovanoTlacitko id={id} zkontrolovano={kontrola?.cas ?? null} demo={z.k.demo} />
        </div>
        {kontrola && <span className="a2-s">Zkontrolováno {new Date(kontrola.cas).toLocaleDateString("cs-CZ")}{noveOdKontroly !== null ? ` · od té doby ${noveOdKontroly} nových pokusů` : ""}.</span>}
      </section>

      {!rr ? <Prazdne titulek="Chybí migrace logu odpovědí." /> : !s ? <Prazdne titulek="Zatím nikdo neřešil.">Log odpovědí běží od 26. 11. 2026.</Prazdne> : (
        <div className="a2-dva">
          <section className="a2-sekce">
            <h2 className="a2-h2"><span>Výsledky na první pokus · {s.pokusy}</span><Info>První pokus každého žáka mimo opakování. Přeskočení se počítá jako neúspěch.</Info></h2>
            <div className="a2-karta">
              {s.priznaky.length > 0 && <span className="a2-radek" style={{ gap: 4 }}>{s.priznaky.map((p) => <span key={p} className={`a2-stitek ${p === "podezrela" || p === "tezka" ? "spatne" : "pozor"}`}>{NAZVY_PRIZNAKU[p]}</span>)}</span>}
              {s.priznaky.map((p) => <span key={p} className="a2-s">{POPISY_PRIZNAKU[p]}</span>)}
              <span className="a2-s">Správně {s.spravne} z {s.pokusy}{s.uspesnost !== null ? ` (${s.uspesnost} %)` : ""} · {s.zaci} žáků · nápověda {s.napoveda}× · průměrné pořadí v sadě {s.poradi ?? "–"}</span>
              {malyVzorek(s.pokusy) && <span className="a2-maly">malý vzorek</span>}
            </div>
            <div className="a2-karta">
              <b>Jaké odpovědi žáci dávají?</b>
              {rozlozeni.map(([k, n]) => <span key={k} className="a2-sloupec"><span style={{ fontWeight: k === "správně" ? 800 : 500 }}>{k}</span><span className="a2-pruh"><span style={{ width: `${(n / max) * 100}%`, background: k === "správně" ? "var(--a-ok)" : k === "přeskočeno" ? "var(--a-slaby)" : "var(--a-spatne)" }} /></span><b style={{ textAlign: "right" }}>{n}</b></span>)}
            </div>
            <div className="a2-karta">
              <b>Jak dlouho to trvá?</b>
              {kose.map(([n, a, b]) => { const p = casy.filter((c) => c >= a && c < b).length; return <span key={n} className="a2-sloupec"><span>{n}</span><span className="a2-pruh"><span style={{ width: `${casy.length ? (p / casy.length) * 100 : 0}%` }} /></span><b style={{ textAlign: "right" }}>{p}</b></span>; })}
              <span className="a2-s">Medián {s.medianMs !== null ? sek(s.medianMs) : "–"}{ex ? ` · v katalogu odhad ${ex.cas_sekund} s` : ""}{s.tipovani ? ` · ${s.tipovani} špatných odpovědí pod 5 s (tipování)` : ""}</span>
            </div>
          </section>
          <section className="a2-sekce">
            <h2 className="a2-h2"><span>Kdo ji pokazil · {pokazili.length}</span></h2>
            {!pokazili.length ? <Prazdne titulek="Nikdo." /> : (
              <div className="a2-karta">
                {pokazili.slice(0, 30).map((r, i) => <span key={i} className="a2-radek a2-mezi"><Link href={`/admin/novy/zaci/${r.user_id}?tab=uceni`} style={{ color: "var(--a-modra)" }}>{jm(r.user_id)}</Link><span className="a2-s">„{r.odpoved ?? "?"}“ · {r.cas_ms !== null ? sek(r.cas_ms) : "–"}{r.napoveda ? " · nápověda" : ""}</span></span>)}
              </div>
            )}
          </section>
        </div>
      )}
    </Stranka>
  );
}
