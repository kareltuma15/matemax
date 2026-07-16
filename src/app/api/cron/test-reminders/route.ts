import { NextRequest, NextResponse } from "next/server";
import { runTestReminders } from "@/lib/test-reminders";

// Připomínky před testem nanečisto.
//
// Tenhle endpoint NENÍ zaregistrovaný ve vercel.json — Vercel Hobby dovolí
// jen 2 crony a jen denní frekvenci, a oba sloty jsou obsazené. Připomínky
// proto jezdí v rámci daily-push. Endpoint zůstává pro ruční spuštění
// a pro případný externí hodinový trigger (pak začne fungovat i mail 1h
// před startem, viz W1_MAX v lib/test-reminders).

async function handler() {
  const result = await runTestReminders();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ endpoint: "test-reminders cron", requiresSecret: true });
  }
  return handler();
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handler();
}
