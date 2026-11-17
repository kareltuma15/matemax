import { DENNI_STROP, ZA_MISI, ZA_TRENINK, ZA_BOD_ODHADU, ZA_BOSSE } from "@/lib/sbirka";
import { krystalyZaUroven } from "@/lib/urovne";

/** Za co jsou krystaly: jedna přehledná tabulka místo odstavce (vše jen za učení). */
const RADKY: { ikona: string; co: string; kolik: string }[] = [
  { ikona: "✅", co: "Správná odpověď", kolik: "+2 (těžký příklad +4)" },
  { ikona: "🏁", co: "Dokončený trénink", kolik: `+${ZA_TRENINK} a denní truhla` },
  { ikona: "🎯", co: "Každá denní mise", kolik: `+${ZA_MISI}` },
  { ikona: "📈", co: "Nový bod v odhadu", kolik: `+${ZA_BOD_ODHADU}` },
  { ikona: "⭐", co: "Nová XP úroveň", kolik: `+${krystalyZaUroven(2)} a víc` },
  { ikona: "👾", co: "Poražený Boss týdne", kolik: `+${ZA_BOSSE}` },
];

export default function JakZiskat({ kompaktni = false }: { kompaktni?: boolean }) {
  return (
    <div className={kompaktni ? "flex flex-col gap-2" : "mm-karta p-4 flex flex-col gap-2"} data-testid="jak-ziskat">
      {!kompaktni && <p className="font-black" style={{ color: "var(--text-primary)" }}>Jak získat krystaly</p>}
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {RADKY.map((r) => (
          <li key={r.co} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm" style={{ background: "#F3F4FB" }}>
            <span className="text-lg shrink-0" aria-hidden="true">{r.ikona}</span>
            <span className="flex-1 min-w-0" style={{ color: "#33405F" }}>{r.co}</span>
            <b className="shrink-0 flex items-center gap-1" style={{ color: "#0D1B3E" }}><i className="hx-krystal" aria-hidden="true" />{r.kolik}</b>
          </li>
        ))}
      </ul>
      <p className="text-xs" style={{ color: "#5F6982" }}>
        Za učení nejvýš {DENNI_STROP} krystalů denně. Krystaly jsou jen za správně vyřešené příklady, za rychlé klikání nejsou. Nic se nekupuje za peníze.
      </p>
    </div>
  );
}
