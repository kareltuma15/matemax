# Revize odměn (mockup 19. 11. 2026)

- `../revize-odmen.html` – samostatná stránka (otevři v prohlížeči).
- `odmeny3d.ts` – 3D části mockupu: miniatury do šatníku jedním rendererem, scénky pro pozadí profilu (Synthwave, Podmoří, Polární záře) a Vánoční pokojíček. Staví na `src/lib/hexik3d`.
- `entry.ts` – vstup pro sestavení: `npx esbuild entry.ts --bundle --minify --format=iife --tsconfig=../../../tsconfig.json --alias:three=../../../node_modules/three --outfile=odmeny3d.js`

Osobní QR a propojení s Testy nanečisto: `../qr-propojeni.html`.
