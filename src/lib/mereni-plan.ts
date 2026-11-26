/**
 * Plán měření MateMaxu v kódu (docs/tracking-plan.md je jeho popis pro lidi). Používá ho klient (Mereni)
 * i server (/api/t, /api/zive), ať se názvy a pravidla nikde nerozjedou.
 *
 * Pravidla (Karel, zadání adminu 2.1, DA-08):
 *  - název události = předmět_akce v minulém čase, snake_case, anglicky (page_viewed, answer_submitted…),
 *  - z adresy se ukládá jen šablona trasy (/trenink, /admin/testy/:id) a povolené parametry,
 *    tokeny (state, code, next, token…) nikdy,
 *  - měřený prvek má vždy lidský název z tohoto souboru, prvek bez názvu se neměří.
 */

/** Události, které posílá prohlížeč přes /api/t (anonymně, bez účtu). */
export const UDALOSTI_KLIENTA = [
  "page_viewed", "page_left", "element_clicked", "rage_clicked", "sample_answered",
  "signup_submitted", "signup_google_started", "premium_viewed", "checkout_started", "checkout_canceled",
  "recommendation_opened", "form_started", "form_error_shown",
] as const;
export type UdalostKlienta = (typeof UDALOSTI_KLIENTA)[number];

/** Staré názvy (do 26. 11. 2026) → nové. Přijímá je /api/t, kdyby přišly ze staré verze appky v mezipaměti. */
export const STARE_NAZVY: Record<string, string> = {
  navsteva: "page_viewed", odchod: "page_left", klik: "element_clicked", zive: "app_heartbeat",
  session_completed: "training_completed", diagnostika_dokoncena: "diagnostic_completed",
  diagnostika_prvni_trenink: "diagnostic_training_started", registrace_odeslana: "signup_submitted",
  registrace_google: "signup_google_started", premium_zobrazeno: "premium_viewed", platba_start: "checkout_started",
  platba_zrusena: "checkout_canceled", formular_start: "form_started", formular_chyba: "form_error_shown",
  funkce: "feature_used", email_odeslan: "email_sent", email_dorucitelnost: "email_status_received",
  email_odhlaseni: "email_unsubscribed", cermat_test_dokoncen: "mock_test_completed",
  videolekce_klik: "video_lesson_opened", doporuceni_otevreno: "recommendation_opened",
  tydenni_report: "weekly_report_created", admin_utrata: "ad_spend_saved", admin_poznamka: "chart_note_added",
  error_client: "client_error_reported",
};

/** Parametry adresy, které se smí uložit (jako vlastnosti události). Všechno ostatní se zahodí. */
export const POVOLENE_PARAMETRY = ["tema", "dovednost", "uroven", "trida", "rezim", "vyber", "utm_source", "utm_medium", "utm_campaign"] as const;

