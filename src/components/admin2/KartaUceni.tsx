/**
 * Záložky karty žáka z fáze B3 (serverové): Učení (UC-05, UC-06, UC-09, posledních 50 odpovědí),
 * Testy nanečisto (body z Vyhodnocení vedle tréninku) a Rodina (rodič, odběr reportu, sourozenci, zprávy rodině).
 */
import Link from "next/link";
import { Info, Prazdne } from "./Prvky";
import KopirovatClaude from "./KopirovatClaude";
import { ChybiMigraceUceni, MERI_SE_OD, PRIJIMACKY, nactiKarty, nactiOdpovedi, opakovani, pripravenost, tematZaka, type Odpoved, type Karta } from "@/lib/admin2/uceni";
import { odhadZaka } from "@/lib/admin2/odhad";
import { nactiRodice, nactiTesty } from "@/lib/admin2/rodiny";
import { nactiZpravy, nazevSablony, nazevStavu } from "@/lib/admin2/zpravy";
import { isoPred, type DnyAktivity } from "@/lib/admin2/metriky";
import { zobraz, skryjEmail } from "@/lib/admin2/sdileni";
import { temaLabel } from "@/types";
import type { Kontext } from "@/lib/admin2/data";
import type { Zak } from "@/lib/admin2/typy";

const sek = (ms: number | null) => (ms === null ? "–" : ms < 60000 ? `${Math.round(ms / 1000)} s` : `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`);
const datum = (iso: string) => new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });

async function nacti(k: Kontext, id: string): Promise<{ zaka: Odpoved[]; vsech: Odpoved[]; karty: Karta[] } | null> {
  try {
    const [zaka, vsech, karty] = await Promise.all([nactiOdpovedi(k, { userId: id }), nactiOdpovedi(k, { od: isoPred(90) }), nactiKarty(k, id)]);
    return { zaka, vsech, karty };
  } catch (e) { if (e instanceof ChybiMigraceUceni) return null; throw e; }
}

