"use client";

// DOČASNÁ testovací stránka pro obrázky úloh (hybridní model) — po ověření smazat.
import TaskImageView from "@/components/TaskImageView";
import type { TaskImage } from "@/types";

const UKAZKY: { nadpis: string; img: TaskImage }[] = [
  // ── Parametrické ──
  { nadpis: "Úhly u rovnoběžek — střídavé", img: { kind: "parametric", diagram: { typ: "uhel_pricka", danyUhel: 65, hledany: "stridavy" } } },
  { nadpis: "Úhly u rovnoběžek — souhlasné", img: { kind: "parametric", diagram: { typ: "uhel_pricka", danyUhel: 110, hledany: "souhlasny" } } },
  { nadpis: "Trojúhelník — hledaný úhel γ", img: { kind: "parametric", diagram: { typ: "trojuhelnik", alfa: 55, beta: 40, hledany: "gama" } } },
  { nadpis: "Trojúhelník se stranami", img: { kind: "parametric", diagram: { typ: "trojuhelnik", strany: { a: "5 cm", b: "4 cm", c: "6 cm" } } } },
  { nadpis: "Obdélník", img: { kind: "parametric", diagram: { typ: "obdelnik", sirka: "6 cm", vyska: "4 cm" } } },
  { nadpis: "Lichoběžník — obsah (a, c, v)", img: { kind: "parametric", diagram: { typ: "lichobeznik", a: "8 cm", c: "4 cm", vyska: "5 cm" } } },
  { nadpis: "Lichoběžník — obvod (základny + ramena)", img: { kind: "parametric", diagram: { typ: "lichobeznik", a: "10 cm", c: "6 cm", b: "4 cm", d: "4 cm" } } },
  { nadpis: "Kruh — poloměr", img: { kind: "parametric", diagram: { typ: "kruh", polomer: "r = 5 cm" } } },
  { nadpis: "Kruh — průměr", img: { kind: "parametric", diagram: { typ: "kruh", prumer: "d = 10 cm" } } },
  // ── Koláčový graf (formát CERMAT) ──
  { nadpis: "Koláč — denní činnosti (4 výseče)", img: { kind: "parametric", diagram: { typ: "kolac", nazev: "Denní činnosti (24 h)", casti: [{ label: "zaměstnání", procenta: 25 }, { label: "spánek", procenta: 35 }, { label: "denní povinnosti", procenta: 30 }, { label: "volný čas", procenta: 10 }] } } },
  { nadpis: "Koláč — volný čas (3 výseče)", img: { kind: "parametric", diagram: { typ: "kolac", nazev: "Volný čas", casti: [{ label: "TV", procenta: 40 }, { label: "sport", procenta: 35 }, { label: "četba", procenta: 25 }] } } },
  // ── Sloupcový graf (formát CERMAT) ──
  { nadpis: "Sloupce — prodej zmrzliny (5 dní)", img: { kind: "parametric", diagram: { typ: "sloupce", nazev: "Prodej zmrzliny", jednotka: "ks", sloupce: [{ label: "Po", hodnota: 20 }, { label: "Út", hodnota: 35 }, { label: "St", hodnota: 15 }, { label: "Čt", hodnota: 40 }, { label: "Pá", hodnota: 30 }] } } },
  { nadpis: "Sloupce — počet sourozenců (4 sloupce)", img: { kind: "parametric", diagram: { typ: "sloupce", nazev: "Počet sourozenců ve třídě", jednotka: "žáků", sloupce: [{ label: "0", hodnota: 8 }, { label: "1", hodnota: 12 }, { label: "2", hodnota: 6 }, { label: "3", hodnota: 4 }] } } },
  // ── Chybějící údaj (?) — CERMAT trik ──
  { nadpis: "Koláč s chybějícím údajem (?)", img: { kind: "parametric", diagram: { typ: "kolac", nazev: "Denní činnosti (24 h)", casti: [{ label: "zaměstnání", procenta: 25 }, { label: "spánek", procenta: 35 }, { label: "denní povinnosti", procenta: 30 }, { label: "volný čas", procenta: 10, skryta: true }] } } },
  { nadpis: "Sloupce s chybějícím údajem (?)", img: { kind: "parametric", diagram: { typ: "sloupce", nazev: "Prodej zmrzliny", jednotka: "ks", sloupce: [{ label: "Po", hodnota: 20 }, { label: "Út", hodnota: 35, skryta: true }, { label: "St", hodnota: 15 }, { label: "Čt", hodnota: 40 }, { label: "Pá", hodnota: 30 }] } } },
  // ── Úhly rozšíření (mnohoúhelník) ──
  { nadpis: "Čtyřúhelník — chybějící úhel", img: { kind: "parametric", diagram: { typ: "mnohouhelnik", uhly: [110, 70, 95, null] } } },
  { nadpis: "Pětiúhelník — chybějící úhel", img: { kind: "parametric", diagram: { typ: "mnohouhelnik", uhly: [100, 110, 120, 100, null] } } },
  { nadpis: "Šestiúhelník (ukázka)", img: { kind: "parametric", diagram: { typ: "mnohouhelnik", uhly: [120, 120, 120, 120, 120, null] } } },
  // ── Prostorová tělesa ──
  { nadpis: "Kvádr (a, b, c)", img: { kind: "parametric", diagram: { typ: "teleso", tvar: "kvadr", a: "5 cm", b: "3 cm", c: "4 cm" } } },
  { nadpis: "Krychle (hrana a)", img: { kind: "parametric", diagram: { typ: "teleso", tvar: "krychle", a: "3 cm" } } },
  { nadpis: "Válec (r, v)", img: { kind: "parametric", diagram: { typ: "teleso", tvar: "valec", r: "r = 2 cm", v: "v = 5 cm" } } },
  // ── Tabulky ──
  { nadpis: "Tabulka s chybějící buňkou (?)", img: { kind: "tabulka", nazev: "Prodej zmrzliny za týden", hlavicka: ["Den", "Prodej (ks)"], radky: [["Po", 20], ["Út", null], ["St", 15], ["Čt", 40], ["Pá", 30], ["Celkem", 140]] } },
  { nadpis: "Dvourozměrná tabulka", img: { kind: "tabulka", nazev: "Počet rodin podle počtu psů", hlavicka: ["Ulice", "0 psů", "1 pes", "2 psi", "3 psi"], radky: [["Jižní", 33, 8, 5, 2], ["Severní", 23, 12, 1, 4]] } },
  // ── Statické (dlouhý ocas) ──
  { nadpis: "Statický obrázek (SVG z public/)", img: { kind: "static", url: "/obrazky/ukazka/staticka-ukazka.svg", width: 320, height: 210, alt: "Trojúhelník s výškou v = 8 cm a základnou a = 10 cm" } },
];

export default function DiagramTest() {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, maxWidth: 420, margin: "0 auto", color: "var(--text-primary)" }}>
      <h1 style={{ fontWeight: 800 }}>Obrázky úloh — test</h1>
      {UKAZKY.map((u, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{u.nadpis}</p>
          <TaskImageView image={u.img} />
        </div>
      ))}
    </div>
  );
}
