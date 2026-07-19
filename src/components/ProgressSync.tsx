"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hydrateFromRemote } from "@/lib/storage";

/**
 * Obnoví postup ze serveru po přihlášení (nález #17).
 *
 * Odhlášení lokální data maže — správně, na sdíleném zařízení nemá další
 * uživatel vidět cizí postup. Bez tohoto kroku se ale žák po přihlášení choval
 * jako nový: bez opakování, odznaků a statistik po tématech.
 *
 * Nevykresluje nic. Mountuje se jednou v layoutu aplikace, takže obnova
 * proběhne bez ohledu na to, na které stránce žák přistane — dřív to bylo
 * rozeseté po komponentách (dashboard řešil diagnostiku, page.tsx XP), a proto
 * si toho nikdo nevšiml.
 */
export const HYDRATED_KEY = "matemax-hydrated";

export default function ProgressSync() {
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function run(userId: string) {
      // Jednou za relaci prohlížeče a uživatele. Klíč maže odhlášení,
      // takže přepnutí účtu obnovu spustí znovu.
      if (sessionStorage.getItem(HYDRATED_KEY) === userId) return;
      const res = await hydrateFromRemote(userId);
      if (cancelled) return;
      sessionStorage.setItem(HYDRATED_KEY, userId);
      if (res) {
        // Ať se přepočítá hlavička (XP/streak) i dlaždice na dashboardu
        window.dispatchEvent(new Event("matemax-progress-update"));
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !cancelled) run(data.session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) run(session.user.id);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  return null;
}
