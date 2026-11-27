import Link from "next/link";
import { notFound } from "next/navigation";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import AkceZaka from "@/components/admin2/AkceZaka";
import { Info, Prazdne } from "@/components/admin2/Prvky";
import { UkolRadek, NovyUkol } from "@/components/admin2/Ukoly";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace } from "@/lib/admin2/data";
import { jeZablokovany, NAZEV_STAVU, posunDen, dnyMezi, denZ, shrnutiZaka, stavZaka, uspesnost } from "@/lib/admin2/metriky";
import { nazevZdroje } from "@/lib/admin2/nastaveni";
import { zobraz, skryjEmail } from "@/lib/admin2/sdileni";
import { nactiOsu, type TypUdalosti } from "@/lib/admin2/osa";
import { prezdivkaUctu } from "@/lib/prezdivka";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { zapisAudit } from "@/lib/admin-audit";
import { stavAdmina } from "@/lib/admin2/auth";
import { pragueDateStr } from "@/lib/date";
import type { Zak } from "@/lib/admin2/typy";
import { DRUHY_SCHRANKY, kroky as krokyZpravy, nazevSablony, nazevStavu, platbyZaka, zpravyZaka } from "@/lib/admin2/zpravy";
import { kdy } from "@/lib/admin2/cas";

/**
 * Karta žáka (ZA-04 až ZA-09) jako stránka s vlastní adresou: hlavička, shrnutí jednou větou,
 * rychlé akce, aktivace s časy a záložky Přehled, Časová osa, Platby (Učení, Testy, Zprávy, Rodina ve fázi B).
 * Otevření karty se zapisuje do auditu.
 */
