import Stranka from "@/components/admin2/Stranka";

/** Hlas uživatelů přijde ve fázi C. */
export const metadata = { title: "Hlas · MateMax Admin" };

export default function Hlas() {
  return (
    <Stranka sekce="hlas" titulek="Hlas">
      <div className="a2-prazdne">
        <b>Přijde ve fázi C (do 22. 2.).</b>
        <span>Mikroankety, témata zpětné vazby a nápady s lidmi, kteří o ně stáli. „Odkud ses o nás dozvěděl?“ se sbírá při registraci od 27. 11. 2026 a je vidět na kartě žáka.</span>
      </div>
    </Stranka>
  );
}
