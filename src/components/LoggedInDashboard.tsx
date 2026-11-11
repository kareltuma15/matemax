"use client";

import type { Session } from "@supabase/supabase-js";
import Domov from "@/components/Domov";
import { useTrida } from "@/lib/trida";

/**
 * Úvodní stránka přihlášeného žáka. Obě třídy mají stejnou kostru (Domov), liší se jen obsahem:
 * okruhy 5. třídy, termín přijímaček na víceletá gymnázia a texty.
 */
export default function LoggedInDashboard(props: {
  session: Session;
  xp: number;
  streak: number;
  diagDone: boolean;
}) {
  const { trida, ready } = useTrida();
  if (!ready) return null;
  return <Domov {...props} trida={trida} />;
}
