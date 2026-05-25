"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BENEFITS = [
  { icon: "🧮", title: "Všech 9 témat CERMAT", desc: "Geometrie, mocniny, slovní úlohy, číselné řady a další" },
  { icon: "♾️", title: "Neomezený počet příkladů", desc: "500+ příkladů, nové přibývají každý měsíc" },
  { icon: "🧠", title: "Adaptivní SM-2 algoritmus", desc: "Systém tě vrací k tomu, co ti nejde — automaticky" },
  { icon: "📊", title: "Týdenní report pro rodiče", desc: "Každé pondělí přehled pokroku na email" },
  { icon: "🎯", title: "CERMAT cvičné testy", desc: "Přesné simulace přijímaček na čas" },
  { icon: "🏆", title: "Všechny odznaky a achievementy", desc: "35 odznaků, 5 levelů, XP systém" },
];

export default function PremiumAktivovanPage() {
  const router = useRouter();
  const [showBenefits, setShowBenefits] = useState(false);

  useEffect(() => {
    // Confetti burst
    import("canvas-confetti").then((m) => {
      const confetti = m.default;
      const end = Date.now() + 2500;
      const colors = ["#0D1B3E", "#2E6DA4", "#00B4D8", "#fbbf24"];

      (function frame() {
        confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: "#F8FAFF" }}>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Hero sekce */}
        <div
          className="px-8 pt-10 pb-8 text-center"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <div className="text-6xl mb-4 float">🎉</div>
          <h1 className="text-2xl font-black text-white leading-tight">
            Premium aktivován!
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#93c5fd" }}>
            Vítej v klubu — máš přístup ke všemu.
          </p>

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full text-sm font-black"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" style={{ boxShadow: "0 0 6px #4ade80" }} />
            MateMax Premium · aktivní
          </div>
        </div>

        {/* Výhody */}
        <div className="px-6 py-6">
          <button
            onClick={() => setShowBenefits((v) => !v)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-bold transition-colors"
            style={{ background: "#f1f5f9", color: "#0D1B3E" }}
          >
            <span>Co teď máš k dispozici</span>
            <span className="text-lg" style={{ transition: "transform 0.3s", transform: showBenefits ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▾
            </span>
          </button>

          {showBenefits && (
            <div className="mt-3 flex flex-col gap-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-3 p-3 rounded-xl fade-in-up" style={{ background: "#f8fafc" }}>
                  <span className="text-2xl shrink-0">{b.icon}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#0D1B3E" }}>{b.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-6 pb-8 flex flex-col gap-3">
          <Link
            href="/trenink"
            className="w-full block text-center py-4 rounded-2xl font-black text-base text-white glow-pulse"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            Začít trénovat →
          </Link>
          <Link
            href="/"
            className="w-full block text-center py-3 rounded-2xl text-sm font-semibold"
            style={{ color: "#94a3b8" }}
          >
            Zpět na dashboard
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-xs text-slate-400 text-center">
        Potvrzení platby ti přijde na email · Předplatné spravuješ na{" "}
        <Link href="/cenik" className="underline">stránce ceníku</Link>
      </p>
    </div>
  );
}
