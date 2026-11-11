"use client";

import { useTrida } from "@/lib/trida";

/** Patička aplikace: text podle třídy žáka (5. nebo 9.), do načtení třídy jen prázdné místo. */
export default function AppFooter() {
  const { trida, ready } = useTrida();
  return (
    <footer className="app-chrome text-center text-xs py-4 pb-20" style={{ color: "#94a3b8" }}>
      {ready ? `MateMax © 2026 · Matematika pro ${trida}. třídu · CERMAT` : " "}
    </footer>
  );
}
