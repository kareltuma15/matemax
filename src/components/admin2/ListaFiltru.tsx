"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Lišta filtrů (KO-06): období (Dnes, 7, 30, 90 dní, vlastní) se srovnáním s předchozím stejně dlouhým
 * obdobím, třída a zdroj. Všechno je v adrese, takže filtr přežije obnovení, sdílení odkazu i tlačítko zpět.
 */
const OBDOBI: [string, string][] = [["dnes", "Dnes"], ["7", "7 dní"], ["30", "30 dní"], ["90", "90 dní"], ["vlastni", "Vlastní"]];

export default function ListaFiltru({ zdroje, popis }: { zdroje: { kod: string; nazev: string }[]; popis: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const nastav = (zmeny: Record<string, string | null>) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(zmeny)) { if (v === null || v === "") q.delete(k); else q.set(k, v); }
    router.push(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };
  const obdobi = sp.get("obdobi") ?? "7";
  const trida = sp.get("trida") ?? "";
  return (
    <div className="a2-sekce" data-testid="a2-filtry">
      <div className="a2-cipy" role="group" aria-label="Období">
        {OBDOBI.map(([k, n]) => <button key={k} type="button" className="a2-cip" aria-pressed={obdobi === k} onClick={() => nastav({ obdobi: k === "7" ? null : k, ...(k !== "vlastni" ? { od: null, do: null } : {}) })}>{n}</button>)}
      </div>
      {obdobi === "vlastni" && (
        <div className="a2-radek">
          <label className="a2-pole" style={{ flex: 1 }}>Od<input type="date" id="filtr-od" defaultValue={sp.get("od") ?? ""} onChange={(e) => nastav({ od: e.target.value })} /></label>
          <label className="a2-pole" style={{ flex: 1 }}>Do<input type="date" id="filtr-do" defaultValue={sp.get("do") ?? ""} onChange={(e) => nastav({ do: e.target.value })} /></label>
        </div>
      )}
      <div className="a2-radek">
        <div className="a2-cipy" role="group" aria-label="Třída">
          {[["", "Obě třídy"], ["5", "5. třída"], ["9", "9. třída"]].map(([k, n]) => <button key={k} type="button" className="a2-cip" aria-pressed={trida === k} onClick={() => nastav({ trida: k || null })}>{n}</button>)}
        </div>
        {zdroje.length > 0 && (
          <select aria-label="Zdroj" id="filtr-zdroj" value={sp.get("zdroj") ?? ""} onChange={(e) => nastav({ zdroj: e.target.value || null })} style={{ width: "auto", minWidth: 0, flex: "1 1 160px" }}>
            <option value="">Všechny zdroje</option>
            {zdroje.map((z) => <option key={z.kod} value={z.kod}>{z.nazev}</option>)}
          </select>
        )}
      </div>
      <span className="a2-s">{popis}</span>
    </div>
  );
}
