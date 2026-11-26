"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { NAZVY_ODKAZU, NAZVY_PRVKU, NAZVY_SEKCI, povoleneParametry, sablonaCesty, type UdalostKlienta } from "@/lib/mereni-plan";

/** „Nepočítat toto zařízení“ (admin): Karlovy telefony a počítače se neměří. Nastaví se i samo po přihlášení admina. */
export const NEMERIT_KEY = "matemax-nemerit";
const nemerit = () => { try { return localStorage.getItem(NEMERIT_KEY) === "1"; } catch { return false; } };

/**
 * Měření návštěvnosti bez cookies podle plánu měření (src/lib/mereni-plan.ts, docs/tracking-plan.md).
 *  - page_viewed: šablona trasy + povolené parametry (téma, dovednost…), jestli je žák přihlášený a jestli je to vstup do webu,
 *  - element_clicked: jen prvky s lidským názvem (data-track z plánu, nebo odkaz na známou stránku + sekce úvodu),
 *  - rage_clicked: 3 rychlé kliky na stejné místo (něco nefunguje),
 *  - page_left: čas, scroll, poslední sekce, počet kliků a poslední pole formuláře (u kterého lidé odcházejí),
 *  - form_started: první klepnutí do formuláře (název pole, nikdy obsah).
 * Nic psaného se neukládá, žádné nahrávání obrazovky, žádný identifikátor v prohlížeči.
 */
const VEREJNE = /^\/($|registrace|prihlaseni|vitej|cenik|jak-to-funguje|zapomenute-heslo|matemax)/;

/**
 * Odkud návštěvník přišel (kampaň), platí po celou dobu v záložce (sessionStorage, žádný identifikátor).
 * Klik z Facebooku přidá do adresy fbclid → zdroj „facebook“, i když reklama nemá utm.
 */
const ZDROJ_KEY = "matemax-zdroj";
const VSTUP_KEY = "matemax-vstup";
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
    if (r && !r.endsWith(window.location.hostname) && !/(^|\.)stripe\.com$/.test(r)) return /(^|\.)facebook\.com$|^fb\.me$/.test(r) ? "facebook" : /(^|\.)instagram\.com$/.test(r) ? "instagram" : r.slice(0, 100);
  } catch { /* nic */ }
  return "přímo";
}

/** Přihlášený žák? Bere se z uložené relace (bez dotazu na server), měření kvůli tomu nečeká. */
let prihlasen = false;

