"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Nastavení e-mailů z odkazu v patičce (bez přihlášení, odkaz je podepsaný). Odhlášení se potvrzuje tlačítkem,
 * protože poštovní filtry odkazy otevírají samy. Gmail / Seznam mají vlastní „odhlásit“ přes hlavičku.
 */
export default function EmailyNastaveni() {
  return <Suspense fallback={null}><Obsah /></Suspense>;
}

function Obsah() {
  const q = useSearchParams();
  const u = q.get("u") ?? "";
  const t = q.get("t") ?? "";
  const [stav, setStav] = useState<"vyber" | "posila" | "odhlaseno" | "prihlaseno" | "chyba">("vyber");
  const [chyba, setChyba] = useState("");

  async function nastav(odhlaseno: boolean) {
    setStav("posila");
    try {
      const res = await fetch(`/api/emaily/odhlasit?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ odhlaseno }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setChyba(j.error ?? "Nepodařilo se uložit. Zkus to znovu."); setStav("chyba"); return; }
      setStav(odhlaseno ? "odhlaseno" : "prihlaseno");
    } catch {
      setChyba("Nepodařilo se uložit. Zkontroluj připojení a zkus to znovu.");
      setStav("chyba");
    }
  }

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-10" style={{ background: "#F3F5FA" }}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6 flex flex-col gap-4" style={{ border: "1px solid #E8ECF4" }} data-testid="emaily-nastaveni">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: "#0D1B3E" }}>M²</span>
          <b className="text-lg" style={{ color: "#0D1B3E" }}>E-maily z MateMaxu</b>
        </div>
        {stav === "odhlaseno" ? (
          <>
            <p className="text-sm rounded-2xl p-4" style={{ background: "#ecfdf3", border: "1px solid #bbf0cf", color: "#166534" }} data-testid="emaily-odhlaseno">
              Hotovo. Připomínky a novinky už ti chodit nebudou. Důležité e-maily (třeba zapomenuté heslo) chodí dál.
            </p>
            <button type="button" onClick={() => nastav(false)} className="text-sm font-bold underline self-start" style={{ color: "#5B55D6" }}>Chci je zase dostávat</button>
          </>
        ) : stav === "prihlaseno" ? (
          <p className="text-sm rounded-2xl p-4" style={{ background: "#ecfdf3", border: "1px solid #bbf0cf", color: "#166534" }}>
            Hotovo. Připomínky a novinky ti zase budou chodit, nejvýš dvě týdně.
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: "#33405F" }}>
              Hexík ti občas pošle připomínku tréninku nebo novinku, nejvýš dvě týdně. Když je nechceš, odhlas se tady. Důležité e-maily (třeba zapomenuté heslo) chodí dál.
            </p>
            {stav === "chyba" && <p className="text-sm rounded-xl px-3 py-2" style={{ background: "#fff4f2", border: "1px solid #f7cdc6", color: "#9a2b1c" }}>{chyba}</p>}
            <button type="button" onClick={() => nastav(true)} disabled={!u || !t || stav === "posila"} className="w-full py-3.5 rounded-2xl font-extrabold text-white disabled:opacity-50" style={{ background: "#0D1B3E" }} data-testid="emaily-odhlasit">
              {stav === "posila" ? "Ukládám…" : "Odhlásit připomínky a novinky"}
            </button>
            <button type="button" onClick={() => nastav(false)} disabled={!u || !t || stav === "posila"} className="w-full py-3 rounded-2xl font-bold disabled:opacity-50" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}>
              Nechat je chodit
            </button>
          </>
        )}
        <Link href="/" className="text-sm underline" style={{ color: "#5B55D6" }}>Otevřít MateMax</Link>
      </div>
    </main>
  );
}
