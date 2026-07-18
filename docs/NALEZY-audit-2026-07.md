# Nálezy — audit MateMaxu (červenec 2026)

> **Účel:** Pracovní seznam problémů k postupnému řešení. U každého: co žák vidí, proč to vadí, návrh řešení, stav.
> Procházíme jeden po druhém — navrhneme řešení, opravíme, otestujeme, odškrtneme.
>
> **Zdroje nálezů:** UX průchod aplikací v roli žáka (mobil, 2026-07-17) + audit databáze proti pracovnímu sešitu 07/2026.
> Související: `docs/STRUKTURA-cermat-sesit-matemax.md`, `docs/audit-databaze-2026-06.md`

**Legenda stavu:** 🔴 k řešení · 🟡 rozpracované · ✅ hotovo · ⏸️ čeká na rozhodnutí/tebe

---

## Přehled

| # | Problém | Závažnost | Stav |
|---|---------|-----------|------|
| 1 | Česká zadání jako matematická změť | Kritická | ✅ |
| 2 | Statistiky na landingu ukazují nuly | Kritická | ✅ |
| 3 | Diagnostika o 2 otázkách odemkne L3 | Důležitá | 🔴 |
| 4 | Nekonzistentní čísla napříč aplikací | Důležitá | 🔴 |
| 5 | Zámky v diagnostice matou | Důležitá | 🔴 |
| 6 | Podtémata jako syrové slugy | Důležitá | 🔴 |
| 7 | Landing dlouhý a mluví na rodiče | Kosmetická | 🔴 |
| 8 | Registrace má zbytečná pole | Kosmetická | 🔴 |
| 9 | Jméno z registrace se nepoužívá | Kosmetická | 🔴 |
| 10 | Zlomkové slovní úlohy tenké na L1 | Obsahová | 🔴 |
| 11 | Rovnice skoro bez KaTeXu (9/108) | Obsahová | 🔴 |
| 12 | Podtémata roztříštěná u výrazů a grafů | Obsahová | 🔴 |
| 13 | Chybí `ANTHROPIC_API_KEY` → AI hint vypnutý | Konfigurace | ⏸️ |
| 14 | Vercel Hobby → připomínka 1 h před testem nejede | Konfigurace | ⏸️ |
| 15 | Přihlášená část neproauditovaná | Ověření | ⏸️ |

---

## 1. Česká zadání se sázela jako matematická změť ✅

**Co žák viděl:** místo zadání nečitelný shluk kurzívních písmen bez mezer:

```
„Z čísla 48 odečteme jeho čtvrtinu a třetinu. Kolik zbyde?"
→ 𝑍𝑐ˇıˊ𝑠𝑙𝑎48𝑜𝑑𝑒𝑐ˇ𝑡𝑒𝑚𝑒𝑗𝑒ℎ𝑜𝑐ˇ𝑡𝑣𝑟𝑡𝑖𝑛𝑢𝑎𝑡𝑟ˇ𝑒𝑡𝑖𝑛𝑢…
```

**Proč to vadí:** žák si řekne, že je aplikace rozbitá. Postihovalo 8 příkladů.

**Příčina:** `MathDisplay` měl pravidlo „když text neobsahuje `$`, vysázej ho celý jako LaTeX". Věta bez `$` tak šla celá do KaTeXu, který z každého písmene udělal proměnnou a zahodil mezery. Nešlo spravit jen vypnutím `latex: true` — příznak je společný pro zadání i `reseni_kroky`, a ty obsahují skutečný LaTeX.

**Řešení:** oprava v rendereru — bez `$` se do KaTeXu pošle jen text, který opravdu obsahuje matematickou notaci (`\ ^ _ { }`), jinak se vykreslí jako text. Řeší i budoucí příklady.

**Ověřeno:** 8 prózových → text, 266 se `$...$` beze změny, 6 opravdu LaTeXových dál přes KaTeX. V prohlížeči potvrzeno na ZLO_068 + regrese sázení zlomků.

