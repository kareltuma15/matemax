# Předání: nová 3D truhla (pro hlavní session MateMaxu)

Sepsáno 19. 11. 2026 ve vedlejší session (větev `claude/brave-ramanujan-4wx7sv`). Karel chce, aby o tom hlavní
session věděla, než se cokoli přenese do appky.

## Co na téhle větvi je

- **Jen mockup v `docs/`, žádná změna v `src/`.** Appka se nemění, na produkci nic nejde.
- `docs/gamifikace-2026-11/truhla-3d.html` – živá stránka (stejná jako artefakt https://claude.ai/artifact/SdE1w15qiMJPiVkPxmdh2E).
- `docs/gamifikace-2026-11/truhla-3d/*.ts` – zdroj mockupu. Importuje skutečného Hexíka a doplňky z `src/lib/hexik3d`
  (jen čtení, nic v nich nemění). Projde `tsc` i `eslint`.

## Co Karel rozhodl (19. 11.)

- Truhly se mu líbí, **víc zdobení nepřidávat**.
- Vnitřek musí být ve 3D (hotovo ve verzi 3: duté tělo, dřevěné stěny, prošívaný samet s knoflíky).
- Občas má být vidět znak MateMaxu: medailon M² na spodku víka, vidět jen po otevření. U Generálky tabule se vzorci.
- Všech 9 druhů truhel má jeden vlastní prvek podle toho, za co truhla je (záložka, tabule, sníh, ucha, 5 hvězd, krystaly).
- Po schválení se nové otevírání přenese do appky a vydá se sezónou Zima 7. 1. spolu s „Hexík ožil“.
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
| Nové otevírání truhly v appce | Claude Code | 19. 12. |
| 3D miniatury odměn v šatníku a 3D truhly v obchodě | Claude Code | 23. 12. |
| Výzva kamarádovi | Claude Code | 15. 1. |
| Hexík karta ke sdílení | Claude Code | 29. 1. |

## Poznámky pro přenos

- Mockup používá záři (bloom) přes `EffectComposer`. Na slabých telefonech ji vypnout a snížit rozlišení.
  Plátno už není průhledné (pozadí se kreslí ve scéně kvůli záři).
- Studio používá `RoomEnvironment` pro odlesky kovu. Hexík v něm vypadá dobře, ale ověřit i ostatní podoby.
- Odměna se v mockupu ukazuje jen pro doplněk na hlavu (`doplnekNaSlot`). Pro podobu, pozadí, vzhled, oslavu a efekt
  je potřeba dodělat vlastní odhalení (popsané v úkolu „Nové otevírání truhly v appce“).
