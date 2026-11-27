"use client";

import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { ulozKampan } from "@/app/(admin)/admin/novy/rust/akce";

/**
 * Generátor odkazů (RU-03): typ a lidský název → odkaz s utm parametry. Název se uloží do nastavení,
 * takže v Růstu a na kartě žáka se kampaň ukáže lidsky. Cíl: „přímo / neznámo“ pod 30 %.
 */
const TYPY = [["facebook", "Příspěvek na FB"], ["fb", "Reklama"], ["email", "E-mail"], ["letak", "Leták"], ["vysledky", "Výsledky testu"], ["web", "Web"]] as const;
const ZAKLAD = "https://matemax.matematika-snadno.cz/";
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export default function GeneratorOdkazu({ demo }: { demo: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [typ, setTyp] = useState<string>("letak");
  const [nazev, setNazev] = useState("");
  const [cil, setCil] = useState("/");
  const kampan = slug(nazev);
  const odkaz = kampan ? `${ZAKLAD.replace(/\/$/, "")}${cil}?utm_source=${typ}&utm_campaign=${kampan}` : "";
  return (
    <div className="a2-karta" data-testid="a2-generator">
      <b>Nový odkaz s kampaní</b>
      <label className="a2-pole">Typ<select id="gen-typ" value={typ} onChange={(e) => setTyp(e.target.value)}>{TYPY.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
      <label className="a2-pole">Název kampaně (lidsky)<input type="text" id="gen-nazev" value={nazev} onChange={(e) => setNazev(e.target.value)} maxLength={80} placeholder="Např. Leták ZŠ Týn prosinec" /></label>
      <label className="a2-pole">Kam vede<select id="gen-cil" value={cil} onChange={(e) => setCil(e.target.value)}><option value="/">Úvodní stránka</option><option value="/registrace">Registrace</option><option value="/cenik">Ceník</option><option value="/rodice">Pro rodiče</option></select></label>
      {odkaz && <div className="a2-bublina" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, wordBreak: "break-all" }} data-testid="a2-odkaz">{odkaz}</div>}
      <div className="a2-radek">
        <button type="button" className="a2-btn a2-male" disabled={!odkaz || pending} onClick={() => start(async () => {
          try { await navigator.clipboard.writeText(odkaz); } catch { /* zkopíruje se ručně z rámečku */ }
          if (!demo) await ulozKampan(`${typ} · ${kampan}`, nazev);
          toast({ text: demo ? "Zkopírováno (v demu se název neukládá)" : "Zkopírováno a název kampaně uložen" });
        })}>Kopírovat a uložit</button>
      </div>
      <span className="a2-s" style={{ fontSize: 12 }}>Výsledky odkazu uvidíš v tabulce zdrojů pod tímto názvem, jakmile po něm někdo přijde.</span>
    </div>
  );
}
