"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useToast } from "./Toast";
import { posliSablonu, stitky, ulozSegment } from "@/app/(admin)/admin/novy/akce";
import type { EmailZaka } from "@/lib/emaily/katalog";

/**
 * Seznam žáků s výběrem a hromadnými akcemi (ZA-03): šablona e-mailu (testovací režim je výchozí),
 * štítek, export CSV. Pamatuje si adresu seznamu, ať karta žáka umí „← Žáci“ se stejnými filtry (KO-05).
 */
export interface KartaZaka {
  id: string; jmeno: string; trida: 5 | 9; prisel: string; stav: string; stavTon: string; posledni: string;
  treninky: string; kroky: { nazev: string; ok: boolean }[]; stitky: string[];
}

const SABLONY: [EmailZaka, string][] = [["nezacal", "Připomínka: ještě nezačal"], ["plan", "Plán po diagnostice"], ["styska", "Stýská se mi (3 dny)"], ["spi", "Poslední připomínka (7 dní)"], ["uvitani", "Uvítání"]];
export const SEZNAM_KLIC = "admin2-seznam";

export default function VyberZaku({ zaci, naostro, exportHref, demo }: { zaci: KartaZaka[]; naostro: boolean; exportHref: string; demo: boolean }) {
  const toast = useToast();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [vybrane, setVybrane] = useState<Set<string>>(new Set());
  const [rezim, setRezim] = useState<null | "email" | "stitek" | "segment">(null);
  const [sablona, setSablona] = useState<EmailZaka>("nezacal");
  const [stitek, setStitek] = useState("");
  const [nazevSeg, setNazevSeg] = useState("");
  const [potvrzeno, setPotvrzeno] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => { try { sessionStorage.setItem(SEZNAM_KLIC, `${pathname}${sp.toString() ? `?${sp}` : ""}`); } catch { /* nic */ } }, [pathname, sp]);

  const prepni = (id: string) => setVybrane((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const vse = vybrane.size === zaci.length && zaci.length > 0;
  const ids = [...vybrane];

  return (
    <div className="a2-sekce">
      <div className="a2-radek a2-mezi">
        <label className="a2-check" style={{ alignItems: "center" }}><input type="checkbox" checked={vse} onChange={() => setVybrane(vse ? new Set() : new Set(zaci.map((z) => z.id)))} aria-label="Vybrat všechny" /> <span className="a2-s">{vybrane.size ? `Vybráno ${vybrane.size}` : "Vybrat všechny"}</span></label>
        <span className="a2-radek" style={{ gap: 6 }}>
          <a className="a2-btn a2-sek a2-male" href={`${exportHref}${vybrane.size ? `${exportHref.includes("?") ? "&" : "?"}ids=${ids.join(",")}` : ""}`} data-testid="a2-export">Export CSV</a>
          <button type="button" className="a2-btn a2-sek a2-male" onClick={() => setRezim("segment")}>Uložit jako segment</button>
        </span>
      </div>
      {vybrane.size > 0 && !demo && (
        <div className="a2-karta" data-testid="a2-hromadne">
          <span className="a2-radek"><b>Hromadně ({vybrane.size}):</b>
            <button type="button" className="a2-btn a2-male" onClick={() => setRezim("email")}>Poslat šablonu</button>
            <button type="button" className="a2-btn a2-sek a2-male" onClick={() => setRezim("stitek")}>Přidat štítek</button>
          </span>
          {rezim === "email" && (
            <form className="a2-sekce" onSubmit={(e) => { e.preventDefault(); start(async () => { try { const r = await posliSablonu(ids, sablona, potvrzeno); toast({ text: r.zprava }); setRezim(null); setPotvrzeno(false); } catch (er) { toast({ text: er instanceof Error ? er.message : "Chyba" }); } }); }}>
              <label className="a2-pole">Šablona<select id="hromadne-sablona" value={sablona} onChange={(e) => setSablona(e.target.value as EmailZaka)}>{SABLONY.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
              <a className="a2-s" href={`/admin/emaily`} style={{ color: "var(--a-modra)" }}>Náhled šablon v sekci E-maily</a>
              {naostro ? (
                <label className="a2-check"><input type="checkbox" checked={potvrzeno} onChange={(e) => setPotvrzeno(e.target.checked)} /><span><b>Ostrý režim:</b> odeslat {vybrane.size} {vybrane.size === 1 ? "žákovi" : "žákům"} (nejvýš 50, odhlášení se přeskočí). Nejde vzít zpět.</span></label>
              ) : <span className="a2-s">Testovací režim: přijde jedna ukázka na tvou adresu s „TEST“ v předmětu, žákům nic.</span>}
              <div className="a2-radek"><button type="submit" className="a2-btn a2-male" disabled={pending || (naostro && !potvrzeno)}>{naostro ? "Odeslat" : "Poslat test"}</button><button type="button" className="a2-btn a2-sek a2-male" onClick={() => setRezim(null)}>Zrušit</button></div>
            </form>
          )}
          {rezim === "stitek" && (
            <form className="a2-radek" onSubmit={(e) => { e.preventDefault(); start(async () => { await stitky(ids, stitek, true); toast({ text: `Štítek „${stitek}“ přidán`, zpet: async () => { await stitky(ids, stitek, false); } }); setRezim(null); setStitek(""); }); }}>
              <input type="text" id="hromadne-stitek" value={stitek} onChange={(e) => setStitek(e.target.value)} placeholder="Štítek" maxLength={40} required style={{ flex: 1 }} />
              <button type="submit" className="a2-btn a2-male" disabled={pending}>Přidat</button>
            </form>
          )}
        </div>
      )}
      {rezim === "segment" && (
        <form className="a2-karta" onSubmit={(e) => { e.preventDefault(); start(async () => { await ulozSegment(nazevSeg, sp.toString()); toast({ text: `Segment „${nazevSeg}“ uložen` }); setRezim(null); setNazevSeg(""); }); }}>
          <label className="a2-pole">Název segmentu (uloží současné filtry)<input type="text" id="segment-nazev" value={nazevSeg} onChange={(e) => setNazevSeg(e.target.value)} required maxLength={40} /></label>
          <div className="a2-radek"><button type="submit" className="a2-btn a2-male" disabled={pending}>Uložit</button><button type="button" className="a2-btn a2-sek a2-male" onClick={() => setRezim(null)}>Zrušit</button></div>
        </form>
      )}

      {zaci.map((z) => (
        <div key={z.id} className="a2-karta" data-testid="a2-zak" style={{ padding: "10px 12px" }}>
          <div className="a2-zak">
            <input type="checkbox" checked={vybrane.has(z.id)} onChange={() => prepni(z.id)} aria-label={`Vybrat ${z.jmeno}`} style={{ width: 22, height: 22, margin: "0 7px", accentColor: "var(--a-ok)" }} />
            <Link href={`/admin/novy/zaci/${z.id}`} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="a2-radek" style={{ gap: 6 }}><b>{z.jmeno}</b><span className={`a2-tr t${z.trida}`}>{z.trida}.</span><span className={`a2-stitek ${z.stavTon}`}>{z.stav}</span>{z.stitky.map((s) => <span key={s} className="a2-stitek seda">{s}</span>)}</span>
              <span className="a2-s">{z.prisel}</span>
              <span className="a2-s">{z.posledni} · {z.treninky}</span>
            </Link>
            <span className="a2-tecky" title={z.kroky.map((k) => `${k.ok ? "✓" : "✗"} ${k.nazev}`).join(", ")} aria-label={z.kroky.map((k) => `${k.nazev} ${k.ok ? "ano" : "ne"}`).join(", ")}>{z.kroky.map((k) => <b key={k.nazev} className={k.ok ? "ok" : ""} />)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