export const metadata = { title: "Žák · MateMax Admin" };
type P = Promise<{ id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

const ZALOZKY: [string, string, string | null][] = [["prehled", "Přehled", null], ["osa", "Časová osa", null], ["platby", "Platby", null], ["uceni", "Učení", "B"], ["testy", "Testy", "B"], ["zpravy", "Zprávy", null], ["rodina", "Rodina", "B"]];
const TYPY: [TypUdalosti | "", string][] = [["", "Vše"], ["trenink", "Trénink"], ["zpravy", "Zprávy"], ["platby", "Platby"], ["ucet", "Účet"], ["admin", "Admin"]];
const cas = (iso: string | null) => (iso ? new Date(iso).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const za = (od: string, doo: string | null) => { if (!doo) return ""; const m = Math.round((Date.parse(doo) - Date.parse(od)) / 60000); return m < 60 ? `za ${Math.max(0, m)} min` : m < 1440 ? `za ${Math.round(m / 60)} h` : `za ${Math.round(m / 1440)} d`; };

export default async function KartaZaka({ params, searchParams }: { params: P; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const demo = sp.demo === "1";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const zalozka = ZALOZKY.find(([k]) => k === sp.tab)?.[0] ?? "prehled";
  let titulek = "Žák";
  let obsah: React.ReactNode;
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="zaci" titulek="Žák" drobky={[{ nazev: "Žáci", href: "/admin/novy/zaci" }]} demo={demo}><ChybaMigrace /></Stranka>;
  {
    let zak: Zak | undefined = z.zaci.find((x) => x.id === id);
    let vyloucen: string | null = null;
    let meta: Record<string, unknown> = {}, appMeta: Record<string, unknown> = {}, deaktivovan = false;
    if (!z.k.demo && supabaseAdmin) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      const u = data.user;
      if (!u && !zak) notFound();
      if (u) {
        meta = u.user_metadata ?? {}; appMeta = u.app_metadata ?? {};
        deaktivovan = jeZablokovany(u as { banned_until?: string | null });
        if (!zak) {
          vyloucen = appMeta.testovaci ? "Testovací účet: nikde se nepočítá." : "Účet se nepočítá (admin).";
          zak = { id, email: u.email ?? null, jmeno: (meta.first_name as string) || null, trida: Number(meta.trida) === 5 ? 5 : 9, registrace: u.created_at, zdroj: (meta.zdroj as string) ?? null, odkud: (meta.odkud as string) ?? null, email_overen: u.email_confirmed_at ?? null, posledni_prihlaseni: u.last_sign_in_at ?? null, diagnostika: null, prvni_trenink: null, posledni_aktivita: null, dny_7: 0, dny_celkem: 0, odpovedi: 0, spravne: 0, vratil_2den: false, premium: "zdarma", premium_do: null, souhlas_podminky: null, souhlas_novinky: null, prezdivka: (meta.prezdivka as string) ?? null, rodic_email: null, propojeno_vysledky: null, odhlasen_emaily: false };
        }
      }
      const s = await stavAdmina();
      if (s.ok) await zapisAudit({ adminId: s.user.id, akce: "karta_otevrena", cilUserId: id });
    }
    if (!zak) notFound();
    const dnes = pragueDateStr();
    const zz = zobraz(zak, z.k.sdileni, z.ps);
    titulek = zz.jmeno;
    const zdroj = nazevZdroje(zak.zdroj, z.nastaveni.kampane);
    const osa = await nactiOsu(zak, z.k);
    const stav = stavZaka(zak, z.nastaveni, dnes);
    const u = uspesnost(zak);
    // 3 dny v týdnu: první den, kdy měl za posledních 7 dní 3 dny s tréninkem
    const dnyZaka = [...(z.dny.get(id) ?? [])].sort();
    const tri = dnyZaka.find((d) => dnyZaka.filter((x) => x <= d && x >= posunDen(d, -6)).length >= 3) ?? null;
    const regDen = denZ(zak.registrace);
    const aktivace: { nazev: string; kdy: string | null; ok: boolean; pozn?: string }[] = [
      { nazev: "Registrace", kdy: zak.registrace, ok: true },
      { nazev: "Potvrzení e-mailu", kdy: zak.email_overen, ok: !!zak.email_overen },
      { nazev: "Diagnostika", kdy: zak.diagnostika, ok: !!zak.diagnostika },
      { nazev: "1. trénink", kdy: zak.prvni_trenink, ok: !!zak.prvni_trenink },
      { nazev: "Návrat 2. den", kdy: zak.vratil_2den ? `${posunDen(regDen, 1)}T12:00:00Z` : null, ok: zak.vratil_2den, pozn: !zak.vratil_2den && dnyMezi(regDen, dnes) >= 2 ? `nevrátil se${zak.posledni_aktivita && zak.posledni_aktivita > posunDen(regDen, 1) ? `, další trénink ${new Date(zak.posledni_aktivita + "T12:00:00").toLocaleDateString("cs-CZ")}` : ""}` : undefined },
      { nazev: "3 dny v týdnu", kdy: tri ? `${tri}T12:00:00Z` : null, ok: !!tri, pozn: tri ? undefined : `zatím ${zak.dny_7} za posledních 7 dní` },
      { nazev: "Stránka Premium", kdy: osa.premiumVidel, ok: !!osa.premiumVidel },
      { nazev: "Platba", kdy: null, ok: zak.premium === "stripe", pozn: zak.premium === "stripe" ? "platí přes Stripe" : undefined },
    ];
    const nejblizsiTyp = typeof sp.typ === "string" ? (sp.typ as TypUdalosti) : "";
    const vyber = zak;
    const [ukoly, pozn] = z.k.demo || !supabaseAdmin ? [[], []] as const : await Promise.all([
      supabaseAdmin.from("admin_ukoly").select("id, nazev, popis, stav, termin").contains("zaci", [id]).neq("stav", "hotovo").limit(10).then((r) => r.data ?? []),
      supabaseAdmin.from("admin_poznamky").select("id, text, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(5).then((r) => r.data ?? []),
    ]);
    const zebricekSkryty = !!appMeta.zebricek_skryty;
    const prezdivka = prezdivkaUctu(id, meta);
    const zpr = zalozka === "zpravy" ? await zpravyZaka(z.k, id) : null;
    const platby = zalozka === "platby" ? await platbyZaka(z.k, id) : [];
    const odkazTab = (t: string) => `/admin/novy/zaci/${id}${t === "prehled" ? "" : `?tab=${t}`}`;

    const osaVypis = (omezit?: number) => {
      const navstevy = osa.navstevy.map((n) => ({ ...n, polozky: n.polozky.filter((p) => !nejblizsiTyp || p.typ === nejblizsiTyp) })).filter((n) => n.polozky.length || (!nejblizsiTyp && n.minut));
      const vypis = omezit ? navstevy.slice(0, omezit) : navstevy;
      return (
        <div className="a2-osa" data-testid="a2-osa">
          {vypis.map((n) => (
            <div key={n.od + n.nazev}>
              <div className="n">{n.nazev}</div>
              {n.polozky.map((p, i) => <div key={i} className="p"><time dateTime={p.cas}>{new Date(p.cas).toLocaleTimeString("cs-CZ", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit" })}</time><span>{p.text}</span></div>)}
              {!n.polozky.length && <div className="p"><time /><span className="a2-s">Byl v appce, bez dokončené aktivity</span></div>}
            </div>
          ))}
          {(!omezit || !nejblizsiTyp) && osa.predRegistraci.length > 0 && (!omezit || vypis.length < omezit + 1) && (
            <div>
              <div className="n">Před registrací · stejné zařízení · {new Date(osa.predRegistraci[0].cas).toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })}</div>
              {osa.predRegistraci.map((p, i) => <div key={i} className="p"><time>{new Date(p.cas).toLocaleTimeString("cs-CZ", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit" })}</time><span>{p.text}</span></div>)}
            </div>
          )}
          {!vypis.length && !osa.predRegistraci.length && <Prazdne titulek="Zatím nic.">Časová osa se plní od registrace. Cesta před registrací se měří od 27. 11. 2026.</Prazdne>}
        </div>
      );
    };

    obsah = (
      <>
        {vyloucen && <div className="a2-banner" style={{ background: "var(--a-pozor-slaby)", color: "var(--a-pozor)" }}>{vyloucen}</div>}
        <section className="a2-karta" style={{ gap: 8 }} data-testid="a2-karta-hlavicka">
          <div className="a2-radek" style={{ gap: 8 }}>
            <span className={`a2-av t${vyber.trida}`}>{zz.jmeno.replace("Žák ", "").slice(0, 2)}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="a2-radek" style={{ gap: 6 }}><b style={{ fontSize: 18 }}>{zz.jmeno}</b><span className={`a2-tr t${vyber.trida}`}>{vyber.trida}.</span><span className="a2-stitek">{NAZEV_STAVU[stav]}</span><span className={`a2-stitek ${vyber.premium === "zdarma" ? "seda" : "ok"}`}>{vyber.premium === "stripe" ? "Premium (Stripe)" : vyber.premium === "rucne" ? `Premium ručně${vyber.premium_do ? ` do ${new Date(vyber.premium_do).toLocaleDateString("cs-CZ")}` : ""}` : vyber.premium === "zkusebni" ? "Zkouší Premium" : "Zdarma"}</span>{deaktivovan && <span className="a2-stitek spatne">deaktivován</span>}</div>
              {!z.k.sdileni && <span className="a2-s">{zz.email}{vyber.prezdivka || prezdivka ? ` · v žebříčku „${prezdivka}“${zebricekSkryty ? " (skrytý)" : ""}` : ""}</span>}
            </div>
          </div>
          <span className="a2-s">Přišel {cas(vyber.registrace)} · <b>{zdroj}</b>{vyber.odkud ? ` · sám uvedl: ${vyber.odkud}` : ""} · {osa.zarizeni ?? "zařízení neznámé"}</span>
          <span className="a2-s">Dosažitelnost: e-mail {vyber.email_overen ? "ověřen ✓" : "neověřen ✗"}{vyber.odhlasen_emaily ? " (odhlásil e-maily)" : ""} · push ✗ (nikdo nepovolil) · PWA neměří se</span>
          <span className="a2-s">Souhlasy: {vyber.souhlas_podminky ? `podmínky ✓ (${new Date(vyber.souhlas_podminky).toLocaleDateString("cs-CZ")})` : "podmínky: registrace před 27. 11. 2026, neevidováno"} · novinky e-mailem {vyber.souhlas_novinky === null ? "neevidováno" : vyber.souhlas_novinky ? "ano" : "ne"} · e-mail rodiče pro report: {skryjEmail(vyber.rodic_email, z.k.sdileni) ?? "nemá"}</span>
          <p className="a2-zaver" data-testid="a2-shrnuti">{shrnutiZaka(vyber, zdroj, osa.nejslabsi, dnes)}</p>
          <AkceZaka id={id} jmeno={zz.jmeno} trida={vyber.trida} premium={vyber.premium} premiumDo={vyber.premium_do} naostro={z.nastaveni.emailyNaostro} testovaci={!!appMeta.testovaci} deaktivovan={deaktivovan} zebricekSkryty={zebricekSkryty} prezdivka={(meta.prezdivka as string) ?? ""} demo={z.k.demo} otevrit={sp.akce === "email" ? "email" : sp.akce === "premium" ? "premium" : undefined} />
        </section>

        <nav className="a2-zalozky" aria-label="Záložky karty">
          {ZALOZKY.map(([k, n, f]) => <Link key={k} href={odkazTab(k)} aria-current={zalozka === k ? "page" : undefined}>{n}{f ? <span className="a2-s" style={{ marginLeft: 4 }}>({f})</span> : null}</Link>)}
        </nav>

        {zalozka === "prehled" && (
          <div className="a2-dva">
            <section className="a2-sekce" aria-labelledby="h-akt">
              <h2 className="a2-h2" id="h-akt">Aktivace</h2>
              <div className="a2-karta" data-testid="a2-aktivace">
                {aktivace.map((a) => (
                  <span key={a.nazev} className="a2-check" style={{ alignItems: "center" }}>
                    <span aria-hidden="true" style={{ color: a.ok ? "var(--a-ok)" : "var(--a-slaby)", fontWeight: 800 }}>{a.ok ? "✓" : "○"}</span>
                    <span>{a.nazev}{a.kdy && <span className="a2-s"> · {a.nazev === "Registrace" ? cas(a.kdy) : za(vyber.registrace, a.kdy)}</span>}{a.pozn && <span className="a2-s"> · {a.pozn}</span>}</span>
                  </span>
                ))}
              </div>
              <h2 className="a2-h2">Učení v kostce <Info>Úspěšnost z dokončených tréninků (souhrny po tématech). Detail po úlohách, čas a opakování přijdou ve fázi B z nového logu odpovědí.</Info></h2>
              <div className="a2-karta">
                <span>{vyber.dny_celkem} dní s tréninkem · {vyber.dny_7} za posledních 7 dní{u !== null ? ` · úspěšnost ${u} % (${vyber.odpovedi} odpovědí)` : ""}</span>
                {osa.temata.slice(0, 5).map((t) => <span key={t.nazev} className="a2-radek a2-mezi"><span>{t.nazev}</span><span className="a2-s">{Math.round((t.ok / t.n) * 100)} % ({t.ok} z {t.n})</span></span>)}
                {!osa.temata.length && <span className="a2-s">Zatím žádné souhrny tréninku.</span>}
              </div>
            </section>
            <section className="a2-sekce" aria-labelledby="h-posl">
              <h2 className="a2-h2" id="h-posl"><span>Poslední aktivita</span><Link href={odkazTab("osa")}>celá osa</Link></h2>
              <div className="a2-karta">{osaVypis(2)}</div>
              <h2 className="a2-h2">Poznámky a úkoly</h2>
              <div className="a2-karta">
                {pozn.map((p) => <span key={p.id as number} className="a2-s"><b>{new Date(p.created_at as string).toLocaleDateString("cs-CZ")}:</b> {p.text as string}</span>)}
                {ukoly.map((x) => <UkolRadek key={x.id as number} id={x.id as number} nazev={x.nazev as string} popis={x.popis as string | null} stav={x.stav as string} termin={x.termin as string | null} />)}
                {!pozn.length && !ukoly.length && <span className="a2-s">Žádné poznámky ani úkoly.</span>}
                {!z.k.demo && <NovyUkol zaci={[id]} />}
              </div>
            </section>
          </div>
        )}
        {zalozka === "osa" && (
          <section className="a2-sekce">
            <div className="a2-cipy" role="group" aria-label="Typ událostí">
              {TYPY.map(([k, n]) => <Link key={k} className="a2-cip" aria-current={nejblizsiTyp === k ? "true" : undefined} href={`/admin/novy/zaci/${id}?tab=osa${k ? `&typ=${k}` : ""}`}>{n}</Link>)}
            </div>
            <div className="a2-karta">{osaVypis()}</div>
            <p className="a2-s">Návštěva = signály z appky s mezerou nejvýš 30 minut. Technické signály se neukazují, jen z nich vzniká délka návštěvy.</p>
          </section>
        )}
        {zalozka === "platby" && (
          <section className="a2-sekce">
            <div className="a2-karta">
              <b>{vyber.premium === "stripe" ? "Platí Premium přes Stripe" : vyber.premium === "rucne" ? "Ručně udělené Premium" : vyber.premium === "zkusebni" ? "Zkušební období" : "Bez Premium"}</b>
              {vyber.premium_do && <span className="a2-s">Do {new Date(vyber.premium_do).toLocaleDateString("cs-CZ")}</span>}
              {osa.navstevy.flatMap((n) => n.polozky).filter((p) => p.typ === "platby").map((p, i) => <span key={i} className="a2-s">{cas(p.cas)} · {p.text}</span>)}
              {platby.map((p, i) => <span key={`s${i}`} className="a2-s">{cas(p.cas)} · {p.druh === "zaplaceno" ? "Zaplaceno" : "Vráceno"} {p.castka.toLocaleString("cs-CZ")} {p.mena === "CZK" ? "Kč" : p.mena}</span>)}
              <span className="a2-s">Zaplacené faktury a vrácené platby ze Stripe se ukládají od 27. 11. 2026 (po přidání událostí ve Stripe). Starší jsou ve Stripe.</span>
            </div>
          </section>
        )}
        {zalozka === "zpravy" && zpr && (
          <section className="a2-sekce" data-testid="a2-zpravy-zaka">
            {zpr.chybi ? <Prazdne titulek="Chybí migrace pro Zprávy.">Spusť supabase/migrations/20261128_admin_b1.sql.</Prazdne> : (
              <>
                {zpr.schranka.length > 0 && (
                  <>
                    <h2 className="a2-h2"><span>Od žáka</span><Link href="/admin/novy/zpravy">Schránka</Link></h2>
                    {zpr.schranka.map((p) => <div key={p.id} className={`a2-karta${p.stav === "nove" ? " a2-nova" : ""}`}><div className="a2-radek a2-mezi"><b>{DRUHY_SCHRANKY[p.druh]}</b><span className="a2-s">{kdy(p.created_at)}{p.stav === "vyrizeno" ? " · vyřízeno" : ""}</span></div>{p.text && <div className="a2-bublina">{p.text}</div>}</div>)}
                  </>
                )}
                <h2 className="a2-h2"><span>Odeslané zprávy · {zpr.zpravy.length}</span></h2>
                {zpr.zpravy.length === 0 ? <Prazdne titulek="Zatím nic.">Log zpráv běží od 27. 11. 2026. Starší e-maily jsou na časové ose.</Prazdne> : (
                  <div className="a2-karta">
                    {zpr.zpravy.map((m) => { const kr = krokyZpravy(m, zpr.stavy.get(m.id) ?? []); const hist = zpr.stavy.get(m.id) ?? []; return (
                      <div key={m.id} className="a2-zprava">
                        <span className="a2-t">{m.predmet ?? nazevSablony(m.sablona)}{m.prijemce_typ === "rodic" ? " (rodiči)" : ""}</span>
                        <span className="a2-tecky" title={nazevStavu(m.stav)}><b className={kr.odeslano ? "ok" : "sp"} /><b className={kr.problem ? "sp" : kr.doruceno ? "ok" : ""} /><b className={kr.kliknuto ? "ok" : ""} /><b className={kr.odpoved ? "ok" : ""} /></span>
                        <span className="a2-s" style={{ gridColumn: "1 / -1" }}>{m.kanal === "push" ? "push" : "e-mail"} · {cas(m.odeslano_at)} · {hist.filter((s) => s.stav !== "odeslano").map((s) => `${nazevStavu(s.stav).toLowerCase()} ${za(m.odeslano_at, s.cas)}`).join(" · ") || nazevStavu(m.stav).toLowerCase()}{m.testovaci ? " · test" : ""}</span>
                      </div>
                    ); })}
                  </div>
                )}
                <p className="a2-s">Tečky: odesláno · doručeno (u push zobrazeno) · kliknuto · odpověděl.</p>
              </>
            )}
          </section>
        )}
        {["uceni", "testy", "rodina"].includes(zalozka) && (
          <Prazdne titulek="Přijde ve fázi B (do 22. 1.).">
            {zalozka === "uceni" ? "Témata, posledních 50 odpovědí s časem, opakování a odhad bodů. Data se sbírají od 27. 11. 2026." : zalozka === "testy" ? `Body z testů nanečisto vedle tréninku. ${vyber.propojeno_vysledky ? `Účet je propojený s Vyhodnocením od ${new Date(vyber.propojeno_vysledky).toLocaleDateString("cs-CZ")}.` : "Účet zatím není propojený s Vyhodnocením."}`  : `Rodič, sourozenci a odběr reportu. E-mail rodiče: ${skryjEmail(vyber.rodic_email, z.k.sdileni) ?? "nemá"}.`}
          </Prazdne>
        )}
      </>
    );
  }
  return <Stranka sekce="zaci" titulek={titulek} drobky={[{ nazev: "Žáci", href: "/admin/novy/zaci" }]} demo={demo}>{obsah}</Stranka>;
}
