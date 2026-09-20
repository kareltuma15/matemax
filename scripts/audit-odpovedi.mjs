// Audit správnosti odpovědí v databázi úloh (databaze.json + cermat-200.json).
// Spuštění: node scripts/audit-odpovedi.mjs        (nebo npm run audit:odpovedi)
// Konec s kódem 1, když najde chybnou odpověď nebo autorskou poznámku v řešení.
//
// Co kontroluje:
//  1) úlohy „Vypočítej/Vyřeš: $…$" spočítá PŘESNÝMI zlomky (BigInt, bez zaokrouhlení) a porovná
//     s uloženou odpovědí — výrazy s + − × ÷ zlomky, závorkami, mocninami, smíšenými čísly,
//     a lineární rovnice o jedné neznámé. Co nejde rozparsovat, přeskočí a spočítá.
//  2) v postupech a zadání hledá zapomenuté autorské poznámky („PŘEPOČTI", „oprava:", TODO…).
//  3) v postupech hledá poškozený zápis minusu (\frac{a}{b}\frac{-c}{d}, 2\frac{-1}{2}).
// Pokrývá jen aritmetické úlohy s LaTeXem; slovní úlohy a úlohy s obrázkem se musí kontrolovat ručně.
import fs from "node:fs";
import path from "node:path";

