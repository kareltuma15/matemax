"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadProgress } from "@/lib/progress";
import { supabase } from "@/lib/supabase";

export default function HeaderClient() {
  const pathname = usePathname();
  const isParentSection = pathname.startsWith("/rodice");
  const [xp, setXp]               = useState(0);
  const [streak, setStreak]       = useState(0);
  const [xpBump, setXpBump]       = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const p = loadProgress();
    setXp(p.xp);
    setStreak(p.streak);

    function onStorage(e: StorageEvent) {
      if (e.key === "matemax-progress" && e.newValue) {
        try {
          const p2 = JSON.parse(e.newValue);
          setXpBump(true);
          setXp(p2.xp);
          setStreak(p2.streak);
          setTimeout(() => setXpBump(false), 800);
        } catch { /* ignore */ }
      }
    }

    function onProgressUpdate() {
      const p2 = loadProgress();
      setXpBump(true);
      setXp(p2.xp);
      setStreak(p2.streak);
      setTimeout(() => setXpBump(false), 800);
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("matemax-progress-update", onProgressUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("matemax-progress-update", onProgressUpdate);
    };
  }, []);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }

    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        <Link
          href={isParentSection ? "/rodice/dashboard" : "/"}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base select-none shrink-0"
            style={{ background: isParentSection ? "#1e3a6e" : "#0D1B3E" }}
          >
            {isParentSection ? "👨‍👩‍👧" : "M²"}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight" style={{ color: "#0D1B3E" }}>MateMax</p>
            <p className="text-xs text-slate-400 leading-tight">
              {isParentSection ? "Rodičovský portál" : "CERMAT přijímačky"}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {!isParentSection && (
            <>
              {/* Streak */}
              <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1">
                <span className="text-base leading-none">🔥</span>
                <span className="text-sm font-bold text-orange-600">{streak}</span>
                <span className="text-xs text-orange-400 hidden sm:inline">dní</span>
              </div>

              {/* XP */}
              <div
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 border transition-colors duration-200 ${
                  xpBump
                    ? "bg-indigo-100 border-indigo-300 xp-bump"
                    : "bg-indigo-50 border-indigo-200"
                }`}
              >
                <span className="text-xs font-bold" style={{ color: "#2E6DA4" }}>⚡</span>
                <span className="text-sm font-bold" style={{ color: "#2E6DA4" }}>{xp}</span>
                <span className="text-xs hidden sm:inline" style={{ color: "#2E6DA4" }}>XP</span>
              </div>
            </>
          )}

          {/* Auth — only render once session is known to avoid flash */}
          {authReady && (
            userEmail ? (
              isParentSection ? (
                <Link
                  href="/rodice/nastaveni"
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors hidden sm:flex items-center gap-1"
                  style={{ color: "#2E6DA4" }}
                >
                  <span>⚙️</span>
                  <span>Nastavení</span>
                </Link>
              ) : (
                <Link
                  href="/profil"
                  title={userEmail}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors hidden sm:flex items-center gap-1"
                  style={{ color: "#2E6DA4" }}
                >
                  <span>👤</span>
                  <span>Profil</span>
                </Link>
              )
            ) : (
              <Link
                href="/prihlaseni"
                className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hidden sm:block"
                style={{ color: "#2E6DA4" }}
              >
                Přihlásit
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
