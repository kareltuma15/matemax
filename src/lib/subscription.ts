import { TEMATA_ORDER, TEMATA_ORDER_5 } from "@/types";

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

/** 5. třída: stejné pravidlo jako u 9. třídy — první tři okruhy zdarma (rozhodnutí Karla 25. 10. 2026). */
export const FREE_TOPICS_5 = new Set<string>(TEMATA_ORDER_5.slice(0, 3));
export const PREMIUM_TOPICS_5 = new Set<string>(TEMATA_ORDER_5.filter((tema) => !FREE_TOPICS_5.has(tema)));

/** Zámek pro přihlášeného uživatele (platí pro témata 9. i 5. třídy). */
export function isTopicLocked(tema: string, isPremium: boolean): boolean {
  return !isPremium && (PREMIUM_TOPICS.has(tema) || PREMIUM_TOPICS_5.has(tema));
}

/** Zámek pro nepřihlášeného hosta. */
export function isTopicLockedForGuest(tema: string): boolean {
  return !GUEST_FREE_TOPICS.has(tema);
}
