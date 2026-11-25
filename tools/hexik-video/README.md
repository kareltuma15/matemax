# Hexík videa (TikTok, Reels, Shorts)

Výroba krátkých videí 1080×1920 s 3D Hexíkem z MateMaxu (stejný model jako v appce, `src/lib/hexik3d`).
Nástroj je mimo appku, na web se nic nenasazuje. Scénáře pilotu: dokument „Hexík videa (TikTok, Reels, Shorts): pilot 3 videí“ v MS Dashboardu.

## Jak vyrobit video

```
cd tools/hexik-video
npm install            # jednou (esbuild + ffmpeg)
npm run video -- hexik-01
```

Hotové video je v `vystup/hexik-01.mp4` (H.264, 30 fps, 1080×1920). Nahraj ho na Disk do `04 Videolekce/Hexík videa/`.

- **S hlasem:** nahrávku z telefonu ulož jako `hlas/hexik-01-hlas.m4a` (02, 03), stejně jako na Disku v `04 Videolekce/Hexík videa/hlas`. Nástroj ji vyčistí od šumu, posune výš (`"vyskaHlasu"` ve scénáři, výchozí 1,32 ≈ +5 půltónů), srovná hlasitost, podle pauz ji rozdělí na bloky scénáře a podle hlasitosti hýbe Hexíkovi pusou. U videa 3 vloží 10 s ticha na odpočet sám.
- **Bez hlasu:** `npm run video -- hexik-01 --bez-hlasu` (titulky + zvuky křídy, odpočtu a závěru).
- **Rychlá kontrola:** `--nahled` (15 snímků za sekundu), `--snimek 12.5` uloží jeden obrázek z času 12,5 s.
- **Jiná nahrávka:** `--hlas cesta/k/souboru.m4a`.

## Scénář (`scenare/hexik-0X.json`)

Video je rozdělené na bloky (řádky tabulky ze scénáře). Časy uvnitř bloku jsou od začátku bloku; když je nahrávka hlasu, přepočtou se podle skutečné délky řeči.

| Pole bloku | Co dělá |
|---|---|
| `od`, `do` | čas bloku v sekundách (bez hlasu) |
| `titulky` | věty titulků, rozdělí se na čas řeči v bloku |
| `vyraz` | `neutral`, `radost`, `prekvapeni`, `povzbuzeni`, `smutny`, `ospaly` |
| `tabule` | `{ "t", "radek", "text", "styl": "zvyrazni" \| "zlaty" }`, `{ "t", "radek", "preskrtni": true }`; text, který začíná textem předchozího řádku, se jen dopíše |
| `gesta` | `kyv` (přikývne), `vrteni` (zavrtí hlavou), `premysli`, `krida` |
| `reakce` | tanečky z appky (`tanec`, `jasot`, `mavani`, …), na konci se opakuje do konce videa |
| `odpocet` | `{ "od", "do", "z" }` velké kolo s čísly na tabuli + tikání |
| `bezReci` | blok bez řeči (odpočet), délka zůstává ze scénáře |
| `zaver`, `zaverT` | tabule se smaže a objeví se logo MateMax a `matemax.matematika-snadno.cz` |
| `bubliny` | `{ "t", "co": "?" }` bublina vedle Hexíkovy hlavy (?, !, 💡, ✔) |

Scéna (`src/scena.ts`): 3D pokoj ze stejných dílů jako pokojíčky v appce (okno se sněžením, blikající světýlka, lampa, kytka, police, prach ve světle), kamera najede na začátku, přiblíží se k tabuli při psaní a k Hexíkovi při tanci, titulky zvýrazňují právě vyslovované slovo. První verze s kresleným pozadím je v `src/scena-v1.ts`.

Logo vpravo dole je jen MateMax (pravidlo značky). Odkaz na TikToku patří do bio s UTM ze scénáře (`utm`).
