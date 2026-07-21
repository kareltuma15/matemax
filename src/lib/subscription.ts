import { TEMATA_ORDER } from "@/types";

/**
 * Kdo má k jakým tématům přístup — jediný zdroj pravdy.
 *
 * Dřív tu byly tři ručně psané seznamy, které si odporovaly: geometrie byla
 * současně „zdarma pro hosty" i „premium", takže mapa témat slibovala ZDARMA
 * a trénink hned nato hlásil „Toto téma je v Premium". Proto se teď premium
 * ODVOZUJE — rozpor už nejde napsat.
 */

/**
 * Nepřihlášený host — jen ochutnávka, ať je důvod se zaregistrovat.
 * Zlomků je 108, na vyzkoušení bohatě stačí.
 */
export const GUEST_FREE_TOPICS = new Set<string>(["zlomky"]);

/**
 * Přihlášený uživatel bez Premium — první tři kapitoly sešitu.
 * Čitelný příběh: „první tři kapitoly zdarma, jako ukázka z knížky."
 */
export const FREE_TOPICS = new Set<string>(["zlomky", "vyrazy", "rovnice"]);

/** Vše ostatní je za Premium — odvozeno, aby nemohlo odporovat FREE_TOPICS. */
export const PREMIUM_TOPICS = new Set<string>(
  TEMATA_ORDER.filter((tema) => !FREE_TOPICS.has(tema))
);

/** Zámek pro přihlášeného uživatele. */
export function isTopicLocked(tema: string, isPremium: boolean): boolean {
  return !isPremium && PREMIUM_TOPICS.has(tema);
}

/** Zámek pro nepřihlášeného hosta. */
export function isTopicLockedForGuest(tema: string): boolean {
  return !GUEST_FREE_TOPICS.has(tema);
}
