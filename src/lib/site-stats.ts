/**
 * Čísla, která tvrdíme na webu a v emailech — jedno místo, ať se marketing
 * nerozejde s realitou ani sám se sebou.
 *
 * Počet příkladů je schválně zaokrouhlený dolů na padesátky: tvrzení „900+"
 * tak zůstává pravdivé i po přidání pár příkladů a nemusí se přepisovat.
 * Soulad s databází hlídá `scripts/check-site-stats.mjs`.
 *
 * Záměrně bez importu dat — landing i mapa témat jsou klientské komponenty
 * a nemá smysl kvůli jednomu číslu tahat do bundlu celou databázi.
 */

/** Počet příkladů pro počítadlo na landingu (bez „+"). */
export const EXAMPLES_ROUNDED = 900;

/** Počet příkladů jako text do vět: „900+ příkladů". */
export const EXAMPLES_LABEL = `${EXAMPLES_ROUNDED}+`;

/** Počet témat CERMAT (= kapitoly sešitu + souhrnné). */
export const TOPICS_COUNT = 9;

/** Délka vstupní diagnostiky v minutách (16 otázek s výběrem odpovědi). */
export const DIAGNOSTIC_MINUTES = 8;

/** Doporučená délka denního tréninku v minutách. */
export const DAILY_MINUTES = 10;

/** Kolik žáků se s Matematika Snadno připravovalo — drženo shodně s pracovním sešitem. */
export const STUDENTS_LABEL = "500+";
