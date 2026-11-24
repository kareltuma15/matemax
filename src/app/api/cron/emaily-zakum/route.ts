import { NextRequest, NextResponse } from "next/server";
import { denniBeh } from "@/lib/emaily/denni-beh";

/** Denní připomínky žákům (každý den 15:00 UTC = 16:00 v Praze v zimě, po škole). Viz src/lib/emaily. */
export const maxDuration = 120;

const povoleno = (req: NextRequest) => !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

async function handler(nanecisto: boolean) {
  try {
    const { dnes, polozky } = await denniBeh(nanecisto);
    console.log(`[emaily-zakum] ${dnes} ${nanecisto ? "nanečisto" : "ostře"}: ${polozky.map((p) => `${p.posle}=${p.vysledek ?? "-"}`).join(", ") || "nikdo"}`);
    return NextResponse.json({ ok: true, dnes, nanecisto, pocet: polozky.length, polozky: polozky.map((p) => ({ uid: p.uid, trida: p.trida, posle: p.posle, vysledek: p.vysledek })) });
  } catch (e) {
    console.error("[emaily-zakum] selhalo:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!povoleno(req)) return NextResponse.json({ endpoint: "emaily-zakum cron", requiresSecret: true });
  return handler(req.nextUrl.searchParams.get("nanecisto") === "1");
}
export async function POST(req: NextRequest) {
  if (!povoleno(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return handler(req.nextUrl.searchParams.get("nanecisto") === "1");
}