**Commit:** `437d165`

---

## 2. Statistiky na landingu ukazovaly nuly ✅

**Co návštěvník viděl:** `0+ příkladů v databázi · 0 témat CERMAT · 0 min denně stačí`

**Proč to vadilo:** je to přesně v místě, kde se rodič i žák rozhoduje, jestli produktu věřit. „0 příkladů" = prázdný produkt.

**Příčina:** `CountUp` startoval na 0 a čekal na `IntersectionObserver` s `threshold: 0.5`. Když observer nesepnul (nespolehlivý při prvním načtení, malý viewport, rychlý scroll), nula tam zůstala natrvalo — bez jakékoli pojistky. Přitom `useScrollReveal` hned nad ním se tuhle lekci už naučil a fallback má.

**Řešení:**
- Pojistka: když do 1,2 s nic nesepne, číslo se dosadí napřímo.
- Start i bez observeru, když je prvek už ve výřezu (stejný vzor jako `useScrollReveal`).
- `threshold` 0.5 → 0.
- `prefers-reduced-motion` dostane rovnou výsledek místo animace.

**Ověřeno:** mobilní výřez, bez scrollování se zobrazí 900+ / 9 / 10 min (dřív 0+ / 0 / 0 min), po doscrollování stejné hodnoty, žádné zaseknutí na mezihodnotě, konzole čistá.

**Commit:** `787d2db`

**Pozn.:** kódování `page.tsx` ověřeno jako čisté UTF-8 (round-trip bajtově identický) — editace skriptem proběhla bez poškození.

---

## 3. Diagnostika o 2 otázkách odemkne nejtěžší úroveň 🔴

**Co se stalo:** v diagnostice jsem u zlomků trefil 2/2 → 100 % → podle pravidla `diag ≥ 85 %` se hned odemkla úroveň L3. Další trénink mi rovnou naservíroval „Střední ⭐⭐".