export function mer(e: UdalostKlienta, data: Record<string, string | number | undefined> = {}): void {
  if (typeof window === "undefined" || nemerit()) return;
  try {
    const z = zdroj();
    const telo = JSON.stringify({
      e, p: sablonaCesty(window.location.pathname), r: document.referrer || undefined,
      us: z.us, um: z.um, uc: z.uc, pr: prihlasen ? 1 : 0,
      ...data,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/t", new Blob([telo], { type: "text/plain" }));
    else fetch("/api/t", { method: "POST", body: telo, keepalive: true }).catch(() => {});
  } catch { /* měření nesmí nic rozbít */ }
}

/** Lidský název prvku podle plánu měření, jinak null (prvek bez názvu se neměří). */
function nazevPrvku(el: HTMLElement): { nazev: string; cil?: string } | null {
  const track = el.closest<HTMLElement>("[data-track]")?.getAttribute("data-track");
  if (track) return { nazev: NAZVY_PRVKU[track] ?? track };
  const a = el.closest<HTMLAnchorElement>("a[href]");
  if (!a) return null;
  const href = a.getAttribute("href") ?? "";
  if (href.startsWith("#")) {
    const s = NAZVY_SEKCI[href.slice(1)];
    return s ? { nazev: `Posun na sekci: ${s}` } : null;
  }
  if (!href.startsWith("/")) return null;
  const cil = sablonaCesty(href);
  const nazev = NAZVY_ODKAZU[cil];
  if (!nazev) return null;
  const sekce = el.closest<HTMLElement>("[data-sekce]")?.dataset.sekce;
  return { nazev: sekce && NAZVY_SEKCI[sekce] ? `${nazev} · ${NAZVY_SEKCI[sekce]}` : nazev, cil };
}

interface Pobyt { cesta: string; od: number; scroll: number; kliky: number; sekce: string | undefined; pole: string | undefined; odeslano: boolean; formular: boolean }

export default function Mereni() {
  const pathname = usePathname();
  const posledni = useRef<string | null>(null);
  const pobyt = useRef<Pobyt | null>(null);
  const cestaRef = useRef(pathname);
  useEffect(() => { cestaRef.current = pathname; }, [pathname]);

  // Přihlášený? (pro oddělení návštěv webu od používání appky)
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => { prihlasen = !!data.session; });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { prihlasen = !!s; });
    return () => data.subscription.unsubscribe();
  }, []);

  // Signál „jsem tu“ přihlášeného žáka jednou za minutu, jen když je appka vidět (čas v appce, kdo je online).
  // Server u admin účtu nic neuloží a odpoví hlavičkou x-nemerit → toto zařízení se přestane měřit.
  useEffect(() => {
    if (!supabase) return;
    const posli = async () => {
      if (document.hidden || nemerit() || !supabase) return;
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) return;
      fetch("/api/zive", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: JSON.stringify({ p: sablonaCesty(cestaRef.current) }), keepalive: true })
        .then((r) => { if (r.headers.get("x-nemerit") === "1") { try { localStorage.setItem(NEMERIT_KEY, "1"); } catch { /* nic */ } } })
        .catch(() => {});
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
    mer("page_left", { p_: p.cesta, s, h: p.scroll, k: p.kliky, sk: p.sekce, lp: p.pole });
  }

  useEffect(() => {
    if (!pathname || posledni.current === pathname) return;
    posledni.current = pathname;
    odesliOdchod();
    pobyt.current = null;
    if (pathname.startsWith("/admin") || pathname.startsWith("/nahled")) return;
    // Vstup do webu = první stránka v záložce (zdroj se počítá jen u vstupu)
    let vstup = 0;
    try { if (!sessionStorage.getItem(VSTUP_KEY)) { sessionStorage.setItem(VSTUP_KEY, "1"); vstup = 1; } } catch { vstup = 0; }
    const q = povoleneParametry(window.location.search);
    mer("page_viewed", { vs: vstup, ...q });
    // Návrat ze Stripe bez zaplacení (zavřel platbu / karta neprošla)
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("canceled") === "1" || sp.get("platba") === "zrusena") mer("checkout_canceled", { c: sablonaCesty(pathname) });
    } catch { /* nic */ }
    if (VEREJNE.test(pathname)) pobyt.current = { cesta: sablonaCesty(pathname), od: Date.now(), scroll: 0, kliky: 0, sekce: undefined, pole: undefined, odeslano: false, formular: false };
  }, [pathname]);

  useEffect(() => {
    let rychle: { x: number; y: number; t: number; n: number } | null = null;
    function klik(ev: MouseEvent) {
      const p = pobyt.current;
      if (p) p.kliky += 1;
      const cil = ev.target as HTMLElement | null;
      if (!cil) return;
      // Opakované rychlé kliky na stejné místo: 3 kliky do 1 s v okruhu 30 px
      const ted = Date.now();
      if (rychle && ted - rychle.t < 1000 && Math.abs(ev.clientX - rychle.x) < 30 && Math.abs(ev.clientY - rychle.y) < 30) {
        rychle.n += 1; rychle.t = ted;
        if (rychle.n === 3) {
          const n = nazevPrvku(cil);
          const sekce = cil.closest<HTMLElement>("[data-sekce]")?.dataset.sekce;
          mer("rage_clicked", { c: n?.nazev ?? (sekce && NAZVY_SEKCI[sekce] ? `Sekce: ${NAZVY_SEKCI[sekce]}` : "neoznačené místo") });
        }
      } else rychle = { x: ev.clientX, y: ev.clientY, t: ted, n: 1 };
      const n = nazevPrvku(cil);
      if (n) mer("element_clicked", { c: n.nazev, x: n.cil });
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
      if (!p || !t || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      const pole = (t.getAttribute("name") ?? t.getAttribute("id") ?? t.getAttribute("type") ?? t.tagName.toLowerCase()).slice(0, 40);
      p.pole = pole;
      if (p.formular) return;
      p.formular = true;
      mer("form_started", { c: pole });
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
