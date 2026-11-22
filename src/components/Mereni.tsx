"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

/** „Nepočítat toto zařízení“ (admin): Karlovy telefony a počítače se neměří. */
export const NEMERIT_KEY = "matemax-nemerit";
const nemerit = () => { try { return localStorage.getItem(NEMERIT_KEY) === "1"; } catch { return false; } };

/**
 * Měření návštěvnosti bez cookies: každá stránka (navsteva) a proklik na důležité cesty
 * (registrace, přihlášení, diagnostika, trénink, Premium…) nebo na prvek s data-mereni.
 * Posílá jen cestu, odkud návštěvník přišel a utm parametry; nic se neukládá v prohlížeči.
 *
 * Veřejné stránky (úvodní, registrace, přihlášení…) měří i chování: jak dlouho tam návštěvník byl,
 * kam až doscrolloval, kterou sekci (data-sekce) viděl naposledy a kolikrát klikl (událost „odchod“),
 * všechny kliky na tlačítka a odkazy a první klepnutí do formuláře (formular_start).
 */
const DULEZITE = /^\/(registrace|vitej|prihlaseni|diagnostika|trenink|premium|cenik|testy|rodice|matemax|jak-to-funguje)(\/|\?|$)/;
const VEREJNE = /^\/($|registrace|prihlaseni|vitej|cenik|jak-to-funguje|zapomenute-heslo)/;

/**
 * Odkud návštěvník přišel (kampaň), platí po celou dobu v záložce (sessionStorage, žádný identifikátor).
 * Bez toho měla utm jen první stránka: registrace o dvě stránky dál už se ke kampani nepřiřadila.
 * Klik z Facebooku (reklama i post) přidá do adresy fbclid → zdroj „facebook“, i když reklama nemá utm.
 */
const ZDROJ_KEY = "matemax-zdroj";
type Zdroj = { us?: string; um?: string; uc?: string };
function zdrojZAdresy(): Zdroj | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const us = q.get("utm_source") ?? undefined, um = q.get("utm_medium") ?? undefined, uc = q.get("utm_campaign") ?? undefined;
    if (us || um || uc) return { us: us ?? (q.has("fbclid") ? "facebook" : undefined), um, uc };
    if (q.has("fbclid")) return { us: "facebook", um: "fbclid" };
  } catch { /* nic */ }
  return null;
}
function zdroj(): Zdroj {
  const z = zdrojZAdresy();
  try {
    if (z) { sessionStorage.setItem(ZDROJ_KEY, JSON.stringify(z)); return z; }
    return JSON.parse(sessionStorage.getItem(ZDROJ_KEY) ?? "{}") as Zdroj;
  } catch { return z ?? {}; }
}
/** Název zdroje jako v adminu: „facebook · herni-system“, „google.com“, „přímo“. Ukládá se k novému účtu. */
export function zdrojProUcet(): string {
  if (typeof window === "undefined") return "přímo";
  const z = zdroj();
  if (z.us) return [z.us, z.uc].filter(Boolean).join(" · ").slice(0, 100);
  try {
    const r = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
    if (r && !r.endsWith(window.location.hostname)) return /(^|\.)facebook\.com$|^fb\.me$/.test(r) ? "facebook" : /(^|\.)instagram\.com$/.test(r) ? "instagram" : r.slice(0, 100);
  } catch { /* nic */ }
  return "přímo";
}

