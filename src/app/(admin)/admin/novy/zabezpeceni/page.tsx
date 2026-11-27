import Stranka from "@/components/admin2/Stranka";
import { ZapnutiFaktoru } from "@/components/admin2/DruhyFaktor";

/** Zapnutí druhého faktoru (SY-01). Přístupné i bez ověřeného faktoru. */
export const metadata = { title: "Zabezpečení · MateMax Admin" };

export default function Zabezpeceni() {
  return (
    <Stranka sekce="system" titulek="Zabezpečení" drobky={[{ nazev: "Systém", href: "/admin/novy/nastaveni" }]} bezFaktoru>
      <ZapnutiFaktoru />
      <p className="a2-s">Po zapnutí bude nový i starý admin chtít při přihlášení kód z aplikace. Studentské appky se to netýká.</p>
    </Stranka>
  );
}
