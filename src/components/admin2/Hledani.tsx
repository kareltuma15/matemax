"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hledej, type Vysledek } from "@/app/(admin)/admin/novy/hledani-akce";

/**
 * Hledání a příkazy (KO-04, Ctrl+K). Prázdné hledání ukáže naposledy otevřené a příkazy.
 * Naposledy otevřené se pamatují jen v tomto prohlížeči (pohodlí, ne data).
 */
const NAPOSLEDY = "admin2-naposledy";
const NAZVY: Record<Vysledek["typ"], string> = { zak: "Žáci", rodic: "Rodiče", ukol: "Úkoly", uloha: "Úlohy" };
const PRIKAZY: Vysledek[] = [
  { typ: "ukol", nazev: "Nový úkol…", popis: "příkaz", href: "/admin/novy/plan?novy=1" },
  { typ: "zak", nazev: "Poslat e-mail žákovi…", popis: "příkaz: vyber žáka, pak E-mail", href: "/admin/novy/zaci?akce=email" },
  { typ: "zak", nazev: "Udělit Premium…", popis: "příkaz: vyber žáka, pak Premium", href: "/admin/novy/zaci?akce=premium" },
  { typ: "zak", nazev: "Žáci bez diagnostiky", popis: "segment", href: "/admin/novy/zaci?segment=bez_diagnostiky" },
];

export function ulozNaposledy(v: Vysledek) {
  try {
    const p = JSON.parse(localStorage.getItem(NAPOSLEDY) ?? "[]") as Vysledek[];
    localStorage.setItem(NAPOSLEDY, JSON.stringify([v, ...p.filter((x) => x.href !== v.href)].slice(0, 6)));
  } catch { /* bez úložiště */ }
}

export default function Hledani({ otevreno, zavri }: { otevreno: boolean; zavri: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [vysledky, setVysledky] = useState<Vysledek[]>([]);
  const [naposledy, setNaposledy] = useState<Vysledek[]>([]);
  const [vybrany, setVybrany] = useState(0);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!otevreno) return;
    try { setNaposledy(JSON.parse(localStorage.getItem(NAPOSLEDY) ?? "[]")); } catch { setNaposledy([]); } // eslint-disable-line react-hooks/set-state-in-effect
    window.setTimeout(() => input.current?.focus(), 30);
  }, [otevreno]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = window.setTimeout(() => start(async () => { setVysledky(await hledej(q)); setVybrany(0); }), 180);
    return () => window.clearTimeout(t);
  }, [q]);

  const seznam = useMemo(() => (q.trim().length >= 2 ? vysledky : [...naposledy, ...PRIKAZY]), [q, vysledky, naposledy]);
  const otevri = (v: Vysledek) => { if (v.popis !== "příkaz" && !v.popis.startsWith("příkaz") && v.popis !== "segment") ulozNaposledy(v); zavri(); setQ(""); router.push(v.href); };

  if (!otevreno) return null;
  const skupiny = q.trim().length >= 2
    ? (["zak", "rodic", "ukol", "uloha"] as const).map((t) => ({ nazev: NAZVY[t], polozky: seznam.filter((v) => v.typ === t) })).filter((g) => g.polozky.length)
    : [{ nazev: "Naposledy otevřené", polozky: naposledy }, { nazev: "Příkazy", polozky: PRIKAZY }].filter((g) => g.polozky.length);
  let index = -1;
  return (
    <>
      <div className="a2-okno-zavoj" onClick={zavri} />
      <div className="a2-okno" role="dialog" aria-modal="true" aria-label="Hledat" data-testid="a2-hledani">
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") zavri();
            if (e.key === "ArrowDown") { e.preventDefault(); setVybrany((i) => Math.min(seznam.length - 1, i + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setVybrany((i) => Math.max(0, i - 1)); }
            if (e.key === "Enter" && seznam[vybrany]) otevri(seznam[vybrany]);
          }}
          placeholder="Žák, e-mail, úloha, úkol…"
          aria-label="Hledat"
          id="a2-hledat-pole"
        />
        {pending && <span className="a2-s">Hledám…</span>}
        {q.trim().length >= 2 && !pending && !vysledky.length && <p className="a2-prazdne">Nic nenalezeno. Zkus jméno, část e-mailu nebo ID úlohy.</p>}
        {skupiny.map((g) => (
          <div key={g.nazev} className="a2-sekce">
            <h2 className="a2-h2">{g.nazev}</h2>
            {g.polozky.map((v) => {
              index++;
              const i = index;
              return (
                <button key={`${g.nazev}-${v.href}-${v.nazev}`} type="button" className="a2-karta" style={{ textAlign: "left", cursor: "pointer", background: i === vybrany ? "var(--a-akcent-slaby)" : undefined, font: "inherit" }} onMouseEnter={() => setVybrany(i)} onClick={() => otevri(v)}>
                  <span className="a2-t" style={{ fontSize: 14 }}>{v.nazev}</span>
                  <span className="a2-s">{v.popis}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
