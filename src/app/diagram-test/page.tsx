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
  // ── Souřadnicová síť + graf ──
  { nadpis: "Graf — bod A (čtení souřadnic)", img: { kind: "parametric", diagram: { typ: "graf", body: [{ x: 3, y: 2, label: "A" }] } } },
  { nadpis: "Graf — bod B v jiném kvadrantu", img: { kind: "parametric", diagram: { typ: "graf", body: [{ x: -3, y: 2, label: "B" }] } } },
  { nadpis: "Graf — přímka dvěma body (prodloužená)", img: { kind: "parametric", diagram: { typ: "graf", xMin: -1, xMax: 5, yMin: -1, yMax: 5, body: [{ x: 0, y: 1, label: "A" }, { x: 2, y: 3, label: "B" }], primka: { x1: 0, y1: 1, x2: 2, y2: 3, prodlouzit: true } } } },
  { nadpis: "Graf — přímka přes kvadranty", img: { kind: "parametric", diagram: { typ: "graf", body: [{ x: -2, y: -1, label: "A" }, { x: 2, y: 3, label: "B" }], primka: { x1: -2, y1: -1, x2: 2, y2: 3, prodlouzit: true } } } },
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
