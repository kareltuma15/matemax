/**
 * Čísla, která tvrdíme na webu a v emailech — jedno místo, ať se marketing
 * nerozejde s realitou ani sám se sebou.
 *
 * Počet příkladů je schválně zaokrouhlený dolů na stovky: tvrzení „1 100+"
 * tak zůstává pravdivé i po přidání pár příkladů a nemusí se přepisovat.
 * Soulad s databází hlídá `scripts/check-site-stats.mjs`.
 *
 * Záměrně bez importu dat — landing i mapa témat jsou klientské komponenty
 * a nemá smysl kvůli jednomu číslu tahat do bundlu celou databázi.
 */

/** Počet příkladů pro počítadlo na landingu (bez „+"). */
export const EXAMPLES_ROUNDED = 1100;

/** Počet s pevnou mezerou jako tisícovým oddělovačem: „1 100" (bez „+"). */
export const EXAMPLES_TEXT = `${Math.floor(EXAMPLES_ROUNDED / 1000)} ${String(EXAMPLES_ROUNDED % 1000).padStart(3, "0")}`;

/** Počet příkladů jako text do vět: „1 100+ příkladů". */
export const EXAMPLES_LABEL = `${EXAMPLES_TEXT}+`;

/** Počet témat CERMAT (= kapitoly sešitu + souhrnné). */
export const TOPICS_COUNT = 9;

/** Délka vstupní diagnostiky v minutách (16 otázek s výběrem odpovědi). */
export const DIAGNOSTIC_MINUTES = 8;

/** Doporučená délka denního tréninku v minutách. */
export const DAILY_MINUTES = 10;

// Počet žáků se na MateMaxu záměrně netvrdí (schváleno 10. 10. 2026): v aplikaci je zatím málo uživatelů a ověřený fakt „200+ žáků“ se týká celé přípravy, ne MateMaxu.
