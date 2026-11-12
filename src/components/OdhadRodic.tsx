import type { OdhadDitete } from "@/lib/odhad-server";

/** Odhad bodů dítěte pro rodiče: číslo z 50, posun od minulého reportu, cíl, týdny a body po tématech. */
export default function OdhadRodic({ odhad: o, jmeno }: { odhad: OdhadDitete; jmeno: string }) {
  if (o.bezDat) {
    return (
      <div className="rounded-2xl p-4" style={{ background: "#F4F3FF", border: "1px solid #DCDAFB" }} data-testid="odhad-rodic">
        <p className="font-extrabold" style={{ color: "#0D1B3E" }}>Odhad bodů zatím nemáme</p>
        <p className="text-sm mt-1" style={{ color: "#5F6982" }}>
          Až {jmeno} udělá vstupní diagnostiku nebo vyřeší první příklady, uvidíte tady, kolik bodů by teď u přijímaček získal/a.
        </p>
      </div>
    );
  }
  const sloupce = [...o.tydny.slice(-7).map((z) => ({ klic: z.d, b: z.b, popis: `${Number(z.d.slice(8, 10))}. ${Number(z.d.slice(5, 7))}.`, ted: false })), { klic: "ted", b: o.celkem, popis: "teď", ted: true }];
  return (
    <div className="flex flex-col gap-3" data-testid="odhad-rodic">
      <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(160deg, #1B2A5C, #0D1B3E)" }}>
        <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#C9C7F5" }}>Odhad bodů u přijímaček</p>
        <p className="mt-1 leading-none">
          <span className="text-5xl font-black">{o.celkem}</span>
          <span className="text-lg font-bold" style={{ color: "#C9C7F5" }}> z {o.max} bodů</span>
        </p>
        <div className="relative mt-4 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.16)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.max(3, (o.celkem / o.max) * 100)}%`, background: "#F5A623" }} />
          {o.cil && <div className="absolute -top-1 h-[18px] w-0.5 rounded bg-white" style={{ left: `${(o.cil / o.max) * 100}%` }} title={`cíl ${o.cil} b.`} />}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
          {o.zmena !== null && (
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold" style={o.zmena > 0 ? { background: "#E2F4E9", color: "#14753A" } : o.zmena < 0 ? { background: "#FDECEC", color: "#B4232F" } : { background: "rgba(255,255,255,0.14)", color: "#fff" }}>
              {o.zmena > 0 ? `▲ +${o.zmena}` : o.zmena < 0 ? `▼ ${o.zmena}` : "beze změny"} od minulého týdne
            </span>
          )}
          {o.cil && <span style={{ color: "#D9D8FE" }}>🎯 cíl {o.cil} b.{o.cil > o.celkem ? `, chybí ${o.cil - o.celkem}` : ", splněno"}</span>}
        </div>
        {sloupce.length >= 2 && (
          <div className="flex items-end gap-2 mt-4 h-24" aria-label="Odhad po týdnech">
            {sloupce.map((s) => (
              <div key={s.klic} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="text-[11px] font-extrabold">{s.b}</span>
                <div className="w-full max-w-[28px] rounded-t-md" style={{ height: `${Math.max(6, (s.b / o.max) * 100)}%`, background: s.ted ? "#F5A623" : "#8D89E8" }} />
                <span className="text-[10px]" style={{ color: "#C9C7F5" }}>{s.popis}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {o.nejvicBodu && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: "#FFF6E5", border: "1px solid #F8D9A0", color: "#4A3500" }}>
          💡 Nejvíc bodů může {jmeno} přidat v tématu <b>{o.nejvicBodu.label}</b> (zbývá až {o.nejvicBodu.chybi} b.).
        </div>
      )}
      <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #E4E6EF" }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Body podle témat</p>
        {o.temata.map((t) => {
          const pct = t.max ? t.body / t.max : 0;
          return (
            <div key={t.tema} className="py-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold" style={{ color: "#0D1B3E" }}>{t.label}</span>
                <span style={{ color: "#5F6982" }}><b style={{ color: "#0D1B3E" }}>{String(t.body).replace(".", ",")}</b> / {t.max} b.</span>
              </div>
              <div className="h-1.5 rounded-full mt-1.5" style={{ background: "#EEF0F6" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(3, pct * 100)}%`, background: pct >= 0.7 ? "#1F9D55" : pct >= 0.4 ? "#F5A623" : "#E0565B" }} />
              </div>
            </div>
          );
        })}
        <p className="text-xs mt-2" style={{ color: "#8A93AA" }}>Odhad je orientační: počítá se z úspěšnosti v appce a z toho, kolik bodů za téma bývá v testu.</p>
      </div>
    </div>
  );
}
