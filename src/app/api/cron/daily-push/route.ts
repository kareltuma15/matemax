import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:noreply@matemax.cz",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

function nameFromEmail(email: string): string {
  const prefix = email.split("@")[0].split(".")[0].split("-")[0].split("_")[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

type MessageFn = (name: string, level: string) => { title: string; body: string };

const MESSAGES: MessageFn[] = [
  (name) => ({
    title: `Ahoj ${name}! 🧠`,
    body: "Čas na dnešní trénink — 10 minut a jsi o krok blíž k přijímačkám.",
  }),
  (name) => ({
    title: `${name}, nezapomeň! 💪`,
    body: "Každý den se počítá. Dnes máš šanci pokročit vpřed.",
  }),
  (name, level) => ({
    title: `Ahoj ${name}!`,
    body: level === "expert" || level === "mistr"
      ? "Expert tě poznáme podle výdrže 🔥 Trénink tě čeká."
      : "Dnešních 10 příkladů a streak roste! 📈",
  }),
  (name) => ({
    title: `${name} — dnes procvičuješ? 🎯`,
    body: "Algoritmus ví, co ti jde nejhůř. Pojď na to spolu.",
  }),
  (name) => ({
    title: `Ahoj ${name}! 🚀`,
    body: "Přijímačky jsou blíž, než si myslíš. Dnes jsi ještě necvičil.",
  }),
];

const DAY_CONTEXT: Record<number, string> = {
  1: "Pondělí — skvělý začátek týdne! 💪",
  5: "Pátek — dokonči týden silně! 🎯",
  6: "Sobota — víkendový trénink počítá dvojnásob! 🏆",
  0: "Neděle — připrav se na nový týden! 📚",
};

function pickMessage(userId: string | null, name: string, level: string, dayOfWeek: number): { title: string; body: string } {
  const dayOverride = DAY_CONTEXT[dayOfWeek];
  if (dayOverride && Math.random() < 0.3) {
    return { title: `Ahoj ${name}!`, body: dayOverride };
  }
  // Deterministically pick message per user (same user always gets same variant today)
  const seed = userId ? parseInt(userId.replace(/[^0-9]/g, "").slice(0, 8) || "0") : 0;
  const idx = (seed + new Date().getDate()) % MESSAGES.length;
  return MESSAGES[idx](name, level);
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription, user_id");

  if (error) {
    console.error("push_subscriptions select error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Build user_id → level map from user_xp
  const userIds = [...new Set((rows ?? []).map((r: { user_id: string | null }) => r.user_id).filter(Boolean) as string[])];
  const levelMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: xpRows } = await supabase
      .from("user_xp")
      .select("user_id, current_level")
      .in("user_id", userIds);
    for (const row of xpRows ?? []) levelMap.set(row.user_id, row.current_level ?? "zacatecnik");
  }

  // Build user_id → name map from auth.users (admin client)
  const nameMap = new Map<string, string>();
  if (supabaseAdmin && userIds.length > 0) {
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      for (const user of authData?.users ?? []) {
        const displayName = (user.user_metadata?.full_name as string | undefined)
          ?? (user.user_metadata?.name as string | undefined)
          ?? nameFromEmail(user.email ?? "");
        nameMap.set(user.id, displayName.split(" ")[0]);
      }
    } catch {
      // Admin lookup failed — fall back to generic messages
    }
  }

  const dayOfWeek = new Date().getDay();

  const results = await Promise.allSettled(
    (rows ?? []).map((row: { endpoint: string; subscription: string; user_id: string | null }) => {
      const uid = row.user_id;
      const name = uid ? (nameMap.get(uid) ?? "ty") : "ty";
      const level = uid ? (levelMap.get(uid) ?? "zacatecnik") : "zacatecnik";
      const { title, body } = pickMessage(uid, name, level, dayOfWeek);
      const payload = JSON.stringify({ title, body, url: "/trenink" });
      return webpush.sendNotification(JSON.parse(row.subscription), payload);
    })
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Remove expired / unsubscribed endpoints (HTTP 410)
  const gone: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410) gone.push((rows ?? [])[i].endpoint);
    }
  });
  if (gone.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", gone);
  }

  console.log(`[daily-push] sent=${sent} failed=${failed} removed=${gone.length}`);
  return NextResponse.json({ ok: true, sent, failed, removed: gone.length });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ endpoint: "daily-push cron", requiresSecret: true });
  }
  return POST(req);
}
