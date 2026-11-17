import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { kodGeneralky } from "@/lib/generalka-server";

/** GET ?d=YYYY-MM-DD -> { kod } pro test nanecisto toho dne (jen admin). */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const secret = process.env.MATEMAX_DOPORUCENI_SECRET;
  if (!secret) return NextResponse.json({ error: "Chybi klic MATEMAX_DOPORUCENI_SECRET" }, { status: 503 });
  const d = new URL(req.url).searchParams.get("d") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return NextResponse.json({ error: "Neplatne datum" }, { status: 400 });
  return NextResponse.json({ kod: kodGeneralky(secret, d), d });
}
