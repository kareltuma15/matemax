"use client";
import { useState } from "react";

interface Props {
  streak?: number;
  xp?: number;
  name?: string;
  score?: string; // e.g. "8/10"
  mode?: "streak" | "session";
  label?: string;
  compact?: boolean;
}

const BASE_URL = "https://matemax.matematika-snadno.cz";

export default function ShareButton({
  streak = 0, xp = 0, name = "", score, mode = "streak",
  label, compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  const params = new URLSearchParams();
  if (streak > 0) params.set("streak", String(streak));
  if (xp > 0) params.set("xp", String(xp));
  if (name) params.set("name", name.split(" ")[0]);
  if (score) params.set("score", score);
  params.set("mode", mode);

  const shareUrl = `${BASE_URL}`;
  const imageUrl = `${BASE_URL}/api/share-card?${params.toString()}`;

  const shareText =
    mode === "session" && score
      ? `Právě jsem dal/a ${score} správně na MateMax! 🎯 Přijímačky, čekejte. ${shareUrl}`
      : streak >= 7
      ? `${streak} dní v řadě matematiky na MateMax! 🔥 ${shareUrl}`
      : `Trénuji matematiku každý den na MateMax! 📚 ${shareUrl}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, url: shareUrl });
        return;
      } catch { /* user cancelled or not supported */ }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
        style={{ background: "#f1f5f9", color: "#64748b" }}
      >
        {copied ? "✅ Zkopírováno!" : "📤 Sdílet"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Preview card */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Share card"
        className="w-full rounded-2xl shadow-md"
        style={{ maxWidth: 400, aspectRatio: "1200/630", objectFit: "cover" }}
      />
      <button
        type="button"
        onClick={handleShare}
        className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg,#0D1B3E,#2E6DA4)", color: "white" }}
      >
        {copied ? "✅ Zkopírováno do schránky!" : `📤 ${label ?? "Sdílet výsledek"}`}
      </button>
    </div>
  );
}