// ── racionální čísla ──
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
class Q {
  constructor(n, d = 1n) { if (d === 0n) throw new Error("dělení nulou"); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; this.n = n / g; this.d = d / g; }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { return new Q(this.n * o.d, this.d * o.n); }
  isZero() { return this.n === 0n; }
  num() { return Number(this.n) / Number(this.d); }
  toString() { return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`; }
}
const qOf = (x) => new Q(BigInt(x));
// lineární výraz a·x + b
class P {
  constructor(a, b) { this.a = a; this.b = b; }
  add(o) { return new P(this.a.add(o.a), this.b.add(o.b)); }
  sub(o) { return new P(this.a.sub(o.a), this.b.sub(o.b)); }
  mul(o) {
    if (!this.a.isZero() && !o.a.isZero()) throw new Error("nelineární");
    return this.a.isZero() ? new P(o.a.mul(this.b), o.b.mul(this.b)) : new P(this.a.mul(o.b), this.b.mul(o.b));
  }
  div(o) { if (!o.a.isZero()) throw new Error("dělení neznámou"); return new P(this.a.div(o.b), this.b.div(o.b)); }
  pow(k) { let r = new P(qOf(0), qOf(1)); for (let i = 0; i < k; i++) r = r.mul(this); return r; }
}
const cst = (q) => new P(qOf(0), q);

// ── tokenizace podmnožiny LaTeXu ──
function tokenize(src) {
  const s = src
    .replace(/\\left|\\right|\\,|\\;|\\!|\\ /g, " ")
    .replace(/\\dfrac|\\tfrac/g, "\\frac")
    .replace(/\\cdot|·|\*/g, "×").replace(/\\times/g, "×")
    .replace(/\\div|÷|:/g, "÷")
    .replace(/−|–/g, "-")
    .replace(/([0-9x)])([²³⁰¹⁴-⁹]+)/g, (_, b, sup) => b + "^{" + [...sup].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join("") + "}")
    .replace(/\//g, "÷")
    .replace(/\\text\{[^}]*\}/g, " ");
  const t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9.,]/.test(s[j])) j++; t.push({ k: "num", v: s.slice(i, j).replace(",", ".") }); i = j; continue; }
    if (s.startsWith("\\frac", i)) { t.push({ k: "frac" }); i += 5; continue; }
    if (s.startsWith("\\", i)) throw new Error("nepodporovaný příkaz");
    if (c === "x") { t.push({ k: "var" }); i++; continue; }
    if ("+-×÷()^{}=".includes(c)) { t.push({ k: c }); i++; continue; }
    throw new Error("nepodporovaný znak " + c);
  }
  return t;
}
const decimal = (str) => { const [i, f = ""] = str.split("."); return new Q(BigInt(i + f), 10n ** BigInt(f.length)); };

function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p]; const next = () => tokens[p++];
  const expect = (k) => { if (peek()?.k !== k) throw new Error("očekáváno " + k); p++; };
  const braced = () => { expect("{"); const v = expr(); expect("}"); return v; };
  function atom() {
    const t = next(); if (!t) throw new Error("konec výrazu");
    if (t.k === "num") {
      let v = cst(decimal(t.v));
      if (peek()?.k === "frac") v = v.add(atom()); // smíšené číslo 2\frac{1}{3}
      return v;
    }
    if (t.k === "var") return new P(qOf(1), qOf(0));
    if (t.k === "frac") { const a = braced(), b = braced(); return a.div(b); }
    if (t.k === "(") { const v = expr(); expect(")"); return v; }
    if (t.k === "-") return atom().mul(cst(qOf(-1)));
    throw new Error("neočekávaný token " + t.k);
  }
  function power() {
    let b = atom();
    while (peek()?.k === "^") {
      p++; let e;
      if (peek()?.k === "{") { p++; const n = next(); if (n.k !== "num") throw new Error("exponent"); e = parseInt(n.v, 10); expect("}"); }
      else { const n = next(); if (n.k !== "num") throw new Error("exponent"); e = parseInt(n.v[0], 10); }
      b = b.pow(e);
    }
    return b;
  }
  function term() {
    let v = power();
    for (;;) {
      const k = peek()?.k;
      if (k === "×") { p++; v = v.mul(power()); }
      else if (k === "÷") { p++; v = v.div(power()); }
      else if (k === "(" || k === "var" || k === "frac") v = v.mul(power()); // implicitní násobení 2x, 3(…)
      else break;
    }
    return v;
  }
  function expr() {
    let v = term();
    for (;;) {
      const k = peek()?.k;
      if (k === "+") { p++; v = v.add(term()); }
      else if (k === "-") { p++; v = v.sub(term()); }
      else break;
    }
    return v;
  }
  return { expr, done: () => p >= tokens.length };
}

// Uložená odpověď → číslo (stejná logika jako toValue v src/lib/normalize.ts)
function answerValue(raw) {
  let s = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  const eq = s.indexOf("="); if (eq >= 0) s = s.slice(eq + 1).trim();
  s = s.replace(",", ".");
  const unit = s.match(/^([-\d\s./]+?)\s*[a-záčďéěíňóřšťúůýž%°²³]+(?:\/[a-záčďéěíňóřšťúůýž]+)?$/);
  if (unit) s = unit[1].trim();
  let m = s.match(/^(-?\d+)(?:\s+|\s*a\s*)(\d+)\s*\/\s*(\d+)$/);
  if (m) { const w = +m[1], n = +m[2], d = +m[3]; return (w < 0 ? -1 : 1) * (Math.abs(w) + n / d); }
  m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (m) return +m[1] / +m[2];
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return parseFloat(s);
  return null;
}

// ── databáze ──
const root = process.cwd();
const load = (f) => { const j = JSON.parse(fs.readFileSync(path.join(root, f), "utf8")); return Array.isArray(j) ? j : (j.examples ?? j.priklady ?? []); };
const sets = [["databaze", load("src/data/databaze.json")], ["cermat-200", load("src/data/cermat-200.json")]];

const NOTE = /PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Přesná CERMAT|Pozor: výsledek|\?\?\?|TODO|FIXME|XXX|chyba v zadání|znovu spočít|nesedí|neodpovídá zadání/i;
const GARBLED = [/\\frac\{[^{}]*\}\{[^{}]*\}\\frac\{-/, /[0-9]\\frac\{-/];

const stat = { celkem: 0, overeno: 0, ok: 0, spatne: 0, prevazano: 0 };
const problems = [];
for (const [name, list] of sets) {
  for (const ex of list) {
    stat.celkem++;
    const text = ex.zadani ?? "";
    const steps = (ex.reseni_kroky ?? []).join(" | ");

    if (NOTE.test(steps) || NOTE.test(text)) problems.push({ typ: "poznámka", name, id: ex.id, detail: (steps.match(NOTE) ?? text.match(NOTE))[0] });
    if (GARBLED.some((re) => re.test(steps) || re.test(text))) problems.push({ typ: "poškozený minus", name, id: ex.id, detail: steps.slice(0, 80) });

    let m = text.match(/\$([^$]+)\$/);
    // výraz bez dolarů (typicky cermat-200): text za první dvojtečkou
    if (!m) { const c = text.indexOf(":"); if (c > 0) m = [null, text.slice(c + 1).replace(/[.\s]+$/, "")]; }
    if (!m || ex.moznosti || ex.porovnani || ex.kroky_volby) { stat.prevazano++; continue; }
    if (!/^(Vypočítej|Vypočítejte|Vyřeš|Vyřešte|Řeš|Řešte|Spočítej|Spočítejte|Vypočti)/i.test(text.trim())) { stat.prevazano++; continue; }
    let computed = null;
    try {
      const sides = m[1].split("=");
      if (sides.length === 2) {
        const L = parse(tokenize(sides[0])), R = parse(tokenize(sides[1]));
        const g = L.expr().sub(R.expr());
        if (!L.done() || !R.done() || g.a.isZero()) throw new Error("nerozparsováno");
        computed = g.b.mul(qOf(-1)).div(g.a);
      } else if (sides.length === 1) {
        const pr = parse(tokenize(sides[0])); const v = pr.expr();
        if (!pr.done() || !v.a.isZero()) throw new Error("nerozparsováno");
        computed = v.b;
      } else throw new Error("víc rovnítek");
    } catch { stat.prevazano++; continue; }
    const stored = answerValue(ex.odpoved);
    if (stored === null) { stat.prevazano++; continue; }
    stat.overeno++;
    if (Math.abs(stored - computed.num()) < 1e-9) stat.ok++;
    else { stat.spatne++; problems.push({ typ: "ŠPATNÁ ODPOVĚĎ", name, id: ex.id, detail: `uloženo „${ex.odpoved}", správně ${computed}` }); }
  }
}

console.log(`Úloh celkem ${stat.celkem}; přesně ověřeno ${stat.overeno} (správně ${stat.ok}, špatně ${stat.spatne}); ${stat.prevazano} nejde ověřit automaticky.`);
for (const p of problems) console.log(`  ${p.typ.padEnd(15)} ${String(p.name).padEnd(11)} ${String(p.id).padEnd(12)} ${p.detail}`);
if (problems.length) { console.log(`\n❌ Nalezeno ${problems.length} problémů.`); process.exit(1); }
console.log("✅ Žádné chybné odpovědi ani zapomenuté poznámky.");