**Proč to vadí:** dvě uhodnuté otázky nejsou důkaz zvládnutí. Žák, který tipoval, dostane těžké příklady a znechutí se. Je to v přímém rozporu s pedagogikou sešitu („začni vždy lehkými").

**Příčina:** vlastní návrh z commitu `5827292` — konstanty `DIAG_UNLOCK_L2 = 0.6`, `DIAG_UNLOCK_L3 = 0.85` nad vzorkem pouhých 2 otázek na téma.

**Návrh řešení:** z diagnostiky odemykat **maximálně L2**; L3 až po prokázaném procvičení (`UNLOCK_CORRECT` správných na L2). Diagnostika má sloužit k zacílení slabin, ne k přeskočení úrovní.

**Kde:** `src/app/(app)/trenink/page.tsx` — `unlockedMaxLevel()`

---

## 4. Nekonzistentní čísla napříč aplikací 🔴

| Údaj | Uváděné hodnoty | Kde |
|---|---|---|
| Délka diagnostiky | **5 min** / **8 min** / **10 min** | landing (jak to funguje) / `/vitej` / landing (co tě čeká) |
| Počet příkladů | **700+** / **900+** (reálně **925**) | mapa témat, meta description / landing, ceník, FAQ |
| Počet žáků | **1 200+** / **500+** | landing / pracovní sešit |

**Proč to vadí:** žák si toho nevšimne, rodič ano — působí to nedbale a podkopává důvěru.

**Návrh řešení:** jeden zdroj pravdy. Počet příkladů odvozovat z dat (`examples.length`), ne psát ručně. Délku diagnostiky a počet žáků sjednotit na jedno číslo a použít všude.

**Kde:** `src/app/page.tsx`, `src/app/(app)/vitej/page.tsx`, `src/app/layout.tsx` (meta description), `GuestTopicMap`

---

## 5. Zámky v diagnostice matou 🔴

**Co žák vidí:** v průběhu diagnostiky jsou kroky označené `Konstrukce 🔒`, `Úhly 🔒`, `Výrazy 🔒` — ale otázky z nich stejně vyplňuje.

**Proč to vadí:** zámek u něčeho, co právě dělám, nedává smysl. Diagnostika má změřit všechna témata — to je její smysl.

**Návrh řešení:** v diagnostice zámky nezobrazovat vůbec. Premium gating patří do tréninku, ne do vstupního měření.

**Kde:** `src/app/(app)/diagnostika/page.tsx` (seznam kroků s tématy)

---

## 6. Podtémata se ukazují jako syrové slugy 🔴

**Co žák vidí:** nad příkladem `odcitani`, `scitani a odcitani`, `kombinovane` — malým písmem, bez diakritiky a velkých písmen.

**Proč to vadí:** vypadá to jako nedodělek / interní databázový údaj, který se omylem dostal ven.

**Stav:** popisky mají zatím jen slovní úlohy, geometrie a konstrukce (doplněno v `6afe452` a `b028069`). Chybí zlomky, výrazy, rovnice, grafy, úhly, souhrnné.

**Návrh řešení:** doplnit `PODTEMA_LABELS` pro zbývající témata. Fallback `podtemaLabel()` už existuje, takže stačí přidat dvojice klíč → popisek. Alternativa: pokud podtéma nemá popisek, nezobrazovat ho vůbec (lepší než syrový slug).

**Kde:** `src/types/index.ts` — `PODTEMA_LABELS`

---

## 7. Landing je dlouhý a mluví hlavně na rodiče 🔴

**Co žák vidí:** po hero sekci následuje „Pro rodiče", „Vidíte přesně, jak se dítě připravuje", srovnání s doučovatelem, ceník, FAQ. Jediná reference od žáka je „Tomáš, 14 let".

**Proč to vadí:** cílový uživatel produktu je žák, ale stránka mluví o něm ve třetí osobě („dítě"). Žák se v ní nepozná.

**Návrh řešení k diskusi:** zvážit kratší cestu pro žáka (např. přepínač „jsem žák / jsem rodič", nebo posunout obsah pro rodiče níž a nahoru dát to, co zajímá žáka). Chce to rozmyslet — landing zároveň prodává rodičům, kteří platí.

⏸️ **Vyžaduje tvoje rozhodnutí** — kdo je primární publikum landingu.

---

## 8. Registrace má zbytečná pole 🔴

**Co žák vyplňuje:** Jméno, Příjmení, Email, Heslo, Heslo znovu (5 polí) + Google.

**Návrh řešení:** vypustit **Příjmení** (k čemu ho používáme?) a **Heslo znovu** ve prospěch tlačítka „zobrazit heslo". Každé pole navíc snižuje dokončení registrace.

⏸️ **Otázka na tebe:** potřebuješ příjmení kvůli reportům pro rodiče / fakturaci?

**Kde:** `src/app/(auth)/registrace/form.tsx`

---

## 9. Jméno z registrace se nepoužívá 🔴

**Co se děje:** `/vitej` si počítá `firstName` z e-mailové adresy (`email.split("@")[0]`), ale nikde ho nezobrazí — proměnná je nepoužitá. Přitom jméno máme z registrace.

**Návrh řešení:** oslovit žáka jménem („Vítej, Aničko! 🎉“) z metadat účtu. Drobnost s velkým dopadem na pocit z první obrazovky.

**Kde:** `src/app/(app)/vitej/page.tsx` (ř. 54)

---

## 10. Zlomkové slovní úlohy jsou tenké na L1 🔴

**Zjištění z auditu DB:** sešit má slovní úlohy v každé úrovni (pizza, zahrada), databáze má u zlomků `slovni_uloha` jen na L2/L3, na L1 žádnou.

**Proč to vadí:** žák na lehké úrovni dostává jen čisté počítání, nenaučí se převádět text na výpočet — což je jádro CERMATu.

**Návrh řešení:** doplnit ~5 lehkých slovních úloh se zlomky ve stylu sešitu.

---

## 11. Rovnice skoro bez KaTeXu 🔴

**Zjištění:** pouze **9 ze 108** příkladů u rovnic má `latex: true`, přestože zlomkové rovnice matematickou sazbu potřebují.

**Návrh řešení:** projít rovnice a u těch se zlomky doplnit KaTeX zápis. Pozor na nález #1 — zadání musí mít `$...$` kolem matematiky, ne být celé LaTeX.

---

## 12. Podtémata roztříštěná u výrazů a grafů 🔴

**Zjištění:** výrazy mají 21 podtémat (10 s jediným příkladem), grafy a logika 26 (19 s jediným). Geometrie a slovní úlohy už sjednocené (`6afe452`).

**Proč je to nižší priorita:** sešit u těchto témat podkapitoly nedefinuje, takže nejde o rozpor s předlohou — jen o nepořádek, který prosakuje do UI (viz #6).

**Návrh řešení:** sjednotit na rozumný počet (~5–6 na téma) podle typů úloh v sešitu.

---

## 13. Chybí `ANTHROPIC_API_KEY` → AI hint je vypnutý ⏸️

**Stav:** `/api/hint` (Claude Haiku) je hotové a napojené, ale klíč není v `.env.local` (a nejspíš ani na Vercelu). Bez něj se tlačítko „🤖 hint od AI" po kliknutí skryje (ošetřeno v `e68d612`), takže to nevypadá rozbitě — ale funkce nefunguje.

⏸️ **Vyžaduje tebe:** doplnit klíč do `.env.local` i na Vercel. Nemůžu s klíči manipulovat.

---

## 14. Vercel Hobby → připomínka 1 h před testem nejede ⏸️

**Stav:** Hobby dovolí 2 crony a jen denní frekvenci. Připomínky na testy nanečisto se proto vezou s denním cronem (`6b0b9b5`). Připomínka **24 h předem funguje**, „za hodinu začínáme" ne — potřebovala by hodinový běh.

**Možnosti:** (a) nechat být, (b) Vercel Pro ($20/měs), (c) externí hodinový trigger zdarma (např. GitHub Actions volající `/api/cron/test-reminders`) — kód je na to připravený.

⏸️ **Tvoje rozhodnutí.**

---

## 15. Přihlášená část neproauditovaná ⏸️

**Proč:** nemůžu zakládat účty ani zadávat hesla, takže jsem první přihlášený dojem hodnotil jen z kódu.

**Co je potřeba projít tobě:**
- Co přesně vyskočí hned po registraci (nevyskočí toho moc najednou?)
- Uvítací modál, první session, odznaky, level-up, streak
- Profil a statistiky
- Propojení s rodičem
- Testy nanečisto celým flow (vyžaduje vypsaný termín + nahraná PDF)

**Navíc k ověření vizuálně** (screenshoty mi v prostředí nefungovaly):
- Je vybraná odpověď v diagnostice dost vidět? Odznak písmene se modře přebarví, ale u zvýraznění pozadí mi měření nesedělo.

---

## Co už je hotové (kontext)

Pro úplnost — dnes vyřešeno a nasazeno:

| Oblast | Commit |
|---|---|
| Online testy nanečisto — testovací místnost, oprava, zpětná vazba | `2876673` |
| Notifikační emaily kolem termínu | `b435980` |
| Připomínky přesunuty do denního cronu (Hobby) | `6b0b9b5` |
| Sjednocení podtémat: geometrie → rovinné/prostorové + diakritika | `6afe452` |
| Interaktivní konstrukce (8 úloh, krok za krokem) | `b028069` |
| Dorovnání pokrytí: úhly L2/L3, souhrnné L1 | `e577d8b` |
| Session builder: progrese L1→L2→L3 | `5827292` |
| AI hint: bez klíče se tlačítko skryje | `e68d612` |
| Oprava sázení českých zadání | `437d165` |
