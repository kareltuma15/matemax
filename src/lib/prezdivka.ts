/**
 * Přezdívka v žebříčku týdenní výzvy (admin 2.1 fáze A1, SY-13). Ostatní žáci nesmí vidět jméno ani e-mail.
 * Výchozí přezdívka je složená z přídavného jména, zvířátka a dvou znaků z ID účtu („Rychlý lišák 4F“),
 * žák si ji může změnit v profilu (user_metadata.prezdivka). Admin ji umí skrýt nebo změnit.
 */
const PRIDAVNA = ["Rychlý", "Chytrý", "Bystrý", "Odvážný", "Veselý", "Klidný", "Mazaný", "Pilný", "Statečný", "Zvídavý"];
const ZVIRATKA = ["lišák", "jezevec", "sokol", "delfín", "panda", "rys", "bobr", "orel", "tygr", "ježek", "vydra", "sova"];

export function vychoziPrezdivka(userId: string): string {
  const h = [...userId.replace(/-/g, "")].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const kod = userId.replace(/-/g, "").slice(-2).toUpperCase();
  return `${PRIDAVNA[h % PRIDAVNA.length]} ${ZVIRATKA[Math.floor(h / PRIDAVNA.length) % ZVIRATKA.length]} ${kod}`;
}

/**
 * Kontrola vlastní přezdívky: 3–20 znaků, písmena, číslice, mezera, tečka, pomlčka.
 * Nesmí obsahovat @ ani vypadat jako e-mail a nesmí se shodovat se jménem nebo příjmením z účtu.
 * Vrací chybu k zobrazení, nebo null.
 */
export function chybaPrezdivky(p: string, jmena: (string | null | undefined)[] = []): string | null {
  const t = p.trim().replace(/\s+/g, " ");
  if (t.length < 3) return "Přezdívka musí mít aspoň 3 znaky.";
  if (t.length > 20) return "Přezdívka může mít nejvýš 20 znaků.";
  if (/[@]|\.(cz|com|sk|eu)\b/i.test(t)) return "Přezdívka nesmí obsahovat e-mail.";
  if (!/^[\p{L}\p{N} .\-_]+$/u.test(t)) return "Použij jen písmena, číslice a mezery.";
  const male = t.toLowerCase();
  for (const j of jmena) {
    const x = (j ?? "").trim().toLowerCase();
    if (x.length >= 3 && male.includes(x)) return "Přezdívka nesmí obsahovat tvoje jméno ani příjmení. Ostatní ji uvidí v žebříčku.";
  }
  return null;
}

/** Přezdívka účtu pro žebříček: vlastní (pokud projde kontrolou), jinak výchozí. */
export function prezdivkaUctu(userId: string, meta: Record<string, unknown> | undefined): string {
  const vlastni = typeof meta?.prezdivka === "string" ? meta.prezdivka.trim() : "";
  const jmena = [meta?.first_name, meta?.last_name, meta?.full_name].map((x) => (typeof x === "string" ? x : null));
  return vlastni && !chybaPrezdivky(vlastni, jmena) ? vlastni : vychoziPrezdivka(userId);
}
