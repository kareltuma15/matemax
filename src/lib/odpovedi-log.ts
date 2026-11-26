"use client";

import { useCallback, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { reportDbError } from "./db-error";
import { cistaOdpoved } from "./mereni-plan";

/**
 * Log každé odpovědi (tabulka odpovedi, admin 2.1 fáze A1, DA-09): čas na úlohu, zvolená odpověď,
 * nápověda, postup, přeskočení, výsledek prvního odeslání. Číslo pokusu doplní databáze.
 *
 * Jak to funguje: stránka (trénink, diagnostika, test…) nastaví režim `nastavRezim("trenink")`,
 * karta úlohy použije `useZaznamOdpovedi(example, onResult, onSkip)` a hlásí `oznacOdeslani`,
 * `oznacNapovedu`, `oznacPostup`. Bez nastaveného režimu (ukázka na úvodu, náhledy) se nic nezapisuje.
 * Jen přihlášený žák. Psaný text se neukládá: jen číslo, zlomek nebo písmeno volby (nejvýš 40 znaků).
 */
export type RezimOdpovedi = "trenink" | "opakovani" | "chyby" | "diagnostika" | "rychly" | "vyzva" | "test" | "boss";

interface Uloha { id: string; od: number; napoveda: boolean; postup: boolean; odeslani: number; prvni: boolean | null; odpoved: string | null; zapsano: boolean }
type Priklad = { id: string; tema?: string; dovednost?: string; obtiznost?: number; trida?: number };

let kontext: { rezim: RezimOdpovedi; sadaId: string; poradi: number } | null = null;
let uloha: Uloha | null = null;

const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : null);

/** Začátek sady (trénink, diagnostika, test). Každé volání = nová sada. */
export function nastavRezim(rezim: RezimOdpovedi): void {
  kontext = { rezim, sadaId: uuid() ?? "", poradi: 0 };
  uloha = null;
}
/** Konec sady (odchod ze stránky). */
export function ukonciRezim(): void { kontext = null; uloha = null; }

export function zacniUlohu(id: string): void {
  if (!kontext || (uloha && uloha.id === id && !uloha.zapsano)) return;
  uloha = { id, od: Date.now(), napoveda: false, postup: false, odeslani: 0, prvni: null, odpoved: null, zapsano: false };
}
export function oznacNapovedu(): void { if (uloha) uloha.napoveda = true; }
export function oznacPostup(): void { if (uloha) uloha.postup = true; }
/** Každé odeslání odpovědi v kartě (u karet s druhým pokusem víckrát). */
export function oznacOdeslani(spravne: boolean, odpoved?: string): void {
  if (!uloha) return;
  uloha.odeslani += 1;
  if (uloha.prvni === null) uloha.prvni = spravne;
  if (odpoved !== undefined) uloha.odpoved = cistaOdpoved(odpoved);
}

/** Zapíše odpověď na úlohu (jednou za zobrazení úlohy). */
export function dokonciUlohu(p: Priklad, v: { spravne: boolean | null; odpoved?: string; preskoceno?: boolean }): void {
  if (!kontext || !supabase) return;
  if (!uloha || uloha.id !== p.id) zacniUlohu(p.id);
  const u = uloha;
  if (!u || u.zapsano) return;
  u.zapsano = true;
  kontext.poradi += 1;
  // „Tentokrát ne“ po špatné odpovědi volá přeskočení, ale žák odpověděl: je to špatná odpověď, ne přeskočení
  const preskoceno = !!v.preskoceno && u.odeslani === 0;
  if (v.preskoceno && !preskoceno) v = { ...v, spravne: false };
  const radek = {
    uloha_id: p.id.slice(0, 60),
    tema: p.tema?.slice(0, 40) ?? null,
    dovednost: p.dovednost?.slice(0, 60) ?? null,
    uroven: typeof p.obtiznost === "number" ? p.obtiznost : null,
    trida: p.trida === 5 || p.tema?.startsWith("p5_") ? 5 : 9,
    rezim: kontext.rezim,
    sada_id: kontext.sadaId || null,
    poradi: kontext.poradi,
    spravne: preskoceno ? null : v.spravne,
    spravne_napoprve: preskoceno ? null : u.prvni ?? v.spravne,
    odeslani: preskoceno ? u.odeslani : Math.max(1, u.odeslani),
    odpoved: preskoceno ? null : u.odpoved ?? cistaOdpoved(v.odpoved),
    cas_ms: Math.min(3_600_000, Math.max(0, Date.now() - u.od)),
    napoveda: u.napoveda,
    postup: u.postup,
    preskoceno,
  };
  const db = supabase;
  void db.auth.getSession().then(async ({ data }) => {
    const uid = data.session?.user.id;
    if (!uid) return;
    const { error } = await db.from("odpovedi").insert({ user_id: uid, ...radek });
    // Tabulka ještě nemusí existovat (migrace se pouští ručně): tichý neúspěch, trénink jede dál
    if (error && !/relation .* does not exist|schema cache/i.test(error.message)) reportDbError("odpovedi.insert", error);
  });
}

/**
 * Hook pro kartu úlohy: začne měřit čas při zobrazení úlohy a obalí onResult / onSkip tak,
 * aby se odpověď zapsala do logu. Volání rodiče zůstává stejné.
 */
export function useZaznamOdpovedi<A extends unknown[]>(
  example: Priklad,
  onResult: (correct: boolean, ...rest: A) => void,
  onSkip?: () => void,
): { onResult: (correct: boolean, ...rest: A) => void; onSkip?: () => void } {
  const ref = useRef(example);
  useEffect(() => { ref.current = example; zacniUlohu(example.id); }, [example]);
  const vysledek = useCallback((correct: boolean, ...rest: A) => {
    const odp = typeof rest[0] === "string" ? (rest[0] as string) : undefined;
    dokonciUlohu(ref.current, { spravne: correct, odpoved: odp });
    onResult(correct, ...rest);
  }, [onResult]);
  const preskoc = useCallback(() => {
    dokonciUlohu(ref.current, { spravne: null, preskoceno: true });
    onSkip?.();
  }, [onSkip]);
  return { onResult: vysledek, onSkip: onSkip ? preskoc : undefined };
}
