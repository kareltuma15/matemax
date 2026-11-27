import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import { denniOtisk } from "@/lib/mereni-server";
import { ODKUD_MOZNOSTI, VERZE_PODMINEK } from "@/lib/souhlasy";
import { upozorniAdmina } from "@/lib/admin-push";

/**
 * Dokončení registrace (admin 2.1 fáze A1): hned po založení účtu (e-mail i Google).
 *  1. souhlasy: podmínky a zásady (povinné, s verzí textu) a novinky e-mailem (nepovinné) → tabulka souhlasy,
 *  2. „Odkud ses o nás dozvěděl?“ (nepovinné) → user_metadata.odkud,
 *  3. dnešní anonymní návštěvy tohoto zařízení (denní otisk) → navstevy_ucet, ať karta žáka v adminu ukáže,
 *     odkud přišel a co dělal před registrací.
 * Jen pro účet mladší než 1 den a jen jednou (druhé volání nic nezmění).
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ ok: false }, { status: 503 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (Date.now() - Date.parse(user.created_at) > 86_400_000) return NextResponse.json({ ok: true, stary: true });

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* prázdné tělo */ }
  const podminky = b.podminky === true;
  const novinky = b.novinky === true;
  const odkud = typeof b.odkud === "string" && (ODKUD_MOZNOSTI as readonly string[]).includes(b.odkud) ? b.odkud : null;
  const db = supabaseAdmin;
  const vysledek: Record<string, string> = {};

  // 1. Souhlasy (jen jednou na účet)
  const { data: uz, error: chybaCteni } = await db.from("souhlasy").select("id").eq("user_id", user.id).eq("druh", "podminky").limit(1);
  if (chybaCteni) vysledek.souhlasy = "tabulka chybí";
  else if (!uz?.length && podminky) {
    const { error } = await db.from("souhlasy").insert([
      { user_id: user.id, druh: "podminky", verze: VERZE_PODMINEK, udelen: true, zdroj: "registrace" },
      { user_id: user.id, druh: "novinky_email", verze: VERZE_PODMINEK, udelen: novinky, zdroj: "registrace" },
    ]);
    vysledek.souhlasy = error ? error.message : "ok";
  }

  // 2. Odkud se o nás dozvěděl
  if (odkud && !user.user_metadata?.odkud) {
    const { error } = await db.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, odkud } });
    vysledek.odkud = error ? error.message : "ok";
  }

  // 3. Spojení dnešních návštěv tohoto zařízení s účtem
  const { error: chybaNavstev } = await db.from("navstevy_ucet").upsert(
    { v: denniOtisk(req), den: pragueDateStr(), user_id: user.id, kdy: "registrace" },
    { onConflict: "v,den", ignoreDuplicates: true },
  );
  vysledek.navstevy = chybaNavstev ? chybaNavstev.message : "ok";

  await upozorniAdmina("novy_zak", "Nový žák v MateMaxu", "Někdo se právě zaregistroval.", "/admin/novy/zaci?segment=novi");
  return NextResponse.json({ ok: true, ...vysledek });
}