export function mer(e: string, data: Record<string, string | number | undefined> = {}): void {
  if (nemerit()) return;
  try {
    const z = zdroj();
    const telo = JSON.stringify({
      e, p: window.location.pathname, r: document.referrer || undefined,
      us: z.us, um: z.um, uc: z.uc,
      ...data,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/t", new Blob([telo], { type: "text/plain" }));
    else fetch("/api/t", { method: "POST", body: telo, keepalive: true }).catch(() => {});
  } catch { /* měření nesmí nic rozbít */ }
}

interface Pobyt { cesta: string; od: number; scroll: number; kliky: number; sekce: string | undefined; odeslano: boolean; formular: boolean }

export default function Mereni() {
  const pathname = usePathname();
  const posledni = useRef<string | null>(null);
  const pobyt = useRef<Pobyt | null>(null);
  const cestaRef = useRef(pathname);
  useEffect(() => { cestaRef.current = pathname; }, [pathname]);

  // Signál „jsem tu“ přihlášeného žáka jednou za minutu, jen když je appka vidět (čas v appce, kdo je online)
  useEffect(() => {
    if (!supabase) return;
    const posli = async () => {
      if (document.hidden || nemerit() || !supabase) return;
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) return;
      fetch("/api/zive", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: JSON.stringify({ p: cestaRef.current }), keepalive: true }).catch(() => {});
    };
    void posli();
    const id = window.setInterval(() => void posli(), 60_000);
    const vid = () => { if (!document.hidden) void posli(); };
    document.addEventListener("visibilitychange", vid);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", vid); };
  }, []);

  // Odchod ze stránky (zavření, přepnutí jinam, přechod na jinou stránku appky)
  function odesliOdchod() {
    const p = pobyt.current;
    if (!p || p.odeslano) return;
    p.odeslano = true;
    const s = Math.round((Date.now() - p.od) / 1000);
    mer("odchod", { p_: p.cesta, s, h: p.scroll, k: p.kliky, sk: p.sekce });
  }

  useEffect(() => {
    if (!pathname || posledni.current === pathname) return;
    posledni.current = pathname;
    odesliOdchod();
    pobyt.current = null;
    if (pathname.startsWith("/admin") || pathname.startsWith("/nahled")) return;
    mer("navsteva");
    if (VEREJNE.test(pathname)) pobyt.current = { cesta: pathname, od: Date.now(), scroll: 0, kliky: 0, sekce: undefined, odeslano: false, formular: false };
  }, [pathname]);

  useEffect(() => {
    function klik(ev: MouseEvent) {
      const p = pobyt.current;
      if (p) p.kliky += 1;
      const el = (ev.target as HTMLElement | null)?.closest<HTMLElement>("a[href], button, [data-mereni]");
      if (!el) return;
      const vlastni = el.getAttribute("data-mereni");
      const href = el.getAttribute("href") ?? "";
      const text = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 50);
      let cil = vlastni ?? "";
      if (!vlastni) {
        if (href.startsWith("/") && DULEZITE.test(href)) cil = href.split("#")[0].slice(0, 120);
        else if (p) cil = href ? href.split("?")[0].slice(0, 120) : `tlačítko`; // na veřejných stránkách měříme každý klik
        else return;
      }
      mer("klik", { c: cil, x: text });
    }
    function scroll() {
      const p = pobyt.current;
      if (!p) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
      if (pct > p.scroll) p.scroll = Math.min(100, pct);
      const sekce = Array.from(document.querySelectorAll<HTMLElement>("[data-sekce]"));
      for (const s of sekce) {
        const r = s.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.6 && r.bottom > 0) p.sekce = s.dataset.sekce;
      }
    }
    function fokus(ev: FocusEvent) {
      const p = pobyt.current;
      const t = ev.target as HTMLElement | null;
      if (!p || p.formular || !t || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      p.formular = true;
      mer("formular_start", { c: t.getAttribute("name") ?? t.getAttribute("type") ?? t.tagName.toLowerCase() });
    }
    function skryti() { if (document.visibilityState === "hidden") odesliOdchod(); }
    document.addEventListener("click", klik, { capture: true });
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("focusin", fokus);
    document.addEventListener("visibilitychange", skryti);
    window.addEventListener("pagehide", odesliOdchod);
    return () => {
      document.removeEventListener("click", klik, { capture: true });
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("focusin", fokus);
      document.removeEventListener("visibilitychange", skryti);
      window.removeEventListener("pagehide", odesliOdchod);
    };
  }, []);

  return null;
}
