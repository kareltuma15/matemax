"use client";

import { useEffect } from "react";

/**
 * Registruje service worker.
 *
 * Kromě registrace si vynucuje kontrolu aktualizace. Bez ní se uživatel může
 * zaseknout na staré verzi SW, která servíruje zastaralé stránky — a sám se
 * z toho nedostane (nález #18: klik na „Přihlásit" vracel zacachovaný trénink).
 * Nový SW volá skipWaiting + clients.claim, takže jakmile se stáhne, hned
 * převezme řízení.
 */
export default function PwaSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => {
        reg = r;
        return r.update(); // zkontroluj aktualizaci hned při načtení
      })
      .catch((err) => console.warn("SW registration failed:", err));

    // A znovu při návratu na kartu — uživatel s dlouho otevřenou appkou
    // by jinak zůstal na staré verzi.
    function onVisible() {
      if (document.visibilityState === "visible") reg?.update().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
