"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hydrateFromRemote } from "@/lib/storage";
import { obnovSbirku, zalohujSbirku } from "@/lib/sbirka-sync";
import { SBIRKA_EVENT } from "@/lib/sbirka";
import { zdrojProUcet } from "@/components/Mereni";
import { dokonciRegistraci } from "@/lib/registrace-dokonceni";

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
    let userId: string | null = null;
    let casovac: ReturnType<typeof setTimeout> | null = null;

    // Sbírka (krystaly, odměny): každou změnu po chvíli zazálohuj na server
    const naZmenuSbirky = () => {
      if (!userId) return;
      if (casovac) clearTimeout(casovac);
      const uid = userId;
      casovac = setTimeout(() => { void zalohujSbirku(uid); }, 4000);
    };
    window.addEventListener(SBIRKA_EVENT, naZmenuSbirky);

    async function run(uid: string) {
      userId = uid;
      // Jednou za relaci prohlížeče a uživatele. Klíč maže odhlášení,
      // takže přepnutí účtu obnovu spustí znovu.
      if (sessionStorage.getItem(HYDRATED_KEY) === uid) return;
      const res = await hydrateFromRemote(uid);
      await obnovSbirku(uid).catch(() => {});
      if (cancelled) return;
      sessionStorage.setItem(HYDRATED_KEY, uid);
      if (res) {
        // Ať se přepočítá hlavička (XP/streak) i dlaždice na dashboardu
        window.dispatchEvent(new Event("matemax-progress-update"));
      }
    }

    // Nový účet přes Google: zdroj (kampaň) se při registraci nedá poslat jako u e-mailu, doplní se po přihlášení
    async function doplnZdroj(user: { created_at: string; user_metadata?: Record<string, unknown> }) {
      if (!supabase || user.user_metadata?.zdroj || Date.now() - Date.parse(user.created_at) > 3600_000) return;
      const { error } = await supabase.auth.updateUser({ data: { zdroj: zdrojProUcet() } });
      if (error) console.warn("[zdroj]", error.message);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !cancelled) void doplnZdroj(data.session.user);
      // Registrace přes Google: souhlasy a „odkud ses dozvěděl“ čekají v sessionStorage
      if (data.session && !cancelled) void dokonciRegistraci(data.session.access_token);
      if (data.session && !cancelled) run(data.session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) { run(session.user.id); void dokonciRegistraci(session.access_token); }
      if (event === "SIGNED_OUT") { userId = null; if (casovac) clearTimeout(casovac); }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(SBIRKA_EVENT, naZmenuSbirky);
      if (casovac) clearTimeout(casovac);
    };
  }, []);

  return null;
}
