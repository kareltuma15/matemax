/**
 * Souhlasy a dotazník při registraci (admin 2.1 fáze A1, SY-08, HU-02).
 * Verze = datum znění obchodních podmínek a zásad ochrany osobních údajů na matematika-snadno.cz,
 * se kterými žák souhlasil. Při změně textů na webu sem dej nové datum (staré souhlasy zůstanou se starou verzí).
 * Právní stránku (věk 15 let, souhlas rodiče, co je marketing) ověřuje Karel.
 */
export const VERZE_PODMINEK = "2026-11-26";
export const ODKAZ_PODMINKY = "https://www.matematika-snadno.cz/obchodni-podminky";
export const ODKAZ_ZASADY = "https://www.matematika-snadno.cz/ochrana-osobnich-udaju";

/** „Odkud ses o nás dozvěděl?“ (nepovinné). Klíč se ukládá do user_metadata.odkud. */
export const ODKUD_MOZNOSTI = ["facebook", "kamarad", "skola", "letak", "test", "web", "jinde"] as const;
export const ODKUD_NAZVY: Record<(typeof ODKUD_MOZNOSTI)[number], string> = {
  facebook: "Facebook nebo Instagram",
  kamarad: "Od kamaráda",
  skola: "Ve škole",
  letak: "Z letáku",
  test: "Na testu nanečisto",
  web: "Na webu Matematika Snadno",
  jinde: "Jinde",
};
