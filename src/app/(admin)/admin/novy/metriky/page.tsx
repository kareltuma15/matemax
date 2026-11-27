import Link from "next/link";
import Stranka, { ChybaMigrace } from "@/components/admin2/Stranka";
import { Info } from "@/components/admin2/Prvky";
import { nactiZaklad } from "@/lib/admin2/stranka";
import { bezMigrace, filtryDoAdresy, nactiFiltry } from "@/lib/admin2/data";
import { DEFINICE, lideMetriky, vyhovujeFiltru, type MetrikaId } from "@/lib/admin2/metriky";

/**
 * Severka a strom metrik (DA-02) se slovníkem (DA-01). Každý uzel vede na lidi za číslem.
 * Celý slovník je i v docs/metriky.md.
 */
export const metadata = { title: "Metriky · MateMax Admin" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Metriky({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  let obsah: React.ReactNode;
  const z = await bezMigrace(() => nactiZaklad(sp.demo === "1"));
  if (!z) return <Stranka sekce="dnes" titulek="Severka a metriky"><ChybaMigrace /></Stranka>;
  {
    const f = nactiFiltry(sp);
    const zf = z.zaci.filter((x) => vyhovujeFiltru(x, f));
    const m = (id: MetrikaId) => lideMetriky(id, zf, z.dny, f.od, f.do);
    const novi = m("novi"), akt = m("aktivovani"), prav = m("pravidelni"), plat = m("platici"), test = m("testy");
    const vratili = zf.filter((x) => novi.lide.includes(x.id) && x.vratil_2den).length;
    const uzel = (id: MetrikaId | null, nazev: string, hodnota: string, popis: string, hlavni = false) => (
      <Link href={id ? `/admin/novy/zaci${filtryDoAdresy(f, { metrika: id })}` : `/admin/novy/zaci${filtryDoAdresy(f, { segment: "novi" })}`} className="a2-karta" style={hlavni ? { borderColor: "var(--a-akcent)", borderWidth: 2, background: "var(--a-akcent-slaby)" } : undefined}>
        <span className="a2-radek a2-mezi"><b>{nazev}</b><span className="a2-t">{hodnota}</span></span>
        <span className="a2-s">{popis}</span>
      </Link>
    );
    const vetev = { marginLeft: 14, paddingLeft: 12, borderLeft: "2px dashed var(--a-linka)", display: "flex", flexDirection: "column" as const, gap: 8 };
    obsah = (
      <>
        <p className="a2-s">Období {new Date(f.od + "T12:00:00").toLocaleDateString("cs-CZ")} až {new Date(f.do + "T12:00:00").toLocaleDateString("cs-CZ")}. Klepnutím na uzel uvidíš žáky.</p>
        <section className="a2-sekce" aria-label="Strom metrik">
          {uzel("pravidelni", "Pravidelní (severka)", String(prav.lide.length), DEFINICE.pravidelni.definice, true)}
          <div style={vetev}>
            {uzel("novi", "Noví žáci", String(novi.lide.length), DEFINICE.novi.definice)}
            <div style={vetev}>
              {uzel("aktivovani", "Aktivovaní", `${akt.lide.length} z ${akt.zaklad.length}`, DEFINICE.aktivovani.definice)}
              <div style={vetev}>{uzel(null, "Vrátili se 2. den", `${vratili} z ${novi.lide.length}`, "Z nových žáků v období ti, kdo trénovali den po registraci.")}</div>
            </div>
            {uzel("testy", "Z testů nanečisto", String(test.lide.length), DEFINICE.testy.definice)}
            {uzel("platici", "Platí Premium", String(plat.lide.length), DEFINICE.platici.definice)}
            <div className="a2-karta"><span className="a2-radek a2-mezi"><b>Pokrok (odhad bodů)</b><span className="a2-s">fáze B</span></span><span className="a2-s">Změna odhadu bodů od diagnostiky, orientační, dokud odhad nebude porovnaný s testy nanečisto.</span></div>
          </div>
        </section>
        <section className="a2-sekce">
          <h2 className="a2-h2">Kdo se nepočítá nikde <Info>Pravidlo je na jednom místě v databázi (funkce admin_zaci) a v kódu (src/lib/admin-data.ts).</Info></h2>
          <div className="a2-karta"><span>Testovací účty, admin, zařízení „Nepočítat“ a roboti. Čas je všude pražský. Malá čísla: vždy počet, procentní změna až od základu 20, pod 30 pozorování štítek „malý vzorek“.</span></div>
        </section>
      </>
    );
  }
  return <Stranka sekce="dnes" titulek="Severka a metriky" drobky={[{ nazev: "Dnes", href: "/admin/novy" }]}>{obsah}</Stranka>;
}
