"use client";

import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { odeberOdber, pridejOdber, posliZkusebni, ulozPravidla } from "@/app/(admin)/admin/novy/nastaveni/akce-upozorneni";
import type { TypUpozorneni } from "@/lib/admin-push";

/**
 * Upozornění na telefon (SY-07, DN-10): zapnutí na tomto zařízení (povolení prohlížeče a odběr web-push),
 * typy upozornění, tiché hodiny, čas denního souhrnu a zkušební upozornění.
 * Na iPhonu jde push jen z aplikace přidané na plochu (Sdílet → Přidat na plochu → otevřít MateMax Admin z plochy).
 */
export default function UpozorneniNastaveni({ typy, nazvy, ticheOd, ticheDo, souhrnHodina, zarizeni, demo }: {
  typy: Record<TypUpozorneni, boolean>; nazvy: Record<TypUpozorneni, string>; ticheOd: number; ticheDo: number; souhrnHodina: number;
  zarizeni: { endpoint: string; zarizeni: string; od: string }[]; demo: boolean;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [t, setT] = useState(typy);
  const [od, setOd] = useState(ticheOd), [doo, setDo] = useState(ticheDo), [souhrn, setSouhrn] = useState(souhrnHodina);

  const zapnout = () => start(async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) { toast({ text: "Tenhle prohlížeč upozornění neumí. Na iPhonu nejdřív přidej admin na plochu a otevři ho odtud." }); return; }
      const povoleni = await Notification.requestPermission();
      if (povoleni !== "granted") { toast({ text: "Upozornění nejsou povolená. Povol je v nastavení prohlížeče." }); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY }));
      const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
      const nazev = /iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : /Android/.test(navigator.userAgent) ? "Android" : "Počítač";
      await pridejOdber(json, nazev);
      toast({ text: "Upozornění zapnutá na tomto zařízení" });
    } catch (e) { toast({ text: e instanceof Error ? `Nepovedlo se: ${e.message}` : "Nepovedlo se zapnout upozornění." }); }
  });

  const hodiny = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="a2-karta" data-testid="a2-upozorneni-nastaveni">
      <b>Upozornění na telefon</b>
      <span className="a2-s">Na iPhonu nejdřív přidej admin na plochu (v Safari Sdílet → Přidat na plochu) a otevři ho z plochy, teprve pak jdou upozornění zapnout.</span>
      {zarizeni.length ? zarizeni.map((z) => (
        <span key={z.endpoint} className="a2-radek a2-mezi"><span>{z.zarizeni} · od {new Date(z.od).toLocaleDateString("cs-CZ")}</span><button type="button" className="a2-btn a2-sek a2-male" disabled={pending || demo} onClick={() => start(async () => { await odeberOdber(z.endpoint); toast({ text: "Zařízení odebráno" }); })}>Odebrat</button></span>
      )) : <span className="a2-s">Zatím žádné zařízení.</span>}
      <div className="a2-radek">
        <button type="button" className="a2-btn a2-male" disabled={pending || demo} onClick={zapnout} data-testid="a2-zapnout-upozorneni">Zapnout na tomto zařízení</button>
        <button type="button" className="a2-btn a2-sek a2-male" disabled={pending || demo || !zarizeni.length} onClick={() => start(async () => { const n = await posliZkusebni(); toast({ text: n ? `Zkušební upozornění odešlo (${n})` : "Nic neodešlo. Zkontroluj zařízení a klíče VAPID." }); })}>Poslat zkušební</button>
      </div>
      <form className="a2-sekce" onSubmit={(e) => { e.preventDefault(); start(async () => { await ulozPravidla({ typy: t, ticheOd: od, ticheDo: doo, souhrnHodina: souhrn }); toast({ text: "Uloženo" }); }); }}>
        {(Object.keys(nazvy) as TypUpozorneni[]).map((k) => (
          <label key={k} className="a2-check"><input type="checkbox" id={`up-${k}`} checked={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.checked })} /><span>{nazvy[k]}</span></label>
        ))}
        <div className="a2-radek">
          <label className="a2-pole" style={{ flex: 1 }}>Ticho od<select id="up-od" value={od} onChange={(e) => setOd(Number(e.target.value))}>{hodiny.map((h) => <option key={h} value={h}>{h}:00</option>)}</select></label>
          <label className="a2-pole" style={{ flex: 1 }}>do<select id="up-do" value={doo} onChange={(e) => setDo(Number(e.target.value))}>{hodiny.map((h) => <option key={h} value={h}>{h}:00</option>)}</select></label>
          <label className="a2-pole" style={{ flex: 1 }}>Souhrn v<select id="up-souhrn" value={souhrn} onChange={(e) => setSouhrn(Number(e.target.value))}>{hodiny.map((h) => <option key={h} value={h}>{h}:00</option>)}</select></label>
        </div>
        <button type="submit" className="a2-btn a2-sek a2-male" style={{ alignSelf: "flex-start" }} disabled={pending || demo}>Uložit</button>
      </form>
    </div>
  );
}
