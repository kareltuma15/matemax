"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Druhý faktor pro admin (SY-01): TOTP v Supabase (zdarma). Zapnutí = naskenovat QR kód do aplikace
 * v telefonu a opsat kód. Ověření = zadat kód při přihlášení (relace se zvýší na aal2).
 */
type Faktor = { id: string; friendly_name?: string; status: string; created_at: string };

export function ZapnutiFaktoru() {
  const router = useRouter();
  const [faktory, setFaktory] = useState<Faktor[] | null>(null);
  const [qr, setQr] = useState<{ id: string; svg: string; secret: string } | null>(null);
  const [kod, setKod] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setChyba(error.message); return; }
    setFaktory((data?.totp ?? []) as Faktor[]);
  }, []);
  useEffect(() => { void nacti(); }, [nacti]); // eslint-disable-line react-hooks/set-state-in-effect

  const zacni = async () => {
    if (!supabase) return;
    setChyba(null);
    // Nedokončené pokusy (bez ověření) by bránily novému zápisu
    for (const f of faktory ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `MateMax Admin ${new Date().toLocaleDateString("cs-CZ")}` });
    if (error || !data) { setChyba(error?.message ?? "Nepovedlo se"); return; }
    setQr({ id: data.id, svg: data.totp.qr_code, secret: data.totp.secret });
  };
  const over = async () => {
    if (!supabase || !qr) return;
    setChyba(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: qr.id, code: kod.trim() });
    if (error) { setChyba("Kód nesedí. Zkontroluj čas v telefonu a opiš aktuální kód."); return; }
    setQr(null); setKod(""); setHotovo("Druhý faktor je zapnutý. Při příštím přihlášení do adminu zadáš kód z aplikace."); await nacti(); router.refresh();
  };
  const odeber = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) { setChyba(error.message); return; }
    await nacti(); router.refresh();
  };

  const overene = (faktory ?? []).filter((f) => f.status === "verified");
  return (
    <div className="a2-sekce" data-testid="a2-mfa">
      {chyba && <div className="a2-banner mfa">{chyba}</div>}
      {hotovo && <div className="a2-banner" style={{ background: "var(--a-ok-slaby)", color: "var(--a-ok)" }}>{hotovo}</div>}
      <div className="a2-karta">
        <b>{overene.length ? "Druhý faktor je zapnutý ✓" : "Druhý faktor je vypnutý"}</b>
        {overene.map((f) => (
          <span key={f.id} className="a2-radek a2-mezi"><span className="a2-s">{f.friendly_name ?? "Aplikace"} · od {new Date(f.created_at).toLocaleDateString("cs-CZ")}</span>
            <button type="button" className="a2-btn a2-sek a2-male" onClick={() => odeber(f.id)}>Odebrat</button></span>
        ))}
        {!qr && !overene.length && <button type="button" className="a2-btn" style={{ alignSelf: "flex-start" }} onClick={zacni} disabled={faktory === null}>Zapnout druhý faktor</button>}
      </div>
      {qr && (
        <form className="a2-karta" onSubmit={(e) => { e.preventDefault(); void over(); }}>
          <b>1. Naskenuj QR kód aplikací v telefonu</b>
          <span className="a2-s">Google Authenticator, Microsoft Authenticator nebo 1Password.</span>
          {/* QR kód ze Supabase je SVG jako data URL */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.svg} alt="QR kód pro aplikaci s kódy" width={200} height={200} style={{ background: "#fff", borderRadius: 12, padding: 8 }} />
          <span className="a2-s">Nejde skenovat? Zadej ručně klíč: <code style={{ wordBreak: "break-all" }}>{qr.secret}</code></span>
          <b>2. Opiš šestimístný kód z aplikace</b>
          <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={kod} onChange={(e) => setKod(e.target.value.replace(/\D/g, ""))} aria-label="Kód z aplikace" id="mfa-kod" required />
          <button type="submit" className="a2-btn" disabled={kod.length !== 6}>Ověřit a zapnout</button>
        </form>
      )}
    </div>
  );
}

export function OvereniFaktoru() {
  const router = useRouter();
  const [kod, setKod] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const over = async () => {
    if (!supabase) return;
    setPending(true); setChyba(null);
    const { data } = await supabase.auth.mfa.listFactors();
    const f = data?.totp?.find((x) => x.status === "verified");
    if (!f) { setChyba("Žádný ověřený faktor. Otevři Zabezpečení."); setPending(false); return; }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: f.id, code: kod.trim() });
    setPending(false);
    if (error) { setChyba("Kód nesedí. Opiš aktuální kód z aplikace."); return; }
    router.replace("/admin/novy"); router.refresh();
  };
  return (
    <form className="a2-karta" onSubmit={(e) => { e.preventDefault(); void over(); }} data-testid="a2-overeni" style={{ maxWidth: 420 }}>
      <b>Ověř druhý faktor</b>
      <span className="a2-s">Zadej šestimístný kód z aplikace v telefonu.</span>
      <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={kod} onChange={(e) => setKod(e.target.value.replace(/\D/g, ""))} aria-label="Kód z aplikace" id="mfa-overeni-kod" autoFocus required />
      {chyba && <span className="a2-s" style={{ color: "var(--a-spatne)" }} role="alert">{chyba}</span>}
      <button type="submit" className="a2-btn" disabled={pending || kod.length !== 6}>Ověřit</button>
    </form>
  );
}
