import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import KartaAkce from "@/components/admin2/KartaAkce";
import ListaFiltru from "@/components/admin2/ListaFiltru";
import { DlazdiceMetriky, Info, Prazdne, zaku } from "@/components/admin2/Prvky";
import { UkolRadek, NovyUkol } from "@/components/admin2/Ukoly";
import { nactiDoporuceni, nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace, filtryDoAdresy, nactiFiltry } from "@/lib/admin2/data";
import { cileSezony, dlazdice, isoPred } from "@/lib/admin2/metriky";
import { nazevZdroje } from "@/lib/admin2/nastaveni";
import { zobraz } from "@/lib/admin2/sdileni";
import { cislo } from "@/lib/admin2/mala-cisla";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";

/**
 * Dnes (DN-01, DN-03, DN-04, DN-07, DN-08, DN-09): nahoře co čeká na mě (fronta akcí), pod tím
 * od poslední návštěvy, čísla s lidmi za nimi, cíle sezóny, plán týdne a kdo je teď v appce.
 */
export const metadata = { title: "Dnes · MateMax Admin" };

type SP = Promise<Record<string, string | string[] | undefined>>;

async function odPosledniNavstevy(demo: boolean): Promise<{ od: string | null; noviIds: string[]; treninku: number; trenovalo: number; platby: number; zpetna: number; chyby: number }> {
  const prazdne = { od: null, noviIds: [], treninku: 0, trenovalo: 0, platby: 0, zpetna: 0, chyby: 0 };
  if (demo || !supabaseAdmin) return prazdne;
  const db = supabaseAdmin;
  const { data } = await db.from("admin_nastaveni").select("hodnota").eq("klic", "navsteva").maybeSingle();
  const h = (data?.hodnota ?? {}) as { predchozi?: string; posledni?: string };
  const ted = new Date().toISOString();
  // Nová návštěva = víc než 30 min od poslední aktivity v adminu
  const novaNavsteva = !h.posledni || Date.now() - Date.parse(h.posledni) > 30 * 60_000;
  const od = novaNavsteva ? h.posledni ?? null : h.predchozi ?? null;
  await db.from("admin_nastaveni").upsert({ klic: "navsteva", hodnota: { predchozi: od, posledni: ted }, upraveno_at: ted });
  if (!od) return prazdne;
  const [tren, plat, fb, ch] = await Promise.all([
    db.from("procvicovani").select("user_id").gt("kdy", od).limit(1000),
    db.from("user_premium").select("user_id", { count: "exact", head: true }).gt("updated_at", od).not("stripe_subscription_id", "is", null),
    db.from("user_feedback").select("id", { count: "exact", head: true }).gt("created_at", od),
    db.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_name", "client_error_reported").gt("created_at", od),
  ]);
  return { od, noviIds: [], treninku: tren.data?.length ?? 0, trenovalo: new Set((tren.data ?? []).map((r) => r.user_id)).size, platby: plat.count ?? 0, zpetna: fb.count ?? 0, chyby: ch.count ?? 0 };
}

async function online(demo: boolean, idsZaku: Set<string>): Promise<{ zaci: string[]; anonymne: number }> {
  if (demo || !supabaseAdmin) return { zaci: [], anonymne: 0 };
  const [{ data: hb }, { data: nav }] = await Promise.all([
    supabaseAdmin.from("analytics_events").select("user_id").eq("event_name", "app_heartbeat").gte("created_at", new Date(Date.now() - 120_000).toISOString()).limit(200),
    supabaseAdmin.from("analytics_events").select("properties").eq("event_name", "page_viewed").gte("created_at", new Date(Date.now() - 300_000).toISOString()).limit(500),
  ]);
  const zaci = [...new Set((hb ?? []).map((r) => r.user_id as string).filter((u) => idsZaku.has(u)))];
  const anonymne = new Set((nav ?? []).filter((r) => !(r.properties as Record<string, unknown>)?.prihlasen).map((r) => (r.properties as Record<string, string>)?.v)).size;
  return { zaci, anonymne };
}