export async function ZalozkaUceni({ k, zak, dny, pseudonym }: { k: Kontext; zak: Zak; dny: DnyAktivity; pseudonym: string }) {
  const [d, odhad] = await Promise.all([nacti(k, zak.id), odhadZaka(k, zak)]);
  if (!d) return <Prazdne titulek="Chybí migrace logu odpovědí." />;
  const temata = tematZaka(d.zaka, d.vsech);
  const op = opakovani(d.karty, d.zaka);
  const trenovana = new Set(d.zaka.map((r) => r.tema ?? ""));
  const pr = odhad && !odhad.bezDat ? pripravenost(zak, dny, odhad.temata, trenovana) : null;
  const posl = [...d.zaka].reverse().slice(0, 50);
  const md = [
    `## ${pseudonym}, ${zak.trida}. třída (pseudonym, bez jména a e-mailu)`,
    odhad && !odhad.bezDat ? `- Odhad bodů: ${odhad.celkem} z ${odhad.max} (orientační)${odhad.tydny.length ? `, týdny: ${odhad.tydny.map((t) => t.b).join(" → ")}` : ""}` : "- Odhad bodů: zatím bez dat",
    pr ? `- Do přijímaček ${pr.dniDo} dní, tempo ${pr.tempo} dne tréninku za týden, ${pr.pozadu ? "POZADU" : "stíhá"} (${pr.vysvetleni})` : "",
    ...temata.map((t) => `- ${t.nazev}: ${t.uspesnost ?? "–"} % na první pokus (${t.odpovedi} odpovědí)${t.obtiznost ? `, ${t.obtiznost === "lehke" ? "moc lehké" : "moc těžké"}` : ""}`),
    `- Opakování: ${op.naRade} na řadě, ${op.poTerminu} po termínu, úspěšnost ${op.uspesnost ?? "–"} %`,
  ].filter(Boolean).join("\n");

  return (
    <section className="a2-dva" data-testid="a2-uceni-zaka">
      <div className="a2-sekce">
        <h2 className="a2-h2"><span>Odhad bodů a připravenost</span><Info>Stejný výpočet jako týdenní přehled rodičům. Orientační, dokud ho neporovnám s testy nanečisto (fáze C). „Pozadu“: každé slabé téma (pod 60 % bodů) potřebuje aspoň 3 dny tréninku; pozadu, když jich je víc, než zbývající týdny × jeho tempo.</Info></h2>
        {!odhad || odhad.bezDat ? <Prazdne titulek="Odhad zatím není.">Odhad bodů vznikne po diagnostice a prvních trénincích.</Prazdne> : (
          <div className="a2-karta">
            <span className="a2-radek a2-mezi"><b style={{ fontSize: 22 }}>{odhad.celkem} <span className="a2-s">z {odhad.max} bodů</span></b><span className="a2-stitek seda">orientační</span></span>
            {odhad.tydny.length > 0 && <span className="a2-s">Po týdnech: {odhad.tydny.map((t) => t.b).join(" → ")}{odhad.zmena !== null ? ` (${odhad.zmena >= 0 ? "+" : ""}${odhad.zmena} za týden)` : ""}{odhad.cil ? ` · cíl ${odhad.cil}` : ""}</span>}
            {pr && <span className="a2-s">Do přijímaček ({datum(PRIJIMACKY[zak.trida])}) zbývá {pr.dniDo} dní · tempo {pr.tempo.toLocaleString("cs-CZ")} dne tréninku za týden</span>}
            {pr && pr.slaba.length > 0 && <span className="a2-s">Slabá témata: {pr.slaba.map((s) => `${s.nazev} (${s.podil} %)`).join(", ")}{pr.netrenovanaSlaba.length ? ` · ještě netrénoval: ${pr.netrenovanaSlaba.join(", ")}` : ""}</span>}
            {pr && <span className={`a2-stitek ${pr.pozadu ? "spatne" : "ok"}`} style={{ alignSelf: "flex-start" }} title={pr.vysvetleni}>{pr.pozadu ? "pozadu s přípravou" : "stíhá"}</span>}
            {pr && <span className="a2-s" style={{ fontSize: 12 }}>{pr.vysvetleni}</span>}
          </div>
        )}
        <h2 className="a2-h2"><span>Témata</span><Info>Úspěšnost na první pokus. Moc lehké: přes 90 % správně v posledních 20 odpovědích a rychleji než ostatní. Moc těžké: pod 50 % nebo přes 30 % přeskočeno. Až od 8 odpovědí v tématu.</Info></h2>
        {!temata.length ? <Prazdne titulek="Zatím žádné odpovědi.">Log odpovědí běží od {datum(MERI_SE_OD)}.</Prazdne> : (
          <div className="a2-karta">
            {temata.map((t) => (
              <div key={t.tema} id={`t-${t.tema}`} className="a2-zprava">
                <span className="a2-t">{t.nazev} {t.obtiznost && <span className={`a2-stitek ${t.obtiznost === "tezke" ? "spatne" : "ok"}`}>{t.obtiznost === "tezke" ? "moc těžké" : "moc lehké"}</span>}</span>
                <b style={{ color: (t.uspesnost ?? 0) >= 75 ? "var(--a-ok)" : (t.uspesnost ?? 0) >= 50 ? "var(--a-pozor)" : "var(--a-spatne)" }}>{t.uspesnost ?? "–"} %</b>
                <span className="a2-s" style={{ gridColumn: "1 / -1" }}>{t.odpovedi} odpovědí · posledních {t.posledni.n}: {t.posledni.spravne} správně, {t.posledni.preskoceno} přeskočeno, medián {sek(t.posledni.medianMs)}{t.trend !== null ? ` · trend ${t.trend > 0 ? "+" : ""}${t.trend} b.` : ""}</span>
              </div>
            ))}
          </div>
        )}
        <h2 className="a2-h2"><span>Opakování</span></h2>
        <div className="a2-karta">
          <span className="a2-s">{op.karet} karet · dnes na řadě <b>{op.naRade}</b> · po termínu <b>{op.poTerminu}</b> · úspěšnost v opakování {op.uspesnost ?? "–"}{op.uspesnost !== null ? ` % (${op.opakovani})` : ""}</span>
          {op.zapomina.length > 0 && <span className="a2-s">Zapomíná stejné úlohy: {op.zapomina.map((x) => <Link key={x.uloha_id} href={`/admin/novy/uceni/uloha/${encodeURIComponent(x.uloha_id)}`} style={{ color: "var(--a-modra)", marginRight: 6 }}>{x.uloha_id} ({x.neuspechu}×)</Link>)}</span>}
        </div>
      </div>
      <div className="a2-sekce">
        <h2 className="a2-h2"><span>Posledních {posl.length} odpovědí</span></h2>
        {!posl.length ? <Prazdne titulek="Zatím nic." /> : (
          <div className="a2-karta">
            {posl.map((r, i) => (
              <div key={i} className="a2-zprava">
                <span className="a2-t"><Link href={`/admin/novy/uceni/uloha/${encodeURIComponent(r.uloha_id)}`}>{r.uloha_id}</Link> <span className="a2-s">· {r.tema ? temaLabel(r.tema) : "?"}{r.rezim === "opakovani" ? " · opakování" : r.rezim === "diagnostika" ? " · diagnostika" : ""}</span></span>
                <b style={{ color: r.preskoceno ? "var(--a-slaby)" : r.spravne ? "var(--a-ok)" : "var(--a-spatne)" }} aria-label={r.preskoceno ? "přeskočeno" : r.spravne ? "správně" : "špatně"}>{r.preskoceno ? "–" : r.spravne ? "✓" : "✗"}</b>
                <span className="a2-s" style={{ gridColumn: "1 / -1" }}>{r.preskoceno ? "přeskočeno" : `odpověď „${r.odpoved ?? "?"}“`} · {sek(r.cas_ms)}{r.napoveda ? " · nápověda" : ""}{r.postup ? " · postup" : ""}{r.pokus && r.pokus > 1 ? ` · ${r.pokus}. pokus` : ""} · {new Date(r.created_at).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        )}
        <KopirovatClaude text={md} />
      </div>
    </section>
  );
}

export async function ZalozkaTesty({ k, zak }: { k: Kontext; zak: Zak }) {
  const [testy, odp] = await Promise.all([nactiTesty(k, zak.id), nactiOdpovedi(k, { userId: zak.id }).catch(() => [] as Odpoved[])]);
  if (!testy.length) return <Prazdne titulek={zak.propojeno_vysledky ? "Propojeno, výsledky zatím nepřišly." : "Bez testu nanečisto."}>{zak.propojeno_vysledky ? `Účet je propojený s Vyhodnocením od ${datum(zak.propojeno_vysledky)}.` : "Účet zatím není propojený s Vyhodnocením (Mám kód z testu)."}</Prazdne>;
  const posledni = testy[0];
  const poTestu = odp.filter((r) => r.created_at.slice(0, 10) >= posledni.d);
  const slaba = posledni.temata.filter((t) => t.max > 0 && t.pts / t.max < 0.6);
  return (
    <section className="a2-sekce" data-testid="a2-testy-zaka">
      {testy.map((t) => (
        <div key={t.d} className="a2-karta">
          <span className="a2-radek a2-mezi"><b>Test {t.n} · {datum(t.d)}</b>{t.celkem && <span className="a2-stitek">{t.celkem.pts} z {t.celkem.max} b.</span>}</span>
          {t.temata.map((x) => {
            const tr = poTestu.filter((r) => r.tema === x.k);
            return <span key={x.k + (x.s ?? "")} className="a2-sloupec"><span>{temaLabel(x.k)}</span><span className="a2-pruh"><span style={{ width: `${(x.pts / x.max) * 100}%`, background: x.pts / x.max < 0.6 ? "var(--a-pozor)" : "var(--a-ok)" }} /></span><b style={{ textAlign: "right" }}>{x.pts}/{x.max}</b>{t === posledni && <span className="a2-s" style={{ gridColumn: "2 / -1" }}>v MateMaxu po testu: {tr.length ? `${tr.length} odpovědí` : "netrénoval"}</span>}</span>;
          })}
        </div>
      ))}
      <p className="a2-zaver">{slaba.length ? `Slabá témata z posledního testu: ${slaba.map((s) => temaLabel(s.k)).join(", ")}. Trénuje z nich: ${slaba.filter((s) => poTestu.some((r) => r.tema === s.k)).map((s) => temaLabel(s.k)).join(", ") || "zatím žádné"}.` : "V posledním testu žádné slabé téma (pod 60 %)."}</p>
    </section>
  );
}

export async function ZalozkaRodina({ k, zak, zaci, ps }: { k: Kontext; zak: Zak; zaci: Zak[]; ps: Map<string, string> }) {
  const [rodice, { zpravy }] = await Promise.all([nactiRodice(k, zaci), nactiZpravy(k, { userId: zak.id, limit: 100 }).catch(() => ({ zpravy: [] as Awaited<ReturnType<typeof nactiZpravy>>["zpravy"] }))]);
  const moji = rodice.filter((r) => r.deti.includes(zak.id));
  const rodicovske = zpravy.filter((m) => m.prijemce_typ === "rodic");
  const jm = (id: string) => { const x = zaci.find((y) => y.id === id); return x ? zobraz(x, k.sdileni, ps).jmeno : "?"; };
  return (
    <section className="a2-sekce" data-testid="a2-rodina-zaka">
      {!moji.length ? <Prazdne titulek="Rodič není propojený.">Rodič se propojí v appce (Profil → Rodič) nebo přes odkaz na /rodice. {zak.rodic_email ? `E-mail rodiče pro report: ${skryjEmail(zak.rodic_email, k.sdileni)}.` : ""}</Prazdne> : moji.map((r) => (
        <div key={r.email} className="a2-karta">
          <span className="a2-radek a2-mezi"><b>Rodič: {k.sdileni ? "skrytý e-mail" : r.email}</b><span className={`a2-stitek ${r.overeno ? "ok" : "pozor"}`}>{r.overeno ? "potvrzeno" : "nepotvrdil odběr"}</span></span>
          <span className="a2-s">Týdenní přehled: {r.report === "tydne" ? "každé pondělí" : r.report === "mesicne" ? "jednou za měsíc" : r.report === "vypnuto" ? "vypnutý" : "neznámo"} · propojeno {datum(r.od)}</span>
          {r.deti.length > 1 && <span className="a2-s">Sourozenci: {r.deti.filter((d) => d !== zak.id).map((d) => <Link key={d} href={`/admin/novy/zaci/${d}`} style={{ color: "var(--a-modra)", marginRight: 6 }}>{jm(d)}</Link>)}</span>}
        </div>
      ))}
      <h2 className="a2-h2"><span>Zprávy rodině · {rodicovske.length}</span></h2>
      {!rodicovske.length ? <Prazdne titulek="Zatím nic.">Log zpráv běží od 27. 11. 2026.</Prazdne> : (
        <div className="a2-karta">
          {rodicovske.map((m) => <span key={m.id} className="a2-radek a2-mezi"><span>{m.predmet ?? nazevSablony(m.sablona)}</span><span className="a2-s">{nazevStavu(m.stav).toLowerCase()} · {datum(m.odeslano_at)}</span></span>)}
        </div>
      )}
      <Link className="a2-btn a2-sek" href="/admin/novy/zaci/rodice" style={{ alignSelf: "flex-start" }}>Všichni rodiče</Link>
    </section>
  );
}
