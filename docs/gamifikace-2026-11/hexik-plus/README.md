# Vylepšený 3D Hexík (mockup, 19. 11. 2026)

Živá stránka: `docs/gamifikace-2026-11/hexik-plus.html` (stejná jako artefakt „Vylepšený Hexík“).
Jen návrh, v `src/` se nic nemění. Staví na skutečném modelu z `src/lib/hexik3d/model.ts` a dodatečně upravuje:
obličej (polštářek se švem, ruměnec), oči (duhovka, dva odlesky, víčka, obočí), výrazy (radost, překvapení,
povzbuzení, ospalý, stýská se mu), ťuknutí a pohlazení, sledování očima, korunu nad ušima, světlo se studiem truhly.

Sestavení skriptu: `npx esbuild docs/gamifikace-2026-11/hexik-plus/entry.ts --bundle --minify --format=iife --outfile=hexik-plus.js`
