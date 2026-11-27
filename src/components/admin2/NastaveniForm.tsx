"use client";

import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { prepniRezim, ulozNastaveniAdminu } from "@/app/(admin)/admin/novy/akce";
import type { Nastaveni } from "@/lib/admin2/nastaveni";

/** Nastavení adminu (SY-03): cíle, prahy, názvy kampaní, ostrý režim e-mailů, demo data. */
export default function NastaveniForm({ vychozi, demo }: { vychozi: Nastaveni; demo: boolean }) {
  const toast = useToast();
  const [n, setN] = useState<Nastaveni>(vychozi);
  const [kampane, setKampane] = useState<[string, string][]>(Object.entries(vychozi.kampane));
  const [pending, start] = useTransition();
  const cislo = (v: string) => Math.max(0, Math.round(Number(v) || 0));
  const uloz = () => start(async () => {
    try { await ulozNastaveniAdminu({ ...n, kampane: Object.fromEntries(kampane.filter(([k, v]) => k.trim() && v.trim()).map(([k, v]) => [k.trim(), v.trim()])) }); toast({ text: "Nastavení uloženo" }); }
    catch (e) { toast({ text: e instanceof Error ? e.message : "Nepovedlo se uložit" }); }
  });
  return (
    <form className="a2-sekce" onSubmit={(e) => { e.preventDefault(); uloz(); }} data-testid="a2-nastaveni">
      <h2 className="a2-h2" id="cile">Cíle sezóny</h2>
      <div className="a2-karta">
        <label className="a2-pole">Začátek sezóny (registrace se počítají od)<input type="date" id="n-sezona" value={n.sezonaOd} onChange={(e) => setN({ ...n, sezonaOd: e.target.value })} /></label>
        {n.cile.map((c, ci) => (
          <div key={c.klic} className="a2-sekce" style={{ gap: 4 }}>
            <b style={{ fontSize: 14 }}>{c.nazev}</b>
            {c.milniky.map((m, mi) => (
              <div key={mi} className="a2-radek" style={{ flexWrap: "nowrap" }}>
                <input type="date" aria-label="Do kdy" value={m.do} onChange={(e) => { const cile = structuredClone(n.cile); cile[ci].milniky[mi].do = e.target.value; setN({ ...n, cile }); }} style={{ flex: 2 }} />
                <input type="number" aria-label="Od" value={m.od} onChange={(e) => { const cile = structuredClone(n.cile); cile[ci].milniky[mi].od = cislo(e.target.value); setN({ ...n, cile }); }} style={{ flex: 1 }} />
                <input type="number" aria-label="Do" value={m.az} onChange={(e) => { const cile = structuredClone(n.cile); cile[ci].milniky[mi].az = cislo(e.target.value); setN({ ...n, cile }); }} style={{ flex: 1 }} />
              </div>
            ))}
          </div>
        ))}
        <label className="a2-pole">Prodané Kompletní přípravy (ručně, z Wixu)<input type="number" id="n-kompletni" min={0} value={n.rucne.kompletni} onChange={(e) => setN({ ...n, rucne: { ...n.rucne, kompletni: cislo(e.target.value) } })} /></label>
      </div>

      <h2 className="a2-h2">Stavy žáka</h2>
      <div className="a2-karta">
        <label className="a2-pole">Nový: do kolika dní od registrace<input type="number" id="n-novy" min={1} value={n.prahy.novyDni} onChange={(e) => setN({ ...n, prahy: { ...n.prahy, novyDni: cislo(e.target.value) || 7 } })} /></label>
        <label className="a2-pole">Aktivní: trénink za posledních X dní<input type="number" id="n-aktivni" min={1} value={n.prahy.aktivniDni} onChange={(e) => setN({ ...n, prahy: { ...n.prahy, aktivniDni: cislo(e.target.value) || 7 } })} /></label>
        <label className="a2-pole">Usíná: do kolika dní bez tréninku (pak spí)<input type="number" id="n-usina" min={2} value={n.prahy.usinaDni} onChange={(e) => setN({ ...n, prahy: { ...n.prahy, usinaDni: cislo(e.target.value) || 14 } })} /></label>
      </div>

      <h2 className="a2-h2">Prahy doporučení</h2>
      <div className="a2-karta">
        <label className="a2-pole">Nový žák bez diagnostiky po (hodin)<input type="number" id="n-p1" value={n.pravidla.bezDiagnostikyHodin} onChange={(e) => setN({ ...n, pravidla: { ...n.pravidla, bezDiagnostikyHodin: cislo(e.target.value) } })} /></label>
        <label className="a2-pole">Diagnostika bez tréninku po (hodin)<input type="number" id="n-p2" value={n.pravidla.diagBezTreninkuHodin} onChange={(e) => setN({ ...n, pravidla: { ...n.pravidla, diagBezTreninkuHodin: cislo(e.target.value) } })} /></label>
        <label className="a2-pole">Aktivní žák přestal po (dnech)<input type="number" id="n-p3" value={n.pravidla.prestalDni} onChange={(e) => setN({ ...n, pravidla: { ...n.pravidla, prestalDni: cislo(e.target.value) } })} /></label>
        <label className="a2-pole">Ruční Premium končí do (dní)<input type="number" id="n-p4" value={n.pravidla.premiumKonciDni} onChange={(e) => setN({ ...n, pravidla: { ...n.pravidla, premiumKonciDni: cislo(e.target.value) } })} /></label>
        <label className="a2-pole">Registrace: aspoň kolik otevření za 7 dní<input type="number" id="n-p5" value={n.pravidla.registraceMinOtevreni} onChange={(e) => setN({ ...n, pravidla: { ...n.pravidla, registraceMinOtevreni: cislo(e.target.value) } })} /></label>
        <label className="a2-pole">Registrace: upozornit pod (% odeslaných)<input type="number" id="n-p6" value={n.pravidla.registraceMinPodil} onChange={(e) => setN({ ...n, pravidla: { ...n.pravidla, registraceMinPodil: cislo(e.target.value) } })} /></label>
      </div>

      <h2 className="a2-h2">Názvy kampaní a zdrojů</h2>
      <div className="a2-karta">
        <span className="a2-s">Kód zdroje (jak ho ukládá appka, např. „fb · 120250…“) → lidský název.</span>
        {kampane.map(([k, v], i) => (
          <div key={i} className="a2-radek" style={{ flexWrap: "nowrap" }}>
            <input type="text" aria-label="Kód" value={k} onChange={(e) => setKampane(kampane.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} style={{ flex: 1 }} />
            <input type="text" aria-label="Název" value={v} onChange={(e) => setKampane(kampane.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} style={{ flex: 1 }} />
          </div>
        ))}
        <button type="button" className="a2-btn a2-sek a2-male" style={{ alignSelf: "flex-start" }} onClick={() => setKampane([...kampane, ["", ""]])}>+ Kampaň</button>
      </div>

      <h2 className="a2-h2">E-maily z adminu</h2>
      <div className="a2-karta">
        <label className="a2-check"><input type="checkbox" id="n-naostro" checked={n.emailyNaostro} onChange={(e) => setN({ ...n, emailyNaostro: e.target.checked })} /><span><b>Ostrý režim:</b> e-maily z adminu chodí žákům. Vypnuto = vše jde na tvou adresu s „TEST“ v předmětu. I v ostrém režimu se každé odeslání potvrzuje, odhlášení se přeskočí a najednou nejvýš 50 žáků (strop Resend Free je 100 e-mailů denně).</span></label>
      </div>

      <div className="a2-radek"><button type="submit" className="a2-btn" disabled={pending}>Uložit nastavení</button></div>

      <h2 className="a2-h2">Demo data</h2>
      <div className="a2-karta">
        <span className="a2-s">Vymyšlení žáci pro ukázky a screenshoty. Nic se nečte z databáze ani nezapisuje.</span>
        <button type="button" className="a2-btn a2-sek a2-male" style={{ alignSelf: "flex-start" }} disabled={pending} onClick={() => start(() => prepniRezim("demo", !demo))}>{demo ? "Vypnout demo data" : "Zapnout demo data"}</button>
      </div>
    </form>
  );
}
