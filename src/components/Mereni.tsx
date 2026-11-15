"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Měření návštěvnosti bez cookies: každá stránka (navsteva) a proklik na důležité cesty
 * (registrace, přihlášení, diagnostika, trénink, Premium…) nebo na prvek s data-mereni.
 * Posílá jen cestu, odkud návštěvník přišel a utm parametry; nic se neukládá v prohlížeči.
 */
const DULEZITE = /^\/(registrace|vitej|prihlaseni|diagnostika|trenink|premium|cenik|testy|rodice|matemax|jak-to-funguje)(\/|\?|$)/;

export function mer(e: string, data: Record<string, string | undefined> = {}): void {
  try {
    const q = new URLSearchParams(window.location.search);
    const telo = JSON.stringify({
      e, p: window.location.pathname, r: document.referrer || undefined,
      us: q.get("utm_source") ?? undefined, um: q.get("utm_medium") ?? undefined, uc: q.get("utm_campaign") ?? undefined,
      ...data,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/t", new Blob([telo], { type: "text/plain" }));
    else fetch("/api/t", { method: "POST", body: telo, keepalive: true }).catch(() => {});
  } catch { /* měření nesmí nic rozbít */ }
}

export default function Mereni() {
  const pathname = usePathname();
  const posledni = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || posledni.current === pathname) return;
    posledni.current = pathname;
    if (pathname.startsWith("/admin") || pathname.startsWith("/nahled")) return;
    mer("navsteva");
  }, [pathname]);

  useEffect(() => {
    function klik(ev: MouseEvent) {
      const el = (ev.target as HTMLElement | null)?.closest<HTMLElement>("a[href], [data-mereni]");
      if (!el) return;
      const vlastni = el.getAttribute("data-mereni");
      const href = el.getAttribute("href") ?? "";
      let cil = vlastni ?? "";
      if (!vlastni) {
        if (!href.startsWith("/") || !DULEZITE.test(href)) return;
        cil = href.split("#")[0].slice(0, 120);
      }
      mer("klik", { c: cil, x: (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 50) });
    }
    document.addEventListener("click", klik, { capture: true });
    return () => document.removeEventListener("click", klik, { capture: true });
  }, []);

  return null;
}
