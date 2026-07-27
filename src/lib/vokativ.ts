/**
 * Oslovení křestním jménem v 5. pádu („Vítej, Tomáši!").
 *
 * Automatický vokativ je v češtině ošemetný (Petr→Petře, Marek→Marku — samá
 * výjimka). Proto je záměrně konzervativní: bezpečné a časté případy převede
 * správně, u zbytku nechá 1. pád. Špatný vokativ („Petre") tahá za uši víc než
 * poctivý nominativ, takže když si funkce není jistá, netipuje.
 */

// Nejčastější česká jména, u kterých je vokativ nepravidelný nebo si zaslouží
// jistotu. Klíč je malými písmeny bez diakritiky-nezávisle porovnáváme přes toLowerCase.
const SLOVNIK: Record<string, string> = {
  // mužská
  tomáš: "Tomáši", petr: "Petře", jan: "Jane", jakub: "Jakube", jiří: "Jiří",
  marek: "Marku", martin: "Martine", david: "Davide", adam: "Adame", filip: "Filipe",
  ondřej: "Ondřeji", lukáš: "Lukáši", matěj: "Matěji", vojtěch: "Vojtěchu",
  daniel: "Danieli", pavel: "Pavle", josef: "Josefe", michal: "Michale",
  václav: "Václave", jaroslav: "Jaroslave", štěpán: "Štěpáne", šimon: "Šimone",
  dominik: "Dominiku", patrik: "Patriku", radek: "Radku", roman: "Romane",
  karel: "Karle", havel: "Havle", kryštof: "Kryštofe", vít: "Víte",
  oliver: "Olivere", sebastian: "Sebastiane", alex: "Alexi", max: "Maxi",
  matyáš: "Matyáši", antonín: "Antoníne", richard: "Richarde", robert: "Roberte",
  jonáš: "Jonáši", denis: "Denisi", marcel: "Marceli", emil: "Emile",
  kamil: "Kamile", samuel: "Samueli", hugo: "Hugo", teodor: "Teodore",
  mikuláš: "Mikuláši", ivan: "Ivane", aleš: "Aleši", milan: "Milane",
  // ženská (končící na souhlásku nebo -e, kde pravidlo -a→-o neplatí)
  karolína: "Karolíno", nikol: "Nikol", ester: "Ester", dagmar: "Dagmar",
};

/**
 * Vrátí jméno v 5. pádu, nebo beze změny, když si není jistá.
 * Prázdný/neznámý vstup vrací "".
 */
export function vokativ(jmeno: string): string {
  const j = (jmeno ?? "").trim();
  if (!j) return "";
  // Jen první slovo (kdyby přišlo celé jméno).
  const prvni = j.split(/\s+/)[0];

  const klic = prvni.toLowerCase();
  if (SLOVNIK[klic]) return SLOVNIK[klic];

  // Ženská jména na -a → -o (Petra→Petro, Hana→Hano, Tereza→Terezo). Pravidelné.
  if (/a$/i.test(prvni) && prvni.length > 2) {
    return prvni.slice(0, -1) + "o";
  }

  // Neznámý tvar (hlavně mužská jména na souhlásku) — raději nominativ.
  return prvni;
}
