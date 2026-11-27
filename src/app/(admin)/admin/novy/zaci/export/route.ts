import { NextRequest, NextResponse } from "next/server";
import { stavAdmina } from "@/lib/admin2/auth";
import { kontext, nactiAktivitu, nactiFiltry, nactiZaky } from "@/lib/admin2/data";
import { nactiNastaveni, nazevZdroje } from "@/lib/admin2/nastaveni";
import { NAZEV_STAVU, DEFINICE, lideMetriky, mapaDnu, posunDen, stavZaka, uspesnost, vyhovujeFiltru, type MetrikaId } from "@/lib/admin2/metriky";
import { segmenty } from "@/lib/admin2/segmenty";
import { pseudonymy, zobraz } from "@/lib/admin2/sdileni";
import { zapisAudit } from "@/lib/admin-audit";
import { pragueDateStr } from "@/lib/date";

/**
 * Export žáků do CSV (ZA-03) se stejnými filtry jako seznam. V režimu sdílení bez jmen a e-mailů.
 * Zapisuje se do auditu.
 */
export async function GET(req: NextRequest) {
  const s = await stavAdmina();
  if (!s.ok) return NextResponse.json({ error: "Přístup jen pro admina" }, { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const k = await kontext(sp.demo);
  const [zaci, nastaveni] = await Promise.all([nactiZaky(k), nactiNastaveni()]);
  const f = nactiFiltry(sp);
  const dnes = pragueDateStr();
  let seznam = zaci.filter((z) => vyhovujeFiltru(z, f));
  if (sp.metrika && sp.metrika in DEFINICE) {
    const dny = mapaDnu(await nactiAktivitu(k, posunDen(dnes, -120)));
    const lide = new Set(lideMetriky(sp.metrika as MetrikaId, seznam, dny, f.od, f.do).lide);
    seznam = seznam.filter((z) => lide.has(z.id));
  }
  const seg = segmenty(nastaveni, dnes).find((x) => x.klic === sp.segment);
  if (seg) seznam = seznam.filter(seg.test);
  if (sp.ids) { const ids = new Set(sp.ids.split(",")); seznam = seznam.filter((z) => ids.has(z.id)); }

  const ps = pseudonymy(zaci);
  const esc = (v: unknown) => { const t = v === null || v === undefined ? "" : String(v); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const hlavicka = ["jméno", ...(k.sdileni ? [] : ["e-mail"]), "třída", "registrace", "zdroj", "odkud se dozvěděl", "stav", "poslední aktivita", "dny s tréninkem", "dny za 7 dní", "odpovědí", "úspěšnost %", "diagnostika", "premium"];
  const radky = seznam.map((z) => [
    zobraz(z, k.sdileni, ps).jmeno, ...(k.sdileni ? [] : [z.email ?? ""]), z.trida,
    new Date(z.registrace).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" }), nazevZdroje(z.zdroj, nastaveni.kampane), z.odkud ?? "",
    NAZEV_STAVU[stavZaka(z, nastaveni, dnes)], z.posledni_aktivita ?? "", z.dny_celkem, z.dny_7, z.odpovedi, uspesnost(z) ?? "",
    z.diagnostika ? "ano" : "ne", z.premium,
  ].map(esc).join(";"));
  if (!k.demo) await zapisAudit({ adminId: s.user.id, akce: "export_ucty", detail: { pocet: seznam.length, sdileni: k.sdileni } });
  // BOM, ať Excel pozná UTF-8 a české znaky
  return new NextResponse("﻿" + [hlavicka.join(";"), ...radky].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="zaci-${dnes}.csv"`, "Cache-Control": "private, no-store" },
  });
}
