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

// ─── Streak-aware messages ─────────────────────────────────────────────────

function streakMessage(name: string, streak: number): { title: string; body: string } {
  if (streak >= 30) return {
    title: `${name}, streak ${streak} dní! 🔥`,
    body: "Takhle blízko jsi k přijímačkám. Jeden trénink a streak žije dál.",
  };
  if (streak >= 14) return {
    title: `${name} — ${streak} dní v řadě! 🏆`,
    body: "Dnes budeš mít ještě větší streak. Necvičíš?",
  };
  if (streak >= 7) return {
    title: `${streak} dní streak 🔥 je v ohrožení!`,
    body: `${name}, dnes jsi ještě necvičil/a. Jeden trénink ho zachrání.`,
  };
  if (streak >= 3) return {
    title: `Nezlom to, ${name}! 🔥`,
    body: `Máš ${streak} dní za sebou. Dnes je klíčový den — necvičíš?`,
  };
  return {
    title: `Ahoj ${name}! 🧠`,
    body: "Čas na dnešní trénink — 10 minut a jsi o krok blíž k přijímačkám.",
  };
}

function genericMessage(
  userId: string | null, name: string, level: string, dayOfWeek: number
): { title: string; body: string } {
  const dayOverrides: Record<number, string> = {
    1: "Pondělí — skvělý začátek týdne! 💪",
    5: "Pátek — dokonči týden silně! 🎯",
    6: "Sobota — víkendový trénink počítá dvojnásob! 🏆",
    0: "Neděle — připrav se na nový týden! 📚",
  };
  if (dayOverrides[dayOfWeek] && Math.random() < 0.3) {
    return { title: `Ahoj ${name}!`, body: dayOverrides[dayOfWeek] };
  }
  const variants = [
    { title: `Ahoj ${name}! 🧠`, body: "Čas na dnešní trénink — 10 minut a jsi o krok blíž." },
    { title: `${name}, nezapomeň! 💪`, body: "Každý den se počítá. Dnes máš šanci pokročit vpřed." },
    {
      title: `Ahoj ${name}!`,
      body: level === "expert" || level === "mistr"
        ? "Expert tě poznáme podle výdrže 🔥 Trénink tě čeká."
        : "Dnešních 10 příkladů a streak roste! 📈",
    },
    { title: `${name} — dnes procvičuješ? 🎯`, body: "Algoritmus ví, co ti jde nejhůř. Pojď na to spolu." },
    { title: `Ahoj ${name}! 🚀`, body: "Přijímačky jsou blíž, než si myslíš. Dnes jsi ještě necvičil." },
  ];
  const seed = userId ? parseInt(userId.replace(/[^0-9]/g, "").slice(0, 8) || "0") : 0;
  return variants[(seed + new Date().getDate()) % variants.length];
}

// ─── Handler ───────────────────────────────────────────────────────────────

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
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const userIds = [
    ...new Set(
      (rows ?? [])
        .map((r: { user_id: string | null }) => r.user_id)
        .filter(Boolean) as string[]
    ),
  ];

  // Fetch levels
  const levelMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: xpRows } = await supabase
      .from("user_xp")
      .select("user_id, current_level")
      .in("user_id", userIds);
    for (const row of xpRows ?? []) levelMap.set(row.user_id, row.current_level ?? "zacatecnik");
  }

  // Fetch streaks from user_progress
  const streakMap = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: progressRows } = await supabase
      .from("user_progress")
      .select("user_id, streak")
      .in("user_id", userIds);
    for (const row of progressRows ?? []) streakMap.set(row.user_id, row.streak ?? 0);
  }

  // Fetch who already trained today — skip them
  const today = new Date().toISOString().slice(0, 10);
  const trainedTodaySet = new Set<string>();
  if (userIds.length > 0) {
    const { data: sessionRows } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("date", today)
      .in("user_id", userIds);
    for (const row of sessionRows ?? []) trainedTodaySet.add(row.user_id);
  }

  // Fetch names from auth
  const nameMap = new Map<string, string>();
  if (supabaseAdmin && userIds.length > 0) {
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      for (const user of authData?.users ?? []) {
        const displayName =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          nameFromEmail(user.email ?? "");
        nameMap.set(user.id, displayName.split(" ")[0]);
      }
    } catch { /* fall back to generic */ }
  }

  const dayOfWeek = new Date().getDay();
  let skipped = 0;

  const filteredRows = (rows ?? []).filter((row: { user_id: string | null }) => {
    const uid = row.user_id;
    if (!uid) return true; // anonymous subscribers always get reminder
    if (trainedTodaySet.has(uid)) { skipped++; return false; } // already trained today
    return true;
  });

  const results = await Promise.allSettled(
    filteredRows.map((row: { endpoint: string; subscription: string; user_id: string | null }) => {
      const uid = row.user_id;
      const name = uid ? (nameMap.get(uid) ?? "ty") : "ty";
      const level = uid ? (levelMap.get(uid) ?? "zacatecnik") : "zacatecnik";
      const streak = uid ? (streakMap.get(uid) ?? 0) : 0;

      const { title, body } = streak >= 3
        ? streakMessage(name, streak)
        : genericMessage(uid, name, level, dayOfWeek);

      const payload = JSON.stringify({ title, body, url: "/trenink" });
      return webpush.sendNotification(JSON.parse(row.subscription), payload);
    })
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Remove expired subscriptions (HTTP 410)
  const gone: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410) gone.push(filteredRows[i].endpoint);
    }
  });
  if (gone.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", gone);
  }

  console.log(`[daily-push] sent=${sent} failed=${failed} skipped=${skipped} removed=${gone.length}`);
  return NextResponse.json({ ok: true, sent, failed, skipped, removed: gone.length });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ endpoint: "daily-push cron", requiresSecret: true });
  }
  return POST(req);
}
