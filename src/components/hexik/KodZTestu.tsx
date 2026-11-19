"use client";

import { useEffect, useState } from "react";
import { VYSLEDKY_QR, normalizujKod, platnyKod } from "@/lib/vysledky";

/**
 * Osobní kód z testu nanečisto (dohoda s Vyhodnocením 19. 11. 2026): pro děti, které nemají čím
 * naskenovat QR z letáčku. Kód se jen převede na velká písmena bez mezer a pomlček a přesměruje
 * na Vyhodnocení (/q/<kód>), které ho ověří a pošle zpátky na /propojit stejně jako po QR.
 */
export function MamKodZTestu({ varianta = "formular", otevreno = false }: { varianta?: "formular" | "domov"; otevreno?: boolean }) {
  const [otevrit, setOtevrit] = useState(otevreno);
  const [kod, setKod] = useState("");
  const [chyba, setChyba] = useState(false);

  function odeslat(e: React.FormEvent) {
    e.preventDefault();
    const k = normalizujKod(kod);
    if (!platnyKod(k)) { setChyba(true); return; }
    window.location.href = VYSLEDKY_QR + k;
  }

  if (!otevrit) {
    return (
      <button
        type="button"
        onClick={() => setOtevrit(true)}
        className={varianta === "domov"
          ? "mm-karta w-full flex items-center gap-3 px-4 py-3 text-left mm-klik"
          : "w-full py-3 rounded-xl text-sm font-bold border mm-klik"}
        style={varianta === "domov" ? undefined : { borderColor: "var(--border-color, #E4E6EF)", color: "#2E6DA4", background: "transparent" }}
        data-testid="kod-z-testu"
      >
        {varianta === "domov" ? (
          <>
            <span className="text-2xl" aria-hidden="true">📝</span>
            <span className="min-w-0 flex-1">
              <b className="block text-[15px]" style={{ color: "#0D1B3E" }}>Mám kód z testu</b>
              <span className="block text-[13px]" style={{ color: "#5F6982" }}>Kód z letáčku z testu nanečisto, když nemáš čím naskenovat QR.</span>
            </span>
          </>
        ) : "📝 Mám kód z testu"}
      </button>
    );
  }

  return (
    <form onSubmit={odeslat} className={varianta === "domov" ? "mm-karta p-4 flex flex-col gap-2" : "flex flex-col gap-2"} data-testid="kod-z-testu-formular">
      <label htmlFor="kod-z-testu-pole" className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Kód z letáčku z testu nanečisto</label>
      <div className="flex gap-2">
        <input
          id="kod-z-testu-pole"
          value={kod}
          onChange={(e) => { setKod(e.target.value); setChyba(false); }}
          placeholder="K7MQ-4XT9-PR2W"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 px-3 py-3 rounded-xl border text-base font-bold uppercase"
          style={{ borderColor: chyba ? "#B42318" : "var(--border-color, #E4E6EF)", color: "#0D1B3E", background: "#fff" }}
          data-testid="kod-z-testu-pole"
        />
        <button type="submit" className="shrink-0 px-4 rounded-xl font-extrabold text-white mm-tlacitko" style={{ background: "#0D1B3E" }} data-testid="kod-z-testu-odeslat">
          Pokračovat
        </button>
      </div>
      {chyba && <p className="text-sm font-semibold" style={{ color: "#B42318" }} data-testid="kod-z-testu-chyba">Kód má 12 znaků, třeba <span className="whitespace-nowrap">K7MQ-4XT9-PR2W</span>. Zkontroluj ho.</p>}
    </form>
  );
}

/**
 * Neplatný nebo prošlý kód: Vyhodnocení přesměruje na /?z=qr&kod=neplatny. Ukáže krátkou hlášku,
 * pole na kód (zkusit znovu) a uklidí adresu.
 */
export function KodNeplatnyHlaska({ style }: { style?: React.CSSProperties } = {}) {
  const [neplatny, setNeplatny] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("kod") !== "neplatny") return;
    setNeplatny(true); // eslint-disable-line react-hooks/set-state-in-effect
    p.delete("kod"); p.delete("z");
    const zbytek = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (zbytek ? `?${zbytek}` : "") + window.location.hash);
  }, []);
  if (!neplatny) return null;
  return (
    <div className="rounded-[20px] p-4 flex flex-col gap-3" style={{ background: "#FDECEC", border: "1.5px solid #F5B5B5", ...style }} role="alert" data-testid="kod-neplatny">
      <b className="text-[16px]" style={{ color: "#8A1C1C" }}>Tenhle kód neplatí. Zkontroluj ho, nebo se zeptej rodičů.</b>
      <MamKodZTestu otevreno />
    </div>
  );
}
