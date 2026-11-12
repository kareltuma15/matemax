import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { pragueDateStr } from "@/lib/date";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { odhadDitete, ulozTydenniOdhad } from "@/lib/odhad-server";
import { buildReportHtml } from "@/lib/report-rodice";

// Každé pondělí 06:00 UTC (≈ 08:00 SEČ) přes Vercel Cron.
// Týdenní e-mail rodičům s ověřeným propojením: odhad bodů u přijímaček, vývoj po týdnech, témata, tip.

/**
 * Odesílání je vypnuté, dokud Karel neschválí podobu e-mailu (zákaznický e-mail jde jen přes schválení).
 * Do té doby cron jen spočítá a zapíše týdenní odhad dětí, ať má první e-mail s čím srovnávat.
 */
const ODESILAT = false;

/** Report pro rodiče je podle ceníku a obrazovky Premium výhoda Premium. */
const JEN_PREMIUM = true;

function krestniJmeno(user: User | null | undefined): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const full = String(meta.full_name ?? meta.name ?? "").trim();
  if (full) return full.split(/s+/)[0];
  return (user?.email ?? "").split("@")[0] || "vaše dítě";
}

async function handler() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "No admin client — add SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 503 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  // All verified parent-child links
  const { data: links, error: linksError } = await supabaseAdmin
    .from("parent_child_link")
    .select("parent_email, child_user_id")
    .eq("verified", true);

  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });
  if (!links || links.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const weekAgo = pragueDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const weekDate = new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

  let sent = 0;
  let failed = 0;
  let preskoceno = 0;
  let pripraveno = 0;

  const dnes = pragueDateStr(new Date());
  const twoWeeksAgo = pragueDateStr(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
  const zpracovaneDeti = new Set<string>();

  for (const link of links as { parent_email: string; child_user_id: string }[]) {
    try {
      const parentEmail = link.parent_email;
      if (!parentEmail) continue;
      const { data: childAuth } = await supabaseAdmin.auth.admin.getUserById(link.child_user_id);
      const child = childAuth?.user;
      if (!child) continue;

      const odhad = await odhadDitete(supabaseAdmin, child, dnes);
      // Týdenní odhad zapsat jednou za dítě (víc rodičů = stejné dítě).
      if (!zpracovaneDeti.has(child.id)) {
        zpracovaneDeti.add(child.id);
        await ulozTydenniOdhad(supabaseAdmin, child, odhad, dnes);
      }

      if (JEN_PREMIUM) {
        const { data: prem } = await supabaseAdmin
          .from("user_premium").select("is_premium, trial_expires_at").eq("user_id", child.id).maybeSingle();
        const p = prem as { is_premium?: boolean; trial_expires_at?: string | null } | null;
        const aktivni = !!p?.is_premium && (!p.trial_expires_at || new Date(p.trial_expires_at) > new Date());
        if (!aktivni) { preskoceno++; continue; }
      }

      const { data: sessions } = await supabaseAdmin
        .from("sessions").select("date, correct, total").eq("user_id", child.id).gte("date", twoWeeksAgo);
      const rows = (sessions ?? []) as { date: string; correct: number; total: number }[];
      const tento = rows.filter((r) => r.date >= weekAgo);
      const weekTotal = tento.reduce((s, r) => s + r.total, 0);
      const weekCorrect = tento.reduce((s, r) => s + r.correct, 0);
      const lastWeekTotal = rows.filter((r) => r.date < weekAgo).reduce((s, r) => s + r.total, 0);
      const accuracy = weekTotal > 0 ? Math.round((weekCorrect / weekTotal) * 100) : null;

      const { data: allDates } = await supabaseAdmin
        .from("sessions").select("date").eq("user_id", child.id).order("date", { ascending: false }).limit(400);
      let streak = 0;
      if (allDates && allDates.length > 0) {
        const dateSet = new Set((allDates as { date: string }[]).map((r) => r.date));
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          if (dateSet.has(pragueDateStr(d))) streak++;
          else if (i > 0) break;
        }
      }

      const childName = krestniJmeno(child);
      const html = buildReportHtml({ childName, weekDate, weekTotal, lastWeekTotal, streak, accuracy, odhad });

      if (!ODESILAT) { pripraveno++; continue; }

      const subject = odhad.bezDat
        ? `Týdenní přehled: ${childName} a příprava na přijímačky`
        : `Týdenní přehled: ${childName} má odhad ${odhad.celkem} z ${odhad.max} bodů`;
      // Resend SDK nevyhazuje výjimku při API chybě, vrací { data, error }.
      const { error: sendErr } = await resend.emails.send({
        from: "MateMax <noreply@matematika-snadno.cz>",
        to: parentEmail,
        subject,
        html,
      });
      if (sendErr) throw sendErr;
      sent++;
    } catch (err) {
      console.error("[weekly-parent-report] chyba u propojení", link.child_user_id, err);
      failed++;
    }
  }

  console.log(`[weekly-parent-report] odesláno=${sent} připraveno=${pripraveno} bez Premium=${preskoceno} chyby=${failed}`);
  return NextResponse.json({ ok: true, odesilani: ODESILAT, sent, pripraveno, preskoceno, failed });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ endpoint: "weekly-parent-report cron", requiresSecret: true });
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
