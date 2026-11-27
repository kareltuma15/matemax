/**
 * Klávesové zkratky v tréninku (Enter / mezerník = další příklad) nesmí platit, když žák píše poznámku,
 * třeba k nahlášené chybě. Vrací true, když je cíl události víceřádkové pole nebo leží uvnitř prvku
 * označeného data-bez-zkratek (formulář „Nahlásit chybu“). Pole pro odpověď se záměrně nevylučuje:
 * po správné odpovědi v něm může zůstat kurzor a Enter tam má dál posouvat na další příklad.
 */
export function pisePrave(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "TEXTAREA" || target.isContentEditable || !!target.closest("[data-bez-zkratek]");
}
