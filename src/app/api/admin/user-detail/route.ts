import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizujDoporuceni, nazevTematu } from "@/lib/doporuceni";
import { zapisAudit } from "@/lib/admin-audit";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "karel.tuma15@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export interface AdminUserDetail {
  diagnostics: { tema: string; correct: number; total: number }[];
  sessions: { date: string; xp: number; correct: number; total: number }[];
  badges: number;
  cards: number;
  events: { name: string; at: string }[];
  onboarding: string | null;
  parentLinks: number;
  xp: { total: number; level: string; streak: number } | null;
  /** Propojení s Testy nanečisto (Vyhodnocení testů): od kdy, výsledky testů a plán. */
  vysledky: {
    propojeno: string | null;
    testy: { n: number; d: string; celkem: { pts: number; max: number } | null; temata: { k: string; s?: string; pts: number; max: number; j: string }[] }[];
    plan: { test: string; temata: string[]; splneno: boolean } | null;
  };
}

/** Detail jednoho uživatele pro admin přehled (jen pro adminy). */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await caller.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const [diag, sess, badges, cards, events, onboarding, links, xp, propojeni, testy, plan] = await Promise.all([
    supabaseAdmin.from("diagnostic_results").select("tema, correct, total").eq("user_id", id),
    supabaseAdmin.from("sessions").select("date, xp_earned, correct, total").eq("user_id", id).order("date", { ascending: false }).limit(10),
    supabaseAdmin.from("user_badges").select("*", { count: "exact", head: true }).eq("user_id", id),
    supabaseAdmin.from("sm2_cards").select("*", { count: "exact", head: true }).eq("user_id", id),
    supabaseAdmin.from("analytics_events").select("event_name, created_at").eq("user_id", id).not("event_name", "in", "(app_heartbeat,page_left,zive)").order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("user_onboarding").select("current_state").eq("user_id", id).maybeSingle(),
    supabaseAdmin.from("parent_child_link").select("*", { count: "exact", head: true }).eq("child_user_id", id),
    supabaseAdmin.from("user_xp").select("total_xp, current_level, streak").eq("user_id", id).maybeSingle(),
    supabaseAdmin.from("vysledky_propojeni").select("vytvoreno_at").eq("user_id", id).is("zruseno_at", null).not("kod_pouzit_at", "is", null).order("vytvoreno_at", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("vysledky_testy").select("test_n, test_d, celkem, temata").eq("user_id", id).order("test_d", { ascending: false }).limit(9),
    supabaseAdmin.from("plan_po_testu").select("doporuceni, splneno_at").eq("user_id", id).maybeSingle(),
  ]);
  const dop = normalizujDoporuceni(plan.data?.doporuceni);
  await zapisAudit({ adminId: user.id, akce: "karta_otevrena", cilUserId: id });

  const detail: AdminUserDetail = {
    diagnostics: (diag.data ?? []).map((r) => ({ tema: r.tema as string, correct: r.correct as number, total: r.total as number })),
    sessions: (sess.data ?? []).map((r) => ({ date: r.date as string, xp: (r.xp_earned as number) ?? 0, correct: (r.correct as number) ?? 0, total: (r.total as number) ?? 0 })),
    badges: badges.count ?? 0,
    cards: cards.count ?? 0,
    events: (events.data ?? []).map((r) => ({ name: r.event_name as string, at: r.created_at as string })),
    onboarding: (onboarding.data?.current_state as string | undefined) ?? null,
    parentLinks: links.count ?? 0,
    vysledky: {
      propojeno: (propojeni.data?.vytvoreno_at as string | undefined) ?? null,
      testy: (testy.data ?? []).map((r) => ({ n: r.test_n as number, d: r.test_d as string, celkem: (r.celkem as { pts: number; max: number } | null) ?? null, temata: (r.temata as AdminUserDetail["vysledky"]["testy"][number]["temata"]) ?? [] })),
      plan: dop ? { test: `${dop.test.n}. test (${dop.test.d})`, temata: dop.top.map((t) => nazevTematu(t)), splneno: !!plan.data?.splneno_at } : null,
    },
    xp: xp.data ? { total: (xp.data.total_xp as number) ?? 0, level: (xp.data.current_level as string) ?? "zacatecnik", streak: (xp.data.streak as number) ?? 0 } : null,
  };
  return NextResponse.json(detail);
}
