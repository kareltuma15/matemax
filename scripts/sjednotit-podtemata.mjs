// Nález #12: sjednocení roztříštěných podtémat u výrazů a grafů.
//
// Výrazy měly 21 podtémat (10 s jediným příkladem), grafy a logika 26
// (spousta „zakonitost_*", „kombinatorika_*", „dedukce_*" po jednom). Sešit
// u těchto témat podkapitoly nedefinuje, takže nejde o rozpor s předlohou —
// jen o nepořádek, který prosakuje do UI (podtéma nad příkladem, filtr).
// Sjednoceno na 6 smysluplných podtémat podle typu úloh.
//
// Spustit: node scripts/sjednotit-podtemata.mjs   (idempotentní — cíle mapují na sebe)
import fs from "fs";

const FILES = ["src/data/databaze.json", "src/data/cermat-200.json"];

// Mapa staré podtéma → nové. Cílová podtémata mapují sama na sebe, takže
// druhý běh nic nezmění.
const MAPA = {
  vyrazy: {
    dosazovani: "dosazovani",
    umocnovani: "mocniny",
    mocniny: "mocniny",
    mocniny_prirozenych_cisel: "mocniny",
    mocniny_zapornych_cisel: "mocniny",
    mocniny_porovnani: "mocniny",
    zakony_mocnin: "zakony_mocnin",
    pravidla_pro_mocniny: "zakony_mocnin",
    pravidla_zaporne_mocniny: "zakony_mocnin",
    odmocniny: "odmocniny",
    odmocniny_zjednoduseni: "odmocniny",
    odmocniny_vypocet: "odmocniny",
    odmocniny_rovnice: "odmocniny",
    roznasobeni: "uprava_vyrazu",
    vytkani: "uprava_vyrazu",
    zjednodusovani: "uprava_vyrazu",
    slozeny_zlomek: "uprava_vyrazu",
    vzorce: "uprava_vyrazu",
    komplexni_vypocet: "uprava_vyrazu",
    uprava_vyrazu: "uprava_vyrazu",
    pythagorova_veta: "pythagorova_veta",
    pythagorova_veta_aplikace: "pythagorova_veta",
  },
  grafy_logika: {
    aritmeticka_posloupnost: "aritmeticka_posloupnost",
    geometricka_posloupnost: "geometricka_posloupnost",
    posloupnosti: "posloupnosti",
    kombinatorika: "kombinatorika",
    kvadraticka_posloupnost: "posloupnosti",
    fibonacciho_posloupnost: "posloupnosti",
    trojuhelnikova_cisla: "posloupnosti",
    kubicka_posloupnost: "posloupnosti",
    zakonitost_posloupnosti: "posloupnosti",
    ruzna_vzorec: "ciselne_zakonitosti",
    ciselne_zakonitosti: "ciselne_zakonitosti",
    ciselna_zakonitost: "ciselne_zakonitosti",
    zakonitost_tabulka: "ciselne_zakonitosti",
    zakonitost_cisla: "ciselne_zakonitosti",
    zakonitost_obrazce: "ciselne_zakonitosti",
    zakonitost_dvojice_cisel: "ciselne_zakonitosti",
    zakonitost_v_tabulce: "ciselne_zakonitosti",
    zakonitost_slozena: "ciselne_zakonitosti",
    logicka_dedukce: "logicka_dedukce",
    ciselne_zakonitosti: "ciselne_zakonitosti",
    pravdivostni_tabulka: "logicka_dedukce",
    dedukce_tabulka: "logicka_dedukce",
    logicka_dedukce_lhari_a_pravdomluvni: "logicka_dedukce",
    komplexni_dedukce: "logicka_dedukce",
    sit_a_prostorove_mysleni: "logicka_dedukce",
    rozvrh_kombinatorika: "kombinatorika",
    kombinatorika_vyber: "kombinatorika",
    kombinatorika_hesla: "kombinatorika",
    kombinatorika_cesty: "kombinatorika",
  },
};

let zmen = 0;
const neznama = new Set();

for (const file of FILES) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const ex of data.examples) {
    const mapaTematu = MAPA[ex.tema];
    if (!mapaTematu) continue;
    const nove = mapaTematu[ex.podtema];
    if (nove === undefined) { neznama.add(`${ex.tema}/${ex.podtema}`); continue; }
    if (ex.podtema !== nove) { ex.podtema = nove; zmen++; }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

if (neznama.size) {
  console.log("⚠ Nezmapovaná podtémata (ponechána beze změny):");
  for (const n of neznama) console.log("   " + n);
}
console.log(zmen === 0 ? "Nic k úpravě ✅" : `Přemapováno příkladů: ${zmen} ✅`);
