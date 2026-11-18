import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prehledObsahu } from "@/lib/obsah";
import { pragueDateStr } from "@/lib/date";

/** Obsah a odměny pro admina: počty z kódu appky, semafor čerstvosti a kronika novinek. Žádná data o žácích. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json(prehledObsahu(pragueDateStr()));
}
