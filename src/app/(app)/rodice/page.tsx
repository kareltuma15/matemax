import { redirect } from "next/navigation";

// Stará stránka „Týdenní report pro rodiče“ (23. 11. 2026) slibovala report každé pondělí každému, kdo vyplní
// e-mail. Report ale chodí jen rodičům s propojením potvrzeným dítětem (parent_child_link) a jen u dětí s Premium,
// takže slib byl nepravdivý a formulář posílal e-mail na libovolnou adresu. Rodič začíná přihlášením / účtem rodiče.
// Dočasné přesměrování (307), ať jde /rodice později použít pro rozcestník, pokud ho Karel schválí.
export default function RodicePage() {
  redirect("/rodice/prihlaseni");
}
