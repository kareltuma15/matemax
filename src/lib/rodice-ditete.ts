"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RodicDitete } from "@/app/api/parent-link/dite/route";

/** Rodiče žáka (komu chodí report, kdo žádá o propojení) a akce nad nimi. Sdílí profil i Domov. */
export function useRodiceDitete() {
  const [rodice, setRodice] = useState<RodicDitete[] | null>(null);
  const [email, setEmail] = useState<string>("");

  const token = async () => (supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined);

  const nacti = useCallback(async () => {
    const t = await token();
    if (!t) { setRodice([]); return; }
    try {
      const res = await fetch("/api/parent-link/dite", { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) { setRodice([]); return; }
      const j = (await res.json()) as { email: string; rodice: RodicDitete[] };
      setEmail(j.email ?? "");
      setRodice(j.rodice ?? []);
    } catch { setRodice([]); }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(nacti);
    const obnov = () => void nacti();
    window.addEventListener("matemax-rodice-zmena", obnov);
    return () => window.removeEventListener("matemax-rodice-zmena", obnov);
  }, [nacti]);

  /** Vrátí chybovou hlášku, nebo null když se povedlo. */
  const akce = useCallback(async (telo: { akce: "povolit" | "zrusit" | "stejny" | "pozvat"; id?: string; email?: string }) => {
    const t = await token();
    if (!t) return "Nejdřív se přihlas.";
    try {
      const res = await fetch("/api/parent-link/dite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(telo),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return j.error ?? "Nepodařilo se to. Zkus to znovu.";
      window.dispatchEvent(new Event("matemax-rodice-zmena"));
      return null;
    } catch { return "Nepodařilo se to. Zkontroluj připojení a zkus to znovu."; }
  }, []);

  return { rodice, email, akce };
}