/** Šablona trasy: ID, tokeny a dlouhá čísla v cestě se nahradí „:id“. Bez parametrů a kotvy. */
export function sablonaCesty(cesta: string): string {
  const bezQ = (cesta || "/").split(/[?#]/)[0] || "/";
  return bezQ
    .split("/")
    .map((s) => (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(s) || /^[0-9a-f]{16,}$/i.test(s) || /^\d{3,}$/.test(s) || /^[A-Za-z0-9_-]{24,}$/.test(s) ? ":id" : s))
    .join("/")
    .slice(0, 120) || "/";
}

/** Povolené parametry z query stringu (nejvýš 40 znaků na hodnotu). */
export function povoleneParametry(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const q = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
    for (const k of POVOLENE_PARAMETRY) { const v = q.get(k); if (v && !k.startsWith("utm_")) out[k] = v.slice(0, 40); }
  } catch { /* neplatná adresa */ }
  return out;
}

/** Lidské názvy cílů odkazů (šablona trasy → název). Odkaz jinam se měří jen s názvem z této tabulky. */
export const NAZVY_ODKAZU: Record<string, string> = {
  "/": "Úvodní stránka",
  "/registrace": "Registrace",
  "/prihlaseni": "Přihlášení",
  "/vitej": "Vítej (po registraci)",
  "/diagnostika": "Diagnostika",
  "/trenink": "Trénink",
  "/premium": "Premium",
  "/cenik": "Ceník",
  "/testy": "Testy",
  "/testy-nanecisto": "Testy nanečisto",
  "/cermat-test": "Cvičný test",
  "/sbirka": "Hexík",
  "/profil": "Profil",
  "/studijni-plan": "Studijní plán",
  "/vyzva": "Týdenní výzva",
  "/rychly-mod": "Rychlý režim",
  "/rodice": "Pro rodiče",
  "/rodice/prihlaseni": "Přihlášení rodiče",
  "/jak-to-funguje": "Jak to funguje",
  "/matemax": "O MateMaxu",
  "/propojit": "Propojení s testy",
  "/zapomenute-heslo": "Zapomenuté heslo",
};

/** Lidské názvy sekcí úvodní stránky (atribut data-sekce). */
export const NAZVY_SEKCI: Record<string, string> = {
  uvod: "Úvodní blok", "zkus-priklad": "Zkus si příklad", ukazky: "Ukázky appky", temata: "Témata",
  hexik: "Hexík a odměny", novinky: "Novinky", cisla: "Čísla", srovnani: "Srovnání", "pro-rodice": "Pro rodiče",
  cenik: "Ceník", autor: "O autorovi", otazky: "Časté otázky", zaver: "Závěrečná výzva",
};

/** Lidské názvy prvků s atributem data-track (tlačítka, která nejsou odkazem). */
export const NAZVY_PRVKU: Record<string, string> = {
  "registrace-trida-5": "Registrace: vybral 5. třídu",
  "registrace-trida-9": "Registrace: vybral 9. třídu",
  "registrace-odeslat": "Registrace: Vytvořit účet",
  "registrace-google": "Registrace: přes Google",
  "registrace-heslo-zobrazit": "Registrace: zobrazit heslo",
  "prihlaseni-odeslat": "Přihlášení: Přihlásit se",
  "prihlaseni-google": "Přihlášení: přes Google",
  "premium-koupit": "Premium: Začít platit",
  "uvod-trida-5": "Úvod: přepnul na 5. třídu",
  "uvod-trida-9": "Úvod: přepnul na 9. třídu",
  "uvod-zkus-odeslat": "Úvod: odeslal ukázkový příklad",
};

/** Normalizace zdroje z domény odkazujícího webu: varianty Facebooku a Instagramu dohromady, platba a vlastní weby nejsou zdroj. */
export function zdrojZDomeny(domena: string | undefined): { ref?: string; navratZPlatby?: boolean } {
  if (!domena) return {};
  const d = domena.toLowerCase().replace(/^www\./, "");
  if (/(^|\.)stripe\.com$/.test(d)) return { navratZPlatby: true };
  if (d.endsWith("matemax.matematika-snadno.cz")) return {};
  if (/(^|\.)facebook\.com$|^fb\.me$|^com\.facebook\./.test(d)) return { ref: "facebook.com" };
  if (/(^|\.)instagram\.com$|^com\.instagram\./.test(d)) return { ref: "instagram.com" };
  if (/(^|\.)matematika-snadno\.cz$/.test(d)) return { ref: "matematika-snadno.cz" };
  if (/(^|\.)google\./.test(d)) return { ref: "google" };
  if (/(^|\.)seznam\.cz$/.test(d)) return { ref: d.startsWith("email.") ? "email.seznam.cz" : "seznam.cz" };
  return { ref: d.slice(0, 80) };
}

/** Jen výsledek: číslo, zlomek, jednotka, písmeno volby. Cokoli jiného (věty) se neuloží. */
export function cistaOdpoved(s: string | null | undefined): string | null {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (!t || t.length > 40) return null;
  // Písmena jen krátce (jednotky, Kč, volba A–E, „ano“/„ne“); slovo od 6 písmen = psaný text, ten se neukládá
  return /^[0-9A-Za-záčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s,.\-+−–/:%=<>()√π²³°·×÷^*|;]*$/.test(t) && !/\p{L}{6,}/u.test(t) ? t : null;
}