export default async function Dnes({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const demo = sp.demo === "1";
  const dnesD = new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric", timeZone: "Europe/Prague" });
  let obsah: React.ReactNode;
  const z = await bezMigrace(() => nactiZaklad(demo));
  if (!z) return <Stranka sekce="dnes" titulek="Dnes" demo={demo}><ChybaMigrace /></Stranka>;
  {
    const f = nactiFiltry(sp);
    const { aktivni, stavy } = await nactiDoporuceni(demo);
    const podleId = new Map(z.zaci.map((x) => [x.id, x]));
    const jm = (id: string) => { const x = podleId.get(id); return x ? zobraz(x, z.k.sdileni, z.ps).jmeno : "?"; };
    const dl = dlazdice(z.zaci, z.dny, f);
    const cile = cileSezony(z.zaci, z.nastaveni);
    const [od, onl, ukoly] = await Promise.all([
      odPosledniNavstevy(z.k.demo),
      online(z.k.demo, new Set(z.zaci.map((x) => x.id))),
      z.k.demo || !supabaseAdmin ? Promise.resolve({ data: [] as { id: number; nazev: string; popis: string | null; stav: string; termin: string | null }[] }) : supabaseAdmin.from("admin_ukoly").select("id, nazev, popis, stav, termin").eq("tento_tyden", true).or(`stav.neq.hotovo,hotovo_at.gte.${isoPred(7)}`).order("stav").order("priorita").order("created_at").limit(8),
    ]);
    const noviOd = od.od ? z.zaci.filter((x) => x.registrace > od.od!) : [];
    const q = filtryDoAdresy(f);
    const zdroje = [...new Set(z.zaci.map((x) => x.zdroj).filter(Boolean) as string[])].map((kod) => ({ kod, nazev: nazevZdroje(kod, z.nastaveni.kampane) }));
    const popisObdobi = f.obdobi === "dnes" ? "Dnes proti včerejšku" : `${new Date(f.od + "T12:00:00").toLocaleDateString("cs-CZ")} až ${new Date(f.do + "T12:00:00").toLocaleDateString("cs-CZ")} proti předchozím ${f.dni} dnům`;
    const fronta = aktivni.slice(0, 7);
    obsah = (
      <>
        <section className="a2-sekce" aria-labelledby="h-fronta">
          <h2 className="a2-h2" id="h-fronta"><span>Na co se podívat ({aktivni.length})</span>{aktivni.length > 7 && <span>nejdůležitějších 7</span>}</h2>
          {fronta.length === 0 && <Prazdne titulek="Nic nehoří.">Všechno vyřízené. Mrkni na <Link href={`/admin/novy/plan${q}`} style={{ color: "var(--a-modra)", fontWeight: 700 }}>plán týdne</Link>.</Prazdne>}
          {fronta.map((d) => (
            <KartaAkce key={d.klic} klic={d.klic} pravidlo={d.pravidlo} oblast={d.oblast} titulek={d.titulek} proc={d.proc}
              lide={d.lide.map((id) => ({ id, jmeno: jm(id), trida: podleId.get(id)?.trida ?? 9 }))} akce={d.akce} palec={stavy.get(d.klic)?.palec ?? null} naostro={z.nastaveni.emailyNaostro} />
          ))}
        </section>

        <section className="a2-sekce" aria-labelledby="h-od">
          <h2 className="a2-h2" id="h-od"><span>Od tvé poslední návštěvy</span>{od.od && <span style={{ textTransform: "none", letterSpacing: 0 }}>{new Date(od.od).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}</h2>
          {!od.od ? <Prazdne titulek={z.k.demo ? "V demu se návštěvy neměří." : "Měří se od dnešní návštěvy."}>Příště tu uvidíš, co se mezitím stalo.</Prazdne> : (
            <div className="a2-cipy" data-testid="a2-od-navstevy">
              <Link className="a2-cip" href={`/admin/novy/zaci?ids=${noviOd.map((x) => x.id).join(",")}`}>{noviOd.length} {noviOd.length === 1 ? "nový žák" : noviOd.length >= 2 && noviOd.length <= 4 ? "noví žáci" : "nových žáků"}</Link>
              <span className="a2-cip">{od.treninku} {od.treninku === 1 ? "trénink" : od.treninku >= 2 && od.treninku <= 4 ? "tréninky" : "tréninků"} · {zaku(od.trenovalo)}</span>
              <span className="a2-cip">{od.platby} {od.platby === 1 ? "platba" : od.platby >= 2 && od.platby <= 4 ? "platby" : "plateb"}</span>
              <span className="a2-cip">{od.zpetna} zpětné vazby</span>
              <Link className="a2-cip" href="/admin/navstevnost" style={od.chyby ? { borderColor: "var(--a-spatne)", color: "var(--a-spatne)" } : undefined}>{od.chyby} {od.chyby === 1 ? "chyba" : od.chyby >= 2 && od.chyby <= 4 ? "chyby" : "chyb"}</Link>
            </div>
          )}
          {noviOd.length > 0 && (
            <div className="a2-sekce">
              {noviOd.slice(0, 5).map((x) => (
                <Link key={x.id} href={`/admin/novy/zaci/${x.id}`} className="a2-karta" style={{ padding: "8px 12px" }}>
                  <span className="a2-radek a2-mezi"><b>{jm(x.id)} <span className={`a2-tr t${x.trida}`}>{x.trida}.</span></b><span className="a2-s">{nazevZdroje(x.zdroj, z.nastaveni.kampane)}</span></span>
                  <span className="a2-s">{x.diagnostika ? "✓ diagnostika" : "✗ diagnostika"} · {x.prvni_trenink ? "✓ 1. trénink" : "✗ 1. trénink"}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="a2-dva">
          <section className="a2-sekce" aria-labelledby="h-cisla">
            <h2 className="a2-h2" id="h-cisla"><span>Čísla</span><Link href={`/admin/novy/metriky${q}`}>slovník a strom metrik</Link></h2>
            <ListaFiltru zdroje={zdroje} popis={popisObdobi} />
            <div className="a2-dlazdice">
              {dl.map((d) => <DlazdiceMetriky key={d.id} d={d} href={`/admin/novy/zaci${filtryDoAdresy(f, { metrika: d.id })}`} />)}
            </div>
          </section>

          <div className="a2-sekce">
            <section className="a2-sekce" aria-labelledby="h-cile">
              <h2 className="a2-h2" id="h-cile"><span>Cíle sezóny</span><Link href="/admin/novy/nastaveni#cile">upravit</Link></h2>
              {cile.map((c) => (
                <div key={c.nazev} className="a2-karta" data-testid="a2-cil">
                  <div className="a2-radek a2-mezi"><b style={{ fontSize: 14 }}>{c.nazev}</b><span className="a2-s">do {new Date(c.doKdy + "T12:00:00").toLocaleDateString("cs-CZ")}</span></div>
                  {c.hodnota === null ? <span className="a2-s">Nemáme data. {c.poznamka}</span> : (
                    <>
                      <div className="a2-radek a2-mezi"><span className="a2-t">{cislo(c.hodnota)} <span className="a2-s">/ {c.od === c.az ? c.az : `${c.od}–${c.az}`} {c.jednotka}</span></span>{c.lide && <Link href={`/admin/novy/zaci?ids=${c.lide.join(",")}`} className="a2-s" style={{ color: "var(--a-modra)" }}>kdo</Link>}</div>
                      <div className="a2-pruh" role="img" aria-label={`${c.hodnota} z ${c.az}`}><span style={{ width: `${Math.min(100, (c.hodnota / Math.max(1, c.az)) * 100)}%` }} /><em style={{ left: `${Math.min(100, (c.od / Math.max(1, c.az)) * 100)}%` }} /></div>
                      {c.tempo !== null && <span className="a2-s">Současným tempem {c.tempo >= c.od ? "dojdeš" : "dojdeš jen"} na {c.tempo}{c.tempo < c.od ? `, chybí ${c.od - c.tempo} do spodní hranice` : ""}.</span>}
                      {c.poznamka && <span className="a2-s">{c.poznamka}</span>}
                    </>
                  )}
                </div>
              ))}
            </section>

            <section className="a2-sekce" aria-labelledby="h-plan">
              <h2 className="a2-h2" id="h-plan"><span>Plán týdne</span><Link href="/admin/novy/plan">celý plán</Link></h2>
              <div className="a2-karta">
                {(ukoly.data ?? []).length === 0 && <span className="a2-s">Zatím žádné úkoly. Přidej je tady, nebo z karty akce.</span>}
                {(ukoly.data ?? []).map((u) => <UkolRadek key={u.id} id={u.id} nazev={u.nazev} popis={u.popis} stav={u.stav} termin={u.termin} />)}
                {!z.k.demo && <NovyUkol />}
              </div>
            </section>

            <section className="a2-karta" aria-label="Teď v appce" data-testid="a2-online" style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className={`a2-stitek ${onl.zaci.length ? "ok" : "seda"}`}>● teď</span>
              <span className="a2-s">
                {onl.zaci.length ? onl.zaci.map((id) => <Link key={id} href={`/admin/novy/zaci/${id}`} style={{ color: "var(--a-modra)", fontWeight: 700, marginRight: 6 }}>{jm(id)}</Link>) : "Žádný žák v appce"}
                {" · "}{onl.anonymne} {onl.anonymne === 1 ? "návštěvník" : "návštěvníků"} bez účtu <Info>Žák je online, když appka za poslední 2 minuty poslala signál. Návštěvníci bez účtu = různá zařízení na webu za posledních 5 minut. Admin se nepočítá.</Info>
              </span>
            </section>
          </div>
        </div>
        <p className="a2-s">Přepočítáno {new Date().toLocaleTimeString("cs-CZ", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit" })} · počítá se z {zaku(z.zaci.length)} (bez testovacích účtů a admina) · den {pragueDateStr()}</p>
      </>
    );
  }
  return <Stranka sekce="dnes" titulek={`Dnes · ${dnesD}`} demo={demo}>{obsah}</Stranka>;
}
