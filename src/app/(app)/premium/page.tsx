"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePremium } from "@/lib/premium";
import { useTrida } from "@/lib/trida";

/**
 * Premium = proč se vyplatí. Rozdělené na Pro tebe a Pro rodiče, ať důvod koupit vidí žák i rodič,
 * srovnání Zdarma / Premium v jedné tabulce a cena hned u tlačítka. Sem vedou všechny Premium karty.
 * Ceny jen z ověřených faktů (Premium 99 Kč měsíčně).
 */
export default function PremiumPage() {
  const router = useRouter();
  const { isPremium } = usePremium();
  const { trida, ready } = useTrida();
  const [stav, setStav] = useState<"idle" | "loading" | "error">("idle");

  async function zaplatit() {
    if (!supabase) { router.push("/registrace?next=/premium"); return; }
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push("/prihlaseni?next=/premium"); return; }
    setStav("loading");
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` } });
      if (!res.ok) throw new Error("checkout");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setStav("error");
    }
  }

  if (!ready) return null;
  const g5 = trida === 5;
  const vse = g5 ? "Všech 8 okruhů" : "Všech 9 témat";
  const radky: [string, boolean][] = [
    [vse, false],
    [g5 ? "3 okruhy na vyzkoušení" : "3 témata na vyzkoušení", true],
    ["Testové příklady ve všech tématech", false],
    ["Týdenní report pro rodiče", false],
    ["XP, streak a odznaky", true],
    ["Všechny odznaky a výzvy", false],
  ];
  const karta = "bg-white rounded-[18px] p-4 flex flex-col gap-1.5";

  return (
    <div className="flex flex-col gap-3.5 max-w-xl mx-auto w-full" data-testid="premium">
      <button type="button" onClick={() => router.back()} className="self-start text-sm font-bold" style={{ color: "#5F6982" }}>← Zpět</button>

      <div className="rounded-[20px] p-4 flex flex-col gap-2.5 text-white" style={{ background: "linear-gradient(160deg, #1B2A5C, #0D1B3E)" }}>
        <span className="self-start text-[11px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "#F5A623", color: "#0D1B3E" }}>MateMax Premium</span>
        <h1 className="text-[23px] font-extrabold leading-tight">Celá příprava na přijímačky v jedné appce</h1>
        <span className="text-[13px]" style={{ color: "#D9D8FE" }}>99 Kč měsíčně</span>
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider mt-1" style={{ color: "#8A93AA" }}>Pro tebe</span>
      <div className={karta} style={{ border: "1px solid #E4E6EF" }}>
        <b style={{ color: "#0D1B3E" }}>📚 {vse}</b>
        <span className="text-sm" style={{ color: "#5F6982" }}>
          {g5 ? "Všechny úlohy ve všech okruzích" : "Přes 1 200 úloh ve stylu CERMAT"}, každé téma rozdělené na dovednosti.
        </span>
      </div>
      <div className={karta} style={{ border: "1px solid #E4E6EF" }}>
        <b style={{ color: "#0D1B3E" }}>🎯 Testové příklady jako u přijímaček</b>
        <span className="text-sm" style={{ color: "#5F6982" }}>V každém tématu úlohy ve stylu CERMAT: úvaha, obrázky, výběr A–E.</span>
      </div>
      <div className={karta} style={{ border: "1px solid #E4E6EF" }}>
        <b style={{ color: "#0D1B3E" }}>📈 Přehled, kolik bodů bys teď získal</b>
        <span className="text-sm" style={{ color: "#5F6982" }}>Odhad bodů u přijímaček ze všech témat a kde se ti trénink vyplatí nejvíc.</span>
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider mt-1" style={{ color: "#8A93AA" }}>Pro rodiče</span>
      <div className={karta} style={{ border: "1px solid #E4E6EF" }}>
        <b style={{ color: "#0D1B3E" }}>📧 Report každé pondělí</b>
        <span className="text-sm" style={{ color: "#5F6982" }}>Kolik dítě vyřešilo, kde má mezery a co procvičit dál. Bez zkoušení u večeře.</span>
      </div>

      <table className="w-full text-sm bg-white rounded-[16px] overflow-hidden" style={{ borderCollapse: "collapse" }} data-testid="srovnani">
        <thead>
          <tr className="text-xs" style={{ color: "#5F6982" }}>
            <th className="text-left p-2.5" />
            <th className="p-2.5 w-[70px]">Zdarma</th>
            <th className="p-2.5 w-[70px]">Premium</th>
          </tr>
        </thead>
        <tbody>
          {radky.map(([nazev, zdarma]) => (
            <tr key={nazev} style={{ borderTop: "1px solid #E4E6EF" }}>
              <td className="p-2.5" style={{ color: "#0D1B3E" }}>{nazev}</td>
              <td className="p-2.5 text-center font-extrabold" style={{ color: zdarma ? "#14753A" : "#A0A8BD" }} aria-label={zdarma ? "ano" : "ne"}>{zdarma ? "✓" : "–"}</td>
              <td className="p-2.5 text-center font-extrabold" style={{ color: "#14753A" }} aria-label="ano">✓</td>
            </tr>
          ))}
        </tbody>
      </table>

      {isPremium ? (
        <div className="flex flex-col gap-2">
          <div className="w-full py-3.5 rounded-2xl text-center text-base font-extrabold" style={{ background: "#E2F4E9", color: "#14753A" }}>Premium máš aktivní ✓</div>
          <Link href="/cenik" className="text-center text-sm font-semibold" style={{ color: "#4741B8" }}>Spravovat předplatné</Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={zaplatit}
          disabled={stav === "loading"}
          className="w-full py-3.5 rounded-2xl text-base font-extrabold press-scale disabled:opacity-70"
          style={{ background: "#F5A623", color: "#0D1B3E" }}
        >
          {stav === "loading" ? "Otevírám platbu…" : "Pokračovat k platbě · 99 Kč/měs."}
        </button>
      )}
      {stav === "error" && <p className="text-sm text-center" style={{ color: "#B4232F" }}>Platbu se nepodařilo otevřít. Zkus to prosím za chvíli.</p>}
      <p className="text-[13px] text-center" style={{ color: "#5F6982" }}>Platba kartou přes Stripe. Pokrok ti zůstane, i když předplatné zrušíš.</p>
    </div>
  );
}
