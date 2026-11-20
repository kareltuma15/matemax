"use client";

/**
 * Dárek po testu nanečisto (ochutnávka, Karel 20. 11. 2026): žák bez Premium dostane z každého
 * doporučeného Premium tématu 10 příkladů zdarma. Počítá se každá odeslaná odpověď (přeskočení ne),
 * po každém novém testu nanečisto se dárek obnoví.
 *
 * Kolik je vyčerpáno: maximum z počítadla v prohlížeči (hned po každé odpovědi) a ze záznamů
 * v tabulce procvicovani od data testu (drží se u účtu, smazání prohlížeče nepomůže).
 * Bez Premium se k zamčenému tématu jinak než přes dárek nedostane, takže každý takový záznam je z dárku.
 */
import { supabase } from "./supabase";
import { isTopicLocked } from "./subscription";
import type { Doporuceni } from "./doporuceni";

export const DAREK_NA_TEMA = 10;
const KLIC = "matemax-darek-po-testu";

export interface Darek {
  /** Který test dárek dal (třída + pořadí + datum testu). */
  klic: string;
  /** Datum testu YYYY-MM-DD: od něj se počítá v tabulce procvicovani. */
  od: string;
  /** Zamčená doporučená témata, na která dárek platí. */
  temata: string[];
}

export type Pouzito = Record<string, number>;

/** Dárek z doporučení, nebo null (Premium, host, nic zamčeného). */
export function darekZDoporuceni(d: Doporuceni, isPremium: boolean, isGuest: boolean): Darek | null {
  if (isGuest || isPremium) return null;
  const temata = [...new Set(d.top.map((t) => t.k))].filter((k) => isTopicLocked(k, false));
  if (temata.length === 0) return null;
  return { klic: `${d.g}-${d.test.n}-${d.test.d}`, od: d.test.d, temata };
}

export function zbyva(pouzito: Pouzito, tema: string): number {
  return Math.max(0, DAREK_NA_TEMA - (pouzito[tema] ?? 0));
}

export function pouzitoLokalne(klic: string): Pouzito {
  try {
    const raw = JSON.parse(localStorage.getItem(KLIC) ?? "null") as { klic: string; pouzito: Pouzito } | null;
    return raw && raw.klic === klic ? raw.pouzito : {};
  } catch { return {}; }
}

/** Po každé odeslané odpovědi na dárkový příklad. Vrací nový stav. */
export function zapocitejDarek(klic: string, tema: string): Pouzito {
  const pouzito = { ...pouzitoLokalne(klic) };
  pouzito[tema] = (pouzito[tema] ?? 0) + 1;
  try { localStorage.setItem(KLIC, JSON.stringify({ klic, pouzito })); } catch { /* soukromé okno */ }
  return pouzito;
}

/** Spojí počítadlo v prohlížeči se záznamy u účtu (vyšší číslo vyhrává). */
export async function nactiPouzito(darek: Darek): Promise<Pouzito> {
  const lokal = pouzitoLokalne(darek.klic);
  if (!supabase) return lokal;
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return lokal;
  const { data, error } = await supabase.from("procvicovani").select("temata").eq("user_id", uid).gte("datum", darek.od).limit(2000);
  if (error || !data) return lokal;
  const server: Pouzito = {};
  for (const r of data) {
    for (const t of (r.temata ?? []) as { k: string; n: number }[]) {
      if (darek.temata.includes(t.k)) server[t.k] = (server[t.k] ?? 0) + Math.max(0, Math.round(t.n));
    }
  }
  const vysledek: Pouzito = {};
  for (const k of darek.temata) vysledek[k] = Math.max(lokal[k] ?? 0, server[k] ?? 0);
  return vysledek;
}
