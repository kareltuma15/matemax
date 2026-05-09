"use client";

import { getDaysUntilCermat, getCermatUrgency } from "@/lib/cermat-date";

interface Props {
  variant?: "compact" | "full";
}

export default function CountdownBanner({ variant = "compact" }: Props) {
  const days = getDaysUntilCermat();
  const { label, color, bg, border, emoji } = getCermatUrgency(days);

  if (variant === "compact") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <span className="text-lg shrink-0">{emoji}</span>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-extrabold" style={{ color }}>
            {days} dní
          </span>
          <span className="text-sm text-slate-500">do přijímaček</span>
          <span className="text-xs font-semibold" style={{ color }}>· {label}</span>
        </div>
      </div>
    );
  }

  // full variant
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: bg, border: `2px solid ${border}` }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0"
          style={{ background: `${color}18`, border: `1.5px solid ${border}` }}
        >
          {emoji}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color }}>
            Přijímačky CERMAT
          </p>
          <p className="text-3xl font-extrabold leading-tight" style={{ color }}>
            {days} dní
          </p>
          <p className="text-sm font-semibold mt-0.5 text-slate-600">{label}</p>
        </div>
      </div>
      {days <= 180 && (
        <p className="text-xs text-slate-500 mt-3 leading-relaxed border-t pt-3" style={{ borderColor: border }}>
          {days <= 30
            ? "Každý den se počítá! Zaměř se na svá nejslabší témata."
            : days <= 90
            ? `Za ${days} dní máš přijímačky. ${Math.round(days * 7)} příkladů navíc dělá obrovský rozdíl.`
            : `Máš ${Math.floor(days / 7)} týdnů. Pravidelný trénink 10 min/den = připravenost.`}
        </p>
      )}
    </div>
  );
}
