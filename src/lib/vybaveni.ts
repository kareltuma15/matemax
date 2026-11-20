/**
 * Vybavení Hexíkova pokojíčku z Obchůdku (schválil Karel 20. 11. 2026): 6 pevných míst (obraz, koberec,
 * lampa, květina, polička, okno), na každém výchozí věc zdarma a tři za krystaly (120 / 300 / 600).
 * Věc se kupuje jednou. Ukazuje se v základním Hexíkově pokojíčku; pokoje ze sad mají vlastní výzdobu.
 */
import { krystaly, type SbirkaStav } from "./sbirka";

export type MistoVybaveni = "obraz" | "koberec" | "lampa" | "kvetina" | "policka" | "okno";

export interface VecVybaveni { id: string; misto: MistoVybaveni; nazev: string; ikona: string; cena: number }

export const MISTA: { misto: MistoVybaveni; nazev: string; ikona: string }[] = [
  { misto: "obraz", nazev: "Obraz", ikona: "🖼️" }, { misto: "koberec", nazev: "Koberec", ikona: "🟣" }, { misto: "lampa", nazev: "Lampa", ikona: "💡" },
  { misto: "kvetina", nazev: "Květina", ikona: "🪴" }, { misto: "policka", nazev: "Polička", ikona: "📚" }, { misto: "okno", nazev: "Okno", ikona: "🪟" },
];

const v = (misto: MistoVybaveni, klic: string, nazev: string, ikona: string, cena: number): VecVybaveni => ({ id: `${misto}-${klic}`, misto, nazev, ikona, cena });

export const VYBAVENI: VecVybaveni[] = [
  v("obraz", "plaz", "Hexík na pláži", "🏖️", 0), v("obraz", "mapa", "Mapa pokladu", "🗺️", 120), v("obraz", "diplom", "Diplom za odvahu", "📜", 300), v("obraz", "hvezdy", "Svítící souhvězdí", "✨", 600),
  v("koberec", "hexik", "Koberec s Hexíkem", "🟣", 0), v("koberec", "duha", "Duhový koberec", "🌈", 120), v("koberec", "sachy", "Šachovnice", "♟️", 300), v("koberec", "mraky", "Obláček", "☁️", 600),
  v("lampa", "zluta", "Žlutá lampička", "💡", 0), v("lampa", "mata", "Mátová lampička", "🟢", 120), v("lampa", "lava", "Lávová lampa", "🫧", 300), v("lampa", "hvezda", "Hvězdná lampa", "🌟", 600),
  v("kvetina", "monstera", "Monstera", "🪴", 0), v("kvetina", "kaktus", "Kaktus", "🌵", 120), v("kvetina", "slunecnice", "Slunečnice", "🌻", 300), v("kvetina", "houby", "Svítící houbičky", "🍄", 600),
  v("policka", "knihy", "Knížky a raketa", "📚", 0), v("policka", "letadla", "Modely letadel", "✈️", 120), v("policka", "trofeje", "Poháry", "🏆", 300), v("policka", "akvarium", "Akvárium", "🐠", 600),
  v("okno", "mesto", "Večerní město", "🌆", 0), v("okno", "hory", "Hory", "🏔️", 120), v("okno", "more", "Moře", "🌊", 300), v("okno", "vesmir", "Vesmír", "🪐", 600),
];

export const vychoziVec = (m: MistoVybaveni) => VYBAVENI.find((x) => x.misto === m && x.cena === 0)!;

export function maVec(s: SbirkaStav, id: string): boolean {
  const x = VYBAVENI.find((y) => y.id === id);
  return !!x && (x.cena === 0 || (s.vybaveni?.mam ?? []).includes(id));
}

/** Co stojí na kterém místě (klíč věci bez předpony místa, např. „mapa“). */
export function nasazeneVybaveni(s: SbirkaStav): Record<MistoVybaveni, string> {
  return Object.fromEntries(MISTA.map(({ misto }) => {
    const id = s.vybaveni?.nasazeno?.[misto];
    const x = id && maVec(s, id) ? VYBAVENI.find((y) => y.id === id)! : vychoziVec(misto);
    return [misto, x.id.slice(misto.length + 1)];
  })) as Record<MistoVybaveni, string>;
}

/** Koupí věc za krystaly a rovnou ji postaví na místo. */
export function kupVec(s: SbirkaStav, id: string): { s: SbirkaStav; vysledek: boolean } {
  const x = VYBAVENI.find((y) => y.id === id);
  if (!x || maVec(s, id) || krystaly(s) < x.cena) return { s, vysledek: false };
  const vyb = s.vybaveni ?? { mam: [], nasazeno: {} };
  return { s: { ...s, utraceno: s.utraceno + x.cena, vybaveni: { mam: [...vyb.mam, id], nasazeno: { ...vyb.nasazeno, [x.misto]: id } } }, vysledek: true };
}

export function postavVec(s: SbirkaStav, id: string): { s: SbirkaStav; vysledek: boolean } {
  const x = VYBAVENI.find((y) => y.id === id);
  if (!x || !maVec(s, id)) return { s, vysledek: false };
  const vyb = s.vybaveni ?? { mam: [], nasazeno: {} };
  return { s: { ...s, vybaveni: { mam: vyb.mam, nasazeno: { ...vyb.nasazeno, [x.misto]: id } } }, vysledek: true };
}
