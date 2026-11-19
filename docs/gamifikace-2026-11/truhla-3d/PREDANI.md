# Předání: nová 3D truhla (pro hlavní session MateMaxu)

Sepsáno 19. 11. 2026 ve vedlejší session (větev `claude/brave-ramanujan-4wx7sv`). Karel chce, aby o tom hlavní
session věděla, než se cokoli přenese do appky.

## Co na téhle větvi je

- **Od 19. 11. i přenos do appky (Karel schválil, přenos dělá tahle vedlejší session):**
  - `src/lib/hexik3d/truhla-model.ts` – model truhly (9 druhů, Sezónní ve 3 podobách)
  - `src/lib/hexik3d/studio.ts` – odlesky, pozadí ve scéně, záře (bloom) jen na silných zařízeních; bez GPU (SwiftShader) nejlehčí varianta
  - `src/lib/hexik3d/truhla.ts` – nové otevírání: 3 klepnutí, odměna ve 3D (doplněk, malý Hexík v nové podobě, medailon), rozpad na krystaly, nasazení na Hexíka; samootevření hlídá skutečný čas
  - `src/components/hexik/TruhlaScena.tsx` – okno přes celou obrazovku (na počítači vysoký panel), karta odměny, Nasadit/Hotovo; `data-testid` zachované
  - `src/app/(app)/sbirka/page.tsx` – staré okno nahrazené `TruhlaScena`
  - `src/data/kronika-obsahu.json` – zápis „Nové truhly“ (datum null, novinka od 1. 12.)
- Ověřeno: `tsc`, `eslint`, `next build` (s falešnými klíči Stripe/VAPID, kód prošel), e2e Sbírky 92/92 po jednom na počítači i telefonu.
- Nestabilní už v původním kódu (ne kvůli truhle): `e2e/kalendar.spec.ts:78` (na původním kódu padl 4× ze 6). `e2e/obsah.spec.ts:65` potřebuje `.env.local`.
- Mockup zůstává v `docs/`:
- `docs/gamifikace-2026-11/truhla-3d.html` – živá stránka (stejná jako artefakt https://claude.ai/artifact/SdE1w15qiMJPiVkPxmdh2E).
- `docs/gamifikace-2026-11/truhla-3d/*.ts` – zdroj mockupu. Importuje skutečného Hexíka a doplňky z `src/lib/hexik3d`
  (jen čtení, nic v nich nemění). Projde `tsc` i `eslint`.

## Co Karel rozhodl (19. 11.)

- Truhly se mu líbí, **víc zdobení nepřidávat**.
- Vnitřek musí být ve 3D (hotovo ve verzi 3: duté tělo, dřevěné stěny, prošívaný samet s knoflíky).
- Občas má být vidět znak MateMaxu: medailon M² na spodku víka, vidět jen po otevření.
- Generálka (test nanečisto): tabule v dubovém rámu s opraveným testem křídou (vzorce s fajfkami, „Generálka“, 50 b v kroužku, Hexík), polička s křídami, cedulka GENERÁLKA zepředu.
- Všech 9 druhů truhel má jeden vlastní prvek podle toho, za co truhla je (záložka, tabule, ucha, 5 hvězd, krystaly).
- **Sezónní truhla** (TruhlaId `sezonni`) má tři podoby podle `aktualniSezona()`: Vánoční (dárek: zelená stuha s mašlí, světýlka), Zimní (sníh mezi pásy, rampouchy), Finiš (šachovnicové pásy). Mapování je `SEZONNI_MODEL` v `truhla-model.ts`.
- **Vydání: 1. 12. 2026 spolu s adventním kalendářem a Vánoční truhlou** (Karel 19. 11.). Přenos do appky musí být hotový a otestovaný do 30. 11.
- Pořadí prací: QR kód na test nanečisto 12. 12. → nová truhla v appce + 3D miniatury → výzva kamarádovi → Hexík karta.

## Které soubory v appce se přenos dotkne

Prosím needitovat je bez domluvy, dokud přenos neproběhne (ať nevznikne konflikt):

- `src/lib/hexik3d/truhla.ts` – nahradí ho `truhla-model.ts` + `scena-sdilena.ts` + `nova-truhla.ts`
- `src/components/hexik/TruhlaScena.tsx` – otevírání přes celou obrazovku
- `src/app/(app)/sbirka/page.tsx` – okno otevírání truhly a odhalení odměny (dnes `OdmenaVizual` pod truhlou)
- `src/components/hexik/OdmenaVizual.tsx`, `.hx-truhla` v `globals.css` – později 3D miniatury
- e2e testy truhly (`data-testid` `truhla-3d`, `truhla-otevrit-hned`, `odhaleni*`) – zachovat nebo upravit

`lib/sbirka.ts` (katalog, šance truhel, losování) se **nemění**, scéna jen ukazuje předem vylosovaný výsledek.

## Úkoly v MS Dashboardu (projekt MateMax)

| Úkol | Kdo | Termín |
|---|---|---|
| Projít novou 3D truhlu a napsat připomínky | Karel | 22. 11. |
| QR kód a text „Otevři si truhlu Generálka“ k testu 12. 12. | Claude Code | 5. 12. |
| Dodělat zbylých 5 druhů truhel + zimní vzhled | Claude Code | 5. 12. (v mockupu hotovo, čeká na schválení) |
| Nové otevírání truhly v appce (vydání 1. 12.) | Claude Code | 30. 11. |
| 3D miniatury odměn v šatníku a 3D truhly v obchodě | Claude Code | 23. 12. |
| Výzva kamarádovi | Claude Code | 15. 1. |
| Hexík karta ke sdílení | Claude Code | 29. 1. |

## Poznámky pro přenos

- **Termín:** vydání 1. 12. (Vánoční truhla je vidět jen 1. 12. – 6. 1.). Adventní kalendář otevírá Sezónní truhlu (`lib/kalendar.ts`), takže nové otevírání se ukáže i tam.

- Mockup používá záři (bloom) přes `EffectComposer`. Na slabých telefonech ji vypnout a snížit rozlišení.
  Plátno už není průhledné (pozadí se kreslí ve scéně kvůli záři).
- Studio používá `RoomEnvironment` pro odlesky kovu. Hexík v něm vypadá dobře, ale ověřit i ostatní podoby.
- Odměna se v mockupu ukazuje jen pro doplněk na hlavu (`doplnekNaSlot`). Pro podobu, pozadí, vzhled, oslavu a efekt
  je potřeba dodělat vlastní odhalení (popsané v úkolu „Nové otevírání truhly v appce“).
