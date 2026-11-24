import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { spocitejAnalytikuEmailu } from "@/lib/emaily/analytika";

/** Admin → E-maily → Analytika (?dni=7|30|90). */
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const d = Number(req.nextUrl.searchParams.get("dni"));
  const dni = d === 7 || d === 90 ? d : 30;
  try {
    return NextResponse.json(await spocitejAnalytikuEmailu(dni));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
