"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { loadProgress, saveProgress } from "@/lib/progress";
import type { Session } from "@supabase/supabase-js";
import { getSmartRedirect } from "@/lib/smart-redirect";
import UvodHost from "@/components/uvod/UvodHost";

const LoggedInDashboard = dynamic(() => import("@/components/LoggedInDashboard"), {
  ssr: false,
  loading: () => null,
});

// ─── ÚVODNÍ STRÁNKA: host vidí UvodHost, přihlášený domov ─────────────────────

export default function LandingPage() {
  const [diagDone, setDiagDone] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const diag = localStorage.getItem("matemax-diag-done") === "1";
    setDiagDone(diag); // eslint-disable-line react-hooks/set-state-in-effect

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session) {
          const p = loadProgress();
          setXp(p.xp);
          setStreak(p.streak);
          // Restore stats from Supabase (handles localStorage clear / new device)
          if (supabase) {
            (async () => {
              try {
                const { data: xpRow } = await supabase!
                  .from('user_xp')
                  .select('total_xp, streak')
                  .eq('user_id', data.session!.user.id)
                  .single();
                if (!xpRow) return;
                const remoteXP = (xpRow.total_xp as number) ?? 0;
                const remoteStreak = (xpRow.streak as number) ?? 0;
                if (remoteXP > p.xp || remoteStreak > p.streak) {
                  const merged = { ...p, xp: Math.max(p.xp, remoteXP), streak: Math.max(p.streak, remoteStreak) };
                  saveProgress(merged);
                  setXp(merged.xp);
                  setStreak(merged.streak);
                }
              } catch { /* ignore */ }
            })();
          }

          const params = new URLSearchParams(window.location.search);
          if (params.get("login") === "1") {
            window.history.replaceState({}, "", "/");
            const dest = getSmartRedirect("/");
            if (dest !== "/" && dest !== "/?comeback=1") {
              window.location.href = dest;
              return;
            }
          }
        }
        setSessionChecked(true);
      });
    } else {
      setSessionChecked(true);
    }
  }, []);

  if (sessionChecked && session) {
    return (
      <LoggedInDashboard session={session} xp={xp} streak={streak} diagDone={diagDone} />
    );
  }

  return <UvodHost diagDone={diagDone} />;
}
