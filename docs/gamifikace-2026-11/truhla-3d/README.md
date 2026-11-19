# Nová 3D truhla (mockup, 19. 11. 2026)

Návrh nového otevírání truhly a nového modelu truhly. Živá stránka: `docs/gamifikace-2026-11/truhla-3d.html`
(stejná jako artefakt „Truhly a růst MateMaxu“).

Soubory:

- `truhla-model.ts` – model truhly v hračkovém stylu Hexíka (baculaté tělo, drážky prken, kování, šestiúhelníkový zámek s drahokamem, prošívaný samet). Všech 9 druhů z appky (denni, doporuceni, generalka, legendarni, sezonni → vanocni/zimni/finis, krystalova, velka, mistrovska, zlata), každý s jedním vlastním prvkem. Dutá: vnitřní stěny, prošívané sametové dno, ve víku medailon M².
- `scena-sdilena.ts` – studio: odlesky (RoomEnvironment), pozadí ve scéně, jemná záře (bloom).
- `nova-truhla.ts` – otevírání: 3 klepnutí se stupňováním vzácnosti, nádech, víko, světlo, odměna ve 3D, nasazení na Hexíka.
- `prohlidka.ts` – prohlídka truhly (otáčení tažením, víko).
- `entry.ts` – vstup pro sestavení mockupu.

Používá skutečného Hexíka a doplňky z `src/lib/hexik3d`. Při přenosu do appky se `truhla-model.ts` a `scena-sdilena.ts` přesunou do `src/lib/hexik3d` a nahradí `truhla.ts`.

Sestavení skriptu mockupu (esbuild není v závislostech projektu, stačí `npx`):

```
npx esbuild docs/gamifikace-2026-11/truhla-3d/entry.ts --bundle --minify --format=iife --outfile=truhla-mockup.js
```

Hotový skript se pak vloží do `truhla-3d.html` místo současného `<script>` s minifikovaným kódem.
