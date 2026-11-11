"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import type { Trida } from "@/types";
import { isTrida, tridaPoPrihlaseni } from "@/lib/trida-volba";

export { isTrida, tridaPoPrihlaseni };

/**
 * Třída, pro kterou žák procvičuje (5. nebo 9.). Zdroj pravdy je u přihlášeného uživatele
 * `user_metadata.trida`, do prohlížeče se pro rychlé načtení kopíruje do localStorage.
 * Kdo třídu nemá nastavenou (všichni dosavadní uživatelé, hosté), je v 9. třídě.
 */

export const TRIDA_KEY = "matemax-trida";
const EVENT = "matemax-trida-zmena";

/** Třída uložená v prohlížeči, nebo null, když ještě nebyla zvolena. */
export function readLocalTrida(): Trida | null {
  try {
    const n = Number(localStorage.getItem(TRIDA_KEY));
    return isTrida(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveLocalTrida(t: Trida): void {
  try { localStorage.setItem(TRIDA_KEY, String(t)); } catch { /* soukromé okno */ }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

const noopSubscribe = () => () => {};



/**
 * Aktuální třída + `ready` (až po načtení v prohlížeči — do té doby se hodnota neví, takže stránky,
 * které se podle třídy liší, nemají nic blikat). `setTrida` uloží volbu i k účtu.
 */
export function useTrida(): { trida: Trida; ready: boolean; setTrida: (t: Trida) => Promise<void> } {
  const trida = useSyncExternalStore<Trida>(subscribe, () => readLocalTrida() ?? 9, () => 9);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // Přihlášený uživatel: třída z účtu přebije tu v prohlížeči (třeba po přihlášení na jiném zařízení).
  useEffect(() => {
    if (!supabase) return;
    let zruseno = false;
    supabase.auth.getSession().then(({ data }) => {
      if (zruseno) return;
      const user = data.session?.user;
      if (!user) return;
      const lokalni = readLocalTrida();
      const krok = tridaPoPrihlaseni((user.user_metadata as Record<string, unknown> | undefined)?.trida, lokalni, user.created_at, Date.now());
      if (krok.doProhlizece && krok.doProhlizece !== lokalni) saveLocalTrida(krok.doProhlizece);
      if (krok.kUctu) supabase!.auth.updateUser({ data: { trida: krok.kUctu } }).catch(() => {});
    });
    return () => { zruseno = true; };
  }, []);

  const setTrida = useCallback(async (t: Trida) => {
    saveLocalTrida(t);
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.auth.updateUser({ data: { trida: t } });
  }, []);

  return { trida, ready, setTrida };
}
