"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "./Toast";
import { nastavDoporuceni, pridejUkol, zmenUkol } from "@/app/(admin)/admin/novy/akce";
import { dokonciKolecko, vyridPolozku } from "@/app/(admin)/admin/novy/zpravy/akce";

/**
 * Večerní kolečko (DN-02): jedna karta po druhé, nejdřív zprávy, pak fronta akcí, cíle a plán na zítra.
 * Přejetí doprava = hotovo, doleva = odložit (stejně jako tlačítka dole). Na konci shrnutí.
 * Co jsi vyřídil, server při dalším otevření vynechá (vyřízené zprávy a doporučení), takže jde kdykoli přerušit.
 */
export interface KartaKolecka {
  klic: string;
  druh: "zprava" | "akce" | "cile" | "plan";
  stitek: string;
  titulek: string;
  text?: string | null;
  bublina?: string | null;
  radky?: string[];
  odkaz?: { text: string; href: string };
  // co udělá Hotovo / Odložit
  schrankaId?: number;
  doporuceni?: { klic: string; pravidlo: string; ukol?: string };
  ukolId?: number;
}

const DRUH_NAZEV: Record<KartaKolecka["druh"], string> = { zprava: "Zprávy", akce: "Fronta akcí", cile: "Cíle", plan: "Plán na zítra" };

export default function Kolecko({ karty }: { karty: KartaKolecka[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [i, setI] = useState(0);
  const [vysledky, setVysledky] = useState<Record<string, "hotovo" | "odlozeno" | "preskoceno">>({});
  const zacatek = useRef(0);
  const [minut, setMinut] = useState(0);
  const [dx, setDx] = useState(0);
  const start0 = useRef<number | null>(null);

  useEffect(() => { zacatek.current = Date.now(); }, []);

  const k = karty[i];
  const hotovo = i >= karty.length;
  const pocty = { hotovo: 0, odlozeno: 0, preskoceno: 0 };
  for (const v of Object.values(vysledky)) pocty[v]++;

  const dalsi = (v: "hotovo" | "odlozeno" | "preskoceno") => {
    if (!k) return;
    setVysledky((x) => ({ ...x, [k.klic]: v }));
    setDx(0);
    setI((n) => n + 1);
    if (i + 1 >= karty.length) {
      const souhrn = { ...pocty, [v]: pocty[v] + 1 };
      const m = Math.max(1, Math.round((Date.now() - zacatek.current) / 60000));
      setMinut(m);
      start(async () => { await dokonciKolecko({ ...souhrn, minut: m }); });
    }
  };

  const udelej = (v: "hotovo" | "odlozeno") => start(async () => {
    if (!k) return;
    try {
      if (k.schrankaId !== undefined && v === "hotovo") await vyridPolozku(k.schrankaId, "vyrizeno");
      if (k.doporuceni) {
        if (v === "hotovo" && k.doporuceni.ukol) await pridejUkol({ nazev: k.doporuceni.ukol, zdroj: k.doporuceni.klic.slice(0, 80) });
        await nastavDoporuceni(k.doporuceni.klic, k.doporuceni.pravidlo, v === "hotovo" ? "hotovo" : "zitra");
      }
      if (k.ukolId !== undefined) await zmenUkol(k.ukolId, v === "hotovo" ? { stav: "hotovo" } : { tentoTyden: true });
    } catch (e) { toast({ text: e instanceof Error ? e.message : "Akce se nepovedla." }); return; }
    dalsi(v);
  });

  const konecTahu = () => {
    if (start0.current === null) return;
    start0.current = null;
    if (dx > 90) udelej("hotovo"); else if (dx < -90) udelej("odlozeno"); else setDx(0);
  };

  if (!karty.length) return <div className="a2-prazdne"><b>Dnes není co procházet.</b><span>Schránka je prázdná a fronta akcí taky. <Link href="/admin/novy/plan" style={{ color: "var(--a-modra)" }}>Plán týdne</Link></span></div>;

  if (hotovo) return (
    <div className="a2-kolecko" data-testid="a2-kolecko-konec">
      <div className="a2-karta">
        <span className="a2-h2">Hotovo</span>
        <b style={{ fontSize: 20 }}>Kolečko máš za sebou</b>
        <span className="a2-s">Vyřízeno {pocty.hotovo} · odloženo {pocty.odlozeno} · přeskočeno {pocty.preskoceno}{minut ? ` · ${minut} min` : ""}</span>
        <div className="a2-radek"><Link className="a2-btn" href="/admin/novy">Zpět na Dnes</Link><button type="button" className="a2-btn a2-sek" onClick={() => { setVysledky({}); setI(0); }}>Projít znovu</button></div>
      </div>
    </div>
  );

  return (
    <div className="a2-kolecko" data-testid="a2-kolecko">
      <div className="a2-radek a2-mezi"><span className="a2-s"><b>{DRUH_NAZEV[k.druh]}</b> · {i + 1} z {karty.length}</span><span className="a2-s">asi {Math.max(1, Math.round((karty.length - i) * 1.5))} min zbývá</span></div>
      <div className="a2-pruh" aria-hidden="true"><span style={{ width: `${Math.round((i / karty.length) * 100)}%` }} /></div>
      <div className="a2-karta" data-testid="a2-kolecko-karta" data-druh={k.druh}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 40}deg)`, opacity: pending ? 0.6 : 1, borderColor: dx > 40 ? "var(--a-ok)" : dx < -40 ? "var(--a-pozor)" : undefined }}
        onPointerDown={(e) => { if ((e.target as HTMLElement).closest("a,button,textarea,input")) return; start0.current = e.clientX; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (start0.current !== null) setDx(e.clientX - start0.current); }}
        onPointerUp={konecTahu} onPointerCancel={() => { start0.current = null; setDx(0); }}>
        <span className="a2-stitek" style={{ alignSelf: "flex-start" }}>{k.stitek}</span>
        <b style={{ fontSize: 17 }}>{k.titulek}</b>
        {k.bublina && <div className="a2-bublina">{k.bublina}</div>}
        {k.text && <span className="a2-s">{k.text}</span>}
        {k.radky?.map((r, n) => <span key={n} className="a2-s">{r}</span>)}
        {k.odkaz && <Link className="a2-btn a2-akc" style={{ alignSelf: "flex-start" }} href={k.odkaz.href}>{k.odkaz.text}</Link>}
      </div>
      <div className="a2-radek a2-mezi">
        <button type="button" className="a2-btn a2-sek" disabled={pending} onClick={() => udelej("odlozeno")}>← Odložit</button>
        <button type="button" className="a2-btn a2-sek" disabled={pending} onClick={() => dalsi("preskoceno")}>Přeskočit</button>
        <button type="button" className="a2-btn" disabled={pending} onClick={() => udelej("hotovo")} data-testid="a2-kolecko-hotovo">Hotovo →</button>
      </div>
      <span className="a2-s" style={{ textAlign: "center" }}>Přejeď doprava = hotovo · doleva = odložit na zítra</span>
    </div>
  );
}
