import Link from "next/link";
import Stranka from "@/components/admin2/Stranka";
import NastaveniForm from "@/components/admin2/NastaveniForm";
import { nactiKontext } from "@/lib/admin2/stranka";
import { nactiNastaveni } from "@/lib/admin2/nastaveni";
import { stavAdmina } from "@/lib/admin2/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { vsechnyUcty } from "@/lib/admin-data";
import { isoPred } from "@/lib/admin2/metriky";

/**
 * Systém (fáze A): zabezpečení (druhý faktor), nastavení (SY-03), audit (SY-02), testovací účty
 * a které sekce adminu používáš (admin se učí). Zdraví, limity a zálohy přijdou ve fázi B.
 */
export const metadata = { title: "Systém · MateMax Admin" };

const NAZVY_AKCI: Record<string, string> = {
  karta_otevrena: "otevřel kartu žáka", premium_udeleno: "udělil Premium", premium_odebrano: "odebral Premium", diagnostika_resetovana: "resetoval diagnostiku",
  testovaci_zmeneno: "změnil testovací účet", utrata_zapsana: "zapsal útratu za reklamu", poznamka_zapsana: "zapsal poznámku do grafu", email_odeslan_rucne: "poslal e-mail",
  export_ucty: "exportoval data", doporuceni_zmeneno: "vyřídil doporučení", ukol_zmenen: "upravil úkol", poznamka_zaka: "zapsal poznámku k žákovi", stitek_zmenen: "změnil štítky",
  nastaveni_zmeneno: "změnil nastavení", trida_zmenena: "změnil třídu", zebricek_zmenen: "upravil žebříček", reset_hesla_odeslan: "poslal odkaz na heslo", ucet_deaktivovan: "deaktivoval účet", ucet_smazan: "smazal účet", hodnoceni_ulozeno: "uložil hodnocení testu",
};

export default async function Nastaveni() {
  const [k, n, s] = await Promise.all([nactiKontext(), nactiNastaveni(), stavAdmina(true)]);
  let audit: { akce: string; created_at: string; vysledek: string; detail: Record<string, unknown> }[] = [];
  let pouziti: { sekce: string; pocet: number }[] = [];
  let testovaci = 0;
  if (supabaseAdmin) {
    const [a, p, u] = await Promise.all([
      supabaseAdmin.from("admin_audit").select("akce, created_at, vysledek, detail").order("created_at", { ascending: false }).limit(30),
      supabaseAdmin.from("admin_pouziti").select("sekce, pocet").gte("den", isoPred(14).slice(0, 10)).limit(500),
      vsechnyUcty().catch(() => []),
    ]);
    audit = (a.data ?? []) as typeof audit;
    const m = new Map<string, number>();
    for (const r of p.data ?? []) m.set(r.sekce as string, (m.get(r.sekce as string) ?? 0) + (r.pocet as number));
    pouziti = [...m].map(([sekce, pocet]) => ({ sekce, pocet })).sort((x, y) => y.pocet - x.pocet);
    testovaci = u.filter((x) => (x.app_metadata as Record<string, unknown> | undefined)?.testovaci).length;
  }
  return (
    <Stranka sekce="system" titulek="Systém" bezFaktoru>
      <div className="a2-dva">
        <div className="a2-sekce">
          <h2 className="a2-h2">Zabezpečení</h2>
          <div className="a2-karta">
            <b>Druhý faktor: {s.ok && s.maFaktor ? "zapnutý ✓" : "vypnutý"}</b>
            <span className="a2-s">Admin vidí údaje dětí. S druhým faktorem se kromě hesla zadává kód z aplikace v telefonu (Google Authenticator, Microsoft Authenticator, 1Password). Zdarma v Supabase.</span>
            <Link className="a2-btn a2-male" style={{ alignSelf: "flex-start" }} href="/admin/novy/zabezpeceni">{s.ok && s.maFaktor ? "Spravovat" : "Zapnout druhý faktor"}</Link>
            <span className="a2-s">Admin se neindexuje a necachuje. Každá akce se zapisuje do auditu (níže).</span>
          </div>
          <NastaveniForm vychozi={n} demo={k.demo} />
        </div>
        <div className="a2-sekce">
          <h2 className="a2-h2"><span>Které sekce používáš (14 dní)</span></h2>
          <div className="a2-karta">
            {!pouziti.length && <span className="a2-s">Měří se od nasazení nového adminu.</span>}
            {pouziti.map((p) => <span key={p.sekce} className="a2-radek a2-mezi"><span>{p.sekce}</span><span className="a2-s">{p.pocet}×</span></span>)}
            <span className="a2-s">Podle toho admin po každé fázi upravíme.</span>
          </div>
          <h2 className="a2-h2">Audit (posledních 30 akcí)</h2>
          <div className="a2-karta" data-testid="a2-audit">
            {!audit.length && <span className="a2-s">Zatím žádné akce.</span>}
            {audit.map((a, i) => <span key={i} className="a2-radek a2-mezi" style={{ flexWrap: "nowrap" }}><span>{NAZVY_AKCI[a.akce] ?? a.akce}{a.detail?.rezim === "test" ? " (test)" : ""}{a.vysledek === "chyba" ? " ✗" : ""}</span><span className="a2-s" style={{ whiteSpace: "nowrap" }}>{new Date(a.created_at).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span></span>)}
          </div>
          <h2 className="a2-h2">Kdo se nepočítá</h2>
          <div className="a2-karta">
            <span>{testovaci} testovacích účtů, admin účet a zařízení „Nepočítat“. Roboti a náhledy odkazů se neměří vůbec.</span>
            <span className="a2-s">Účet označíš jako testovací na kartě žáka (⋯ → Označit jako testovací).</span>
          </div>
          <h2 className="a2-h2">Zdraví, limity a zálohy</h2>
          <div className="a2-prazdne"><b>Přijde ve fázi B.</b><span>Chyby, běh cronů, webhooky, využití tarifů (Supabase, Vercel Pro, Resend Free) a datum poslední zálohy.</span></div>
        </div>
      </div>
    </Stranka>
  );
}
