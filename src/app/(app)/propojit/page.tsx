"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { povolenyNavrat, platnyState, navratUrl } from "@/lib/vysledky";
import Hexik from "@/components/hexik/Hexik";

/**
 * Propojení účtu s appkou Vyhodnocení testů (krok 2 a 3).
 * GET /propojit?klient=vysledky&state=…&navrat=… → tlačítko Propojit → navrat?state=…&code=… (nebo chyba=odmitnuto).
 * Kód vytváří server (/api/vysledky/propojeni/zalozit); tady se jen ptáme a přesměrujeme.
 *
 * Krok 3 (osobní QR, Karel 19. 11. 2026): bez zaškrtávání souhlasu. Rodič je informován větou v připomínce
 * a e-mailem po propojení s odkazem na zrušení. Z QR přijde navíc uvod=qr (úvod pro žáka), g=m5|m9
 * (třída z přihlášky, předvyplní se v registraci) a test=RRRR-MM-DD (den testu do úvodu).
 */
function denTestu(test: string | null): string | null {
  if (!test || !/^\d{4}-\d{2}-\d{2}$/.test(test)) return null;
  return `${Number(test.slice(8, 10))}. ${Number(test.slice(5, 7))}.`;
}

function Propojit() {
  const params = useSearchParams();
  const klient = params.get("klient");
  const state = params.get("state");
  const navrat = params.get("navrat");
  const zQr = params.get("uvod") === "qr";
  const g = params.get("g");
  const trida = g === "m5" ? 5 : g === "m9" ? 9 : null;
  const den = denTestu(params.get("test"));
  // Server hlídá i to, že se z produkce nevrací na localhost; tady stačí obě povolené adresy.
  const platne = klient === "vysledky" && platnyState(state) && povolenyNavrat(navrat, false);

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [odesilam, setOdesilam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setSession(null); return; } // eslint-disable-line react-hooks/set-state-in-effect
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  const zde = `/propojit?${params.toString()}`;

  if (!platne) {
    return (
      <Karta>
        <h1 className="text-xl font-extrabold" style={{ color: "#0D1B3E" }}>Odkaz na propojení není platný</h1>
        <p className="text-sm" style={{ color: "#4A5470" }}>Vrať se do appky Testy nanečisto a klikni na „Propojit s MateMaxem“ znovu.</p>
        <Link href="/" className="self-start px-4 py-2.5 rounded-xl text-sm font-extrabold text-white mm-tlacitko" style={{ background: "#0D1B3E" }}>Do MateMaxu</Link>
      </Karta>
    );
  }

  if (session === undefined) return <div className="skeleton rounded-[22px] max-w-xl mx-auto w-full" style={{ height: 260 }} />;

  const registrace = `/registrace?next=${encodeURIComponent(zde)}${trida ? `&trida=${trida}` : ""}`;

  if (!session && zQr) {
    return (
      <Karta testid="propojit-uvod-qr">
        <div className="flex items-center gap-3">
          <Hexik podoba="klasik" etapa={3} d3 className="w-24 h-24 shrink-0" />
          <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#A66300" }}>
            Test nanečisto{den ? ` ${den}` : ""}{trida ? ` · ${trida}. třída` : ""}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: "#0D1B3E" }}>Ahoj! Tady budou tvoje výsledky z testu</h1>
        <p className="text-[15px] leading-relaxed" style={{ color: "#4A5470" }}>
          Po testu ti sem přijdou body po tématech, plán do dalšího testu a Truhla Generálka. Do testu si můžeš zatrénovat.
        </p>
        <div className="flex flex-col gap-2">
          <Link href={registrace} className="py-3.5 rounded-2xl text-center font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }} data-testid="propojit-qr-registrace">
            Vytvořit účet zdarma
          </Link>
          <Link href={`/prihlaseni?next=${encodeURIComponent(zde)}`} className="py-3.5 rounded-2xl text-center font-extrabold text-white mm-tlacitko" style={{ background: "#0D1B3E" }}>
            Už mám účet, přihlásit
          </Link>
        </div>
        {trida && <p className="text-xs text-center" style={{ color: "#5F6982" }}>Třídu už známe z testu, nic dalšího vyplňovat nemusíš.</p>}
      </Karta>
    );
  }

  if (!session) {
    return (
      <Karta testid="propojit-prihlas">
        <h1 className="text-xl font-extrabold" style={{ color: "#0D1B3E" }}>Propojení s Testy nanečisto</h1>
        <p className="text-sm" style={{ color: "#4A5470" }}>
          Nejdřív se přihlas do MateMaxu účtem dítěte. Kdo ještě účet nemá, založí si ho a propojení pak dokončí.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={registrace} className="flex-1 py-3.5 rounded-2xl text-center font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }}>
            Zaregistrovat se
          </Link>
          <Link href={`/prihlaseni?next=${encodeURIComponent(zde)}`} className="flex-1 py-3.5 rounded-2xl text-center font-extrabold text-white mm-tlacitko" style={{ background: "#0D1B3E" }}>
            Už mám účet
          </Link>
        </div>
      </Karta>
    );
  }

  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const kdo = (typeof meta.first_name === "string" && meta.first_name) || session.user.email || "";

  async function propojit() {
    if (!supabase || !session) return;
    setOdesilam(true);
    setChyba(null);
    try {
      const res = await fetch("/api/vysledky/propojeni/zalozit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ state, navrat }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setChyba("Propojení se nepovedlo. Zkus to prosím za chvíli znovu.");
    } catch {
      setChyba("Propojení se nepovedlo. Zkontroluj připojení a zkus to znovu.");
    }
    setOdesilam(false);
  }

  function odmitnout() {
    window.location.href = navratUrl(navrat as string, state as string, { chyba: "odmitnuto" });
  }

  return (
    <Karta testid="propojit-souhlas">
      <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#A66300" }}>{zQr && den ? `Test nanečisto ${den}` : "Propojení účtů"}</span>
      <h1 className="text-xl lg:text-2xl font-extrabold" style={{ color: "#0D1B3E" }}>{zQr ? "Propojit MateMax s výsledky z testů" : "Propojit MateMax s Testy nanečisto"}</h1>
      <p className="text-[15px] leading-relaxed" style={{ color: "#4A5470" }} data-testid="propojit-info">
        Testy nanečisto Matematika Snadno budou do MateMaxu posílat body z testů po tématech. MateMax pošle zpátky
        jen souhrn, kolik a co jsi procvičil(a). Jméno ani e-mail se nepředávají. Rodič dostane e-mail, že se účty
        propojily, a propojení jde kdykoli zrušit v profilu.
      </p>
      {kdo && <p className="text-sm" style={{ color: "#5F6982" }}>Propojí se účet: <b style={{ color: "#0D1B3E" }}>{kdo}</b></p>}
      {chyba && <p className="text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: "#FDECEC", color: "#B42318" }}>{chyba}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={propojit} disabled={odesilam} className="flex-1 py-3.5 rounded-2xl font-extrabold mm-tlacitko disabled:opacity-50" style={{ background: "#F5A623", color: "#0D1B3E" }} data-testid="propojit-tlacitko">
          {odesilam ? "Propojuji…" : "Propojit"}
        </button>
        <button type="button" onClick={odmitnout} disabled={odesilam} className="flex-1 py-3.5 rounded-2xl font-extrabold" style={{ background: "#EEF1F6", color: "#0D1B3E" }}>
          Zrušit
        </button>
      </div>
    </Karta>
  );
}

function Karta({ children, testid }: { children: React.ReactNode; testid?: string }) {
  return (
    <div className="px-4 py-6 lg:py-10">
      <div className="mm-karta p-5 lg:p-7 max-w-xl mx-auto w-full flex flex-col gap-4" data-testid={testid}>{children}</div>
    </div>
  );
}

export default function PropojitPage() {
  return (
    <Suspense fallback={null}>
      <Propojit />
    </Suspense>
  );
}
