import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { shrnutiProKokpit } from "@/lib/obsah";
import { pragueDateStr } from "@/lib/date";

/**
 * Shrnutí obsahu pro MS Dashboard (schválil Karel 18. 11. 2026): semafor čerstvosti a návrhy úkolů.
 * Jen počty a data, žádné údaje o žácích. Klíč je stejný jako u funkce ms_dashboard_stats
 * (supabase/migrations/20261019_ms_dashboard_stats.sql); v kódu je jen jeho SHA-256.
 * Volání: GET s hlavičkou `Authorization: Bearer <klíč>` (nebo `x-ms-dashboard-key: <klíč>`).
 */
const HASH_KLICE = "c27afdb67c46cc5948f7c29b5298d0a3e1ad45f15b9e8af0c82e98e7f66e2333";

function klicSedi(klic: string | null): boolean {
  if (!klic) return false;
  const a = createHash("sha256").update(klic).digest();
  const b = Buffer.from(HASH_KLICE, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!klicSedi(bearer ?? req.headers.get("x-ms-dashboard-key"))) {
    return NextResponse.json({ error: "nepovoleno" }, { status: 401 });
  }
  return NextResponse.json(shrnutiProKokpit(pragueDateStr()), { headers: { "Cache-Control": "no-store" } });
}
