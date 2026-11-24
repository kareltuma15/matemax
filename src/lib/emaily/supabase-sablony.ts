import { sestavHtml, type ObsahEmailu } from "./sablona";

/**
 * Šablony přihlašovacích e-mailů, které posílá Supabase (potvrzení registrace, zapomenuté heslo) ve stejném
 * vzhledu jako ostatní e-maily (krok 3, Karel 24. 11. 2026). Karel je vkládá do Supabase → Authentication →
 * Emails; odkaz {{ .ConfirmationURL }} doplní Supabase. Žák má v user_metadata „trida“, rodič ne, proto
 * {{ if .Data.trida }} vybere verzi pro dítě (Hexík, tykání), jinak pro rodiče (vykání).
 */

const ODKAZ = "{{ .ConfirmationURL }}";

export const PREDMETY = {
  potvrzeni: "Potvrzení e-mailu pro MateMax",
  heslo: "Nové heslo do MateMaxu",
} as const;

export function potvrzeniDite(): ObsahEmailu {
  return {
    predmet: PREDMETY.potvrzeni,
    pre: "Ještě jeden klik a jdeme na to.",
    nadpis: "Ještě jeden klik a jdeme na to!",
    odstavce: ["Ahoj! Jsem Hexík. Aby ti účet v MateMaxu fungoval, potvrď prosím svůj e-mail."],
    tlacitko: { text: "Potvrdit e-mail", href: ODKAZ },
    img: "uvitani",
    bezOdhlaseni: true,
    pata: "Tento e-mail přišel, protože se v MateMaxu založil účet s touto adresou. Pokud jsi to nebyl(a) ty, e-mail ignoruj.",
  };
}

export function potvrzeniRodic(): ObsahEmailu {
  return {
    predmet: PREDMETY.potvrzeni,
    pre: "Potvrďte e-mail a účet je připravený.",
    nadpis: "Potvrďte svůj e-mail",
    odstavce: ["Dobrý den, děkujeme za založení účtu v MateMaxu.", "Pro dokončení registrace prosím potvrďte svůj e-mail."],
    tlacitko: { text: "Potvrdit e-mail", href: ODKAZ },
    img: "rodic",
    rodic: true,
    bezOdhlaseni: true,
    pata: "Tento e-mail přišel, protože se v MateMaxu založil účet s touto adresou. Pokud jste to nebyli vy, e-mail ignorujte.",
  };
}

export function hesloDite(): ObsahEmailu {
  return {
    predmet: PREDMETY.heslo,
    pre: "Odkaz pro nastavení nového hesla.",
    nadpis: "Nastav si nové heslo",
    odstavce: [
      "Někdo (nejspíš ty) požádal o nové heslo do MateMaxu. Klikni na tlačítko a nastav si ho.",
      "Pokud o změnu nežádáš, e-mail klidně smaž. Heslo zůstane stejné.",
    ],
    tlacitko: { text: "Nastavit nové heslo", href: ODKAZ },
    img: "heslo",
    bezOdhlaseni: true,
    pata: "Tento e-mail přišel, protože někdo zadal tuto adresu na stránce Zapomenuté heslo v MateMaxu.",
  };
}

export function hesloRodic(): ObsahEmailu {
  return {
    predmet: PREDMETY.heslo,
    pre: "Odkaz pro nastavení nového hesla.",
    nadpis: "Nastavte si nové heslo",
    odstavce: [
      "Dobrý den, někdo (nejspíš vy) požádal o nové heslo do MateMaxu. Klikněte na tlačítko a nastavte si ho.",
      "Pokud o změnu nežádáte, e-mail klidně smažte. Heslo zůstane stejné.",
    ],
    tlacitko: { text: "Nastavit nové heslo", href: ODKAZ },
    img: "heslo",
    rodic: true,
    bezOdhlaseni: true,
    pata: "Tento e-mail přišel, protože někdo zadal tuto adresu na stránce Zapomenuté heslo v MateMaxu.",
  };
}

/** Tělo šablony pro Supabase: verze pro dítě, nebo pro rodiče podle {{ .Data.trida }}. */
export function sablonaProSupabase(dite: ObsahEmailu, rodic: ObsahEmailu): string {
  return `{{ if .Data.trida }}${sestavHtml(dite)}{{ else }}${sestavHtml(rodic)}{{ end }}`;
}

export function sablonySupabase() {
  return {
    potvrzeni: { predmet: PREDMETY.potvrzeni, html: sablonaProSupabase(potvrzeniDite(), potvrzeniRodic()) },
    heslo: { predmet: PREDMETY.heslo, html: sablonaProSupabase(hesloDite(), hesloRodic()) },
  };
}
