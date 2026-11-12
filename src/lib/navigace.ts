/**
 * Hlavní navigace žáka, stejná pro 5. i 9. třídu: na telefonu spodní lišta (BottomNav),
 * na počítači odkazy v horní liště (HeaderClient). Položka svítí i na podstránkách
 * (např. Testy na diagnostice, Trénink na výzvě a rychlém módu).
 */
export const STUDENT_ITEMS = [
  { href: "/",        label: "Domů",    ikona: "M3 11l9-7l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z", sekce: [] as string[] },
  { href: "/trenink", label: "Trénink", ikona: "M4 19h16M6 15V9M10 15V5M14 15v-4M18 15V7", sekce: ["/vyzva", "/rychly-mod", "/studijni-plan"] },
  { href: "/testy",   label: "Testy",   ikona: "M7 3h10v18H7ZM10 8h4M10 12h4M10 16h2", sekce: ["/diagnostika", "/cermat-test", "/testy-nanecisto", "/test"] },
  { href: "/profil",  label: "Profil",  ikona: "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0", sekce: [] as string[] },
];

export function jeAktivni(pathname: string, href: string, sekce: string[]): boolean {
  if (href === "/") return pathname === "/";
  return [href, ...sekce].some((p) => pathname === p || pathname.startsWith(p + "/"));
}
