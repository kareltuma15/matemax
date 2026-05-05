"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function VitejPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/prihlaseni");
        return;
      }
      setEmail(data.session.user.email ?? null);

      // Posuň stav onboardingu na welcome_shown
      supabase!
        .from("user_onboarding")
        .upsert(
          { user_id: data.session.user.id, current_state: "welcome_shown" },
          { onConflict: "user_id" }
        )
        .then(() => {});
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const firstName = email?.split("@")[0] ?? "student";

  return (
    <>
      {/* Explainer modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black" style={{ color: "#0D1B3E" }}>
              Jak MateMax funguje?
            </h3>
            <ul className="flex flex-col gap-3">
              {[
                ["🔬", "Diagnostika odhalí tvoje mezery"],
                ["🧠", "Algoritmus vybírá příklady přesně pro tebe"],
                ["🔥", "Streak tě motivuje každý den"],
                ["📈", "Vidíš jak se zlepšuješ"],
              ].map(([icon, text]) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{icon}</span>
                  <span className="text-sm text-slate-700 font-medium">{text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 text-white font-semibold rounded-xl"
              style={{ background: "#0D1B3E" }}
            >
              Rozumím, pojďme na to!
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-6 py-4">
        {/* Krok indikátor */}
        <div className="w-full">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold" style={{ color: "#2E6DA4" }}>Krok 1 ze 3</span>
            <span>Vítej → Diagnostika → Trénink</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 h-2 rounded-full"
                style={{ background: i === 0 ? "#2E6DA4" : "#e2e8f0" }}
              />
            ))}
          </div>
        </div>

        {/* Astronaut illustration */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shrink-0"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          🧑‍🚀
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-black leading-tight" style={{ color: "#0D1B3E" }}>
            Vítej v MateMax! 🎉
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
            Nejdřív zjistíme kde máš mezery — pak připravíme plán přesně pro tebe.
          </p>
        </div>

        {/* Info karty */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {[
            ["⏱️", "8 minut", "diagnostika"],
            ["📚", "6 témat", "CERMAT"],
            ["🎯", "Výsledek", "ihned"],
          ].map(([icon, title, sub]) => (
            <div
              key={title}
              className="bg-white rounded-xl border border-slate-200 p-3 text-center"
            >
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-xs font-bold" style={{ color: "#0D1B3E" }}>{title}</p>
              <p className="text-[10px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/diagnostika"
            className="block w-full py-4 text-white font-black rounded-2xl text-center text-base shadow-lg"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            Spustit diagnostiku →
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-medium text-center"
            style={{ color: "#2E6DA4" }}
          >
            Co je MateMax?
          </button>
        </div>

        {/* Skip link — pro ty kteří už diagnostiku dělali */}
        <Link
          href="/trenink"
          className="text-xs text-slate-300 hover:text-slate-400 transition-colors"
        >
          Přeskočit, chci rovnou trénovat →
        </Link>
      </div>
    </>
  );
}
