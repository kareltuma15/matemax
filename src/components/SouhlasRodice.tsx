"use client";

import { useState } from "react";
import { useRodiceDitete } from "@/lib/rodice-ditete";

/**
 * Domov žáka: rodič žádá o propojení (schválený mockup 23. 11., obrazovka 3).
 * Propojení platí až po „Povolit“. „Tohohle neznám“ žádost smaže a rodič se nic nedozví.
 */
export default function SouhlasRodice({ g5 = false }: { g5?: boolean }) {
  const { rodice, akce } = useRodiceDitete();
  const [chyba, setChyba] = useState<string | null>(null);
  const [posila, setPosila] = useState(false);
  const zadost = rodice?.find((r) => r.stav === "ceka_na_tebe");
  if (!zadost) return null;

  async function odpovez(a: "povolit" | "zrusit") {
    if (!zadost) return;
    setPosila(true);
    setChyba(null);
    const err = await akce({ akce: a, id: zadost.id });
    setPosila(false);
    if (err) setChyba(err);
  }

  return (
    <div className="order-1 lg:order-none mm-karta p-4 lg:p-5 flex flex-col gap-3" style={{ border: "2px solid #2E6DA4", background: "linear-gradient(180deg,#f0f6fc,#fff 60%)" }} data-testid="souhlas-rodice">
      <b className="text-base" style={{ color: "#0D1B3E" }}>Rodič chce vidět tvůj pokrok</b>
      <p className="text-sm break-words" style={{ color: "#5F6982" }}>
        Účet <b style={{ color: "#0D1B3E" }}>{zadost.email}</b> žádá o týdenní přehled tvého tréninku:
      </p>
      <ul className="text-sm list-disc pl-5 flex flex-col gap-0.5" style={{ color: "#5F6982" }}>
        <li>kolik příkladů vyřešíš a s jakou úspěšností</li>
        <li>{g5 ? "odhad bodů u přijímaček na gymnázium" : "odhad bodů u přijímaček"}</li>
        <li>témata, která ti jdou a nejdou</li>
      </ul>
      {chyba && <p className="text-[13px] rounded-xl px-3 py-2" style={{ background: "#fff4f2", border: "1px solid #f7cdc6", color: "#9a2b1c" }}>{chyba}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={posila} onClick={() => odpovez("povolit")} className="flex-1 py-3 rounded-2xl font-extrabold text-white disabled:opacity-50" style={{ background: "#0D1B3E" }} data-testid="souhlas-rodice-povolit">Povolit</button>
        <button type="button" disabled={posila} onClick={() => odpovez("zrusit")} className="flex-1 py-3 rounded-2xl font-bold disabled:opacity-50" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF", background: "#fff" }} data-testid="souhlas-rodice-odmitnout">Tohohle neznám</button>
      </div>
      <p className="text-xs" style={{ color: "#8A93AA" }}>Povolení můžeš kdykoli zrušit v profilu.</p>
    </div>
  );
}
