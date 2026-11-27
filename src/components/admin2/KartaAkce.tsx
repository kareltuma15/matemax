"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { nastavDoporuceni, palecDoporuceni, posliSablonu, pridejUkol, vratDoporuceni } from "@/app/(admin)/admin/novy/akce";
import type { AkceDoporuceni } from "@/lib/admin2/doporuceni";
import type { EmailZaka } from "@/lib/emaily/katalog";

/**
 * Karta akce na Dnes (DN-01): co se stalo a u koho, proč na tom záleží, hlavní tlačítko a menu
 * Odložit (zítra, za týden) / Hotovo / Skrýt s důvodem. Vratné akce mají „Zpět“ na 10 s.
 */
export default function KartaAkce({ klic, pravidlo, oblast, titulek, proc, lide, akce, palec, naostro }: {
  klic: string; pravidlo: string; oblast: string; titulek: string; proc: string; lide: { id: string; jmeno: string; trida: 5 | 9 }[];
  akce: AkceDoporuceni; palec: number | null; naostro: boolean;
}) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [skryt, setSkryt] = useState(false);
  const [duvod, setDuvod] = useState("");
  const [potvrdit, setPotvrdit] = useState(false);
  const [pending, start] = useTransition();
  const [p, setP] = useState(palec);

  const zmena = (a: "hotovo" | "zitra" | "tyden" | "skryt", d?: string) => start(async () => {
    setMenu(false); setSkryt(false);
    const puvodni = await nastavDoporuceni(klic, pravidlo, a, d);
    toast({ text: a === "hotovo" ? "Hotovo" : a === "skryt" ? "Skryto" : a === "zitra" ? "Odloženo na zítra" : "Odloženo o týden", zpet: async () => { await vratDoporuceni(klic, pravidlo, puvodni); } });
  });

  const hlavni = () => {
    if (akce.typ === "odkaz") return <Link href={akce.href} className="a2-btn">{akce.text}</Link>;
    if (akce.typ === "ukol") return <button type="button" className="a2-btn" disabled={pending} onClick={() => start(async () => { await pridejUkol({ nazev: akce.ukol, zdroj: klic.slice(0, 80) }); await nastavDoporuceni(klic, pravidlo, "hotovo"); toast({ text: "Úkol přidán do plánu týdne" }); })}>{akce.text}</button>;
    return (
      <button type="button" className="a2-btn" disabled={pending} onClick={() => { if (naostro) setPotvrdit(true); else start(async () => { const r = await posliSablonu(lide.map((l) => l.id), akce.sablona as EmailZaka, false); toast({ text: r.zprava }); }); }}>
        {akce.text}
      </button>
    );
  };

  return (
    <div className="a2-karta a2-akce" data-oblast={oblast} data-testid={`a2-akce-${pravidlo}`} style={{ position: "relative", opacity: pending ? 0.6 : 1 }}>
      <span className="a2-t">{titulek}</span>
      {lide.length > 0 && (
        <span className="a2-radek" style={{ gap: 6 }}>
          {lide.slice(0, 6).map((l) => <Link key={l.id} href={`/admin/novy/zaci/${l.id}`} className="a2-cip" style={{ minHeight: 32 }}>{l.jmeno} <b>{l.trida}.</b></Link>)}
          {lide.length > 6 && <Link href={`/admin/novy/zaci?ids=${lide.map((l) => l.id).join(",")}`} className="a2-s">+{lide.length - 6} další</Link>}
        </span>
      )}
      <span className="a2-s">{proc}</span>
      {akce.typ === "email" && !naostro && <span className="a2-s" style={{ fontSize: 12 }}>Testovací režim: e-mail přijde na tvou adresu, žákům nic.</span>}
      <div className="a2-radek a2-mezi">
        {hlavni()}
        <span className="a2-radek" style={{ gap: 4 }}>
          <button type="button" className="a2-ikbtn" aria-pressed={p === 1} aria-label="Užitečné" onClick={() => start(async () => { setP(1); await palecDoporuceni(klic, pravidlo, 1); })}>👍</button>
          <button type="button" className="a2-ikbtn" aria-pressed={p === -1} aria-label="Neužitečné" onClick={() => start(async () => { setP(-1); await palecDoporuceni(klic, pravidlo, -1); })}>👎</button>
          <button type="button" className="a2-ikbtn" aria-label="Další volby" aria-expanded={menu} onClick={() => setMenu((m) => !m)} data-testid="a2-akce-menu">⋯</button>
        </span>
      </div>
      {menu && (
        <div className="a2-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => zmena("hotovo")}>Hotovo</button>
          <button type="button" role="menuitem" onClick={() => zmena("zitra")}>Odložit na zítra</button>
          <button type="button" role="menuitem" onClick={() => zmena("tyden")}>Odložit o týden</button>
          <button type="button" role="menuitem" onClick={() => { setMenu(false); setSkryt(true); }}>Skrýt s důvodem…</button>
        </div>
      )}
      {skryt && (
        <form className="a2-sekce" onSubmit={(e) => { e.preventDefault(); zmena("skryt", duvod); }}>
          <label className="a2-pole">Proč skrýt? (pomůže upravit pravidlo)
            <input type="text" value={duvod} onChange={(e) => setDuvod(e.target.value)} placeholder="Např. zbytečné, řeším jinak" maxLength={300} id={`duvod-${pravidlo}`} />
          </label>
          <div className="a2-radek"><button type="submit" className="a2-btn a2-male">Skrýt</button><button type="button" className="a2-btn a2-sek a2-male" onClick={() => setSkryt(false)}>Zrušit</button></div>
        </form>
      )}
      {potvrdit && akce.typ === "email" && (
        <>
          <div className="a2-okno-zavoj" onClick={() => setPotvrdit(false)} />
          <div className="a2-okno" role="dialog" aria-modal="true">
            <b>Odeslat e-mail naostro {lide.length} {lide.length === 1 ? "žákovi" : "žákům"}?</b>
            <span className="a2-s">Ostrý režim je zapnutý v nastavení. Odhlášení žáci se přeskočí. Tohle nejde vzít zpět.</span>
            <div className="a2-radek"><button type="button" className="a2-btn a2-cervene" onClick={() => start(async () => { setPotvrdit(false); const r = await posliSablonu(lide.map((l) => l.id), akce.sablona as EmailZaka, true); toast({ text: r.zprava }); })}>Odeslat</button><button type="button" className="a2-btn a2-sek" onClick={() => setPotvrdit(false)}>Zrušit</button></div>
          </div>
        </>
      )}
    </div>
  );
}
