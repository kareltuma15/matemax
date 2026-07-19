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
| 3 | Diagnostika o 2 otázkách odemkne L3 | Důležitá | ✅ |
| 4 | Nekonzistentní čísla napříč aplikací | Důležitá | ✅ |
| 5 | Zámky v diagnostice matou | Důležitá | ✅ |
| 6 | Podtémata jako syrové slugy | Důležitá | ✅ |
| 7 | Landing dlouhý a mluví na rodiče | Kosmetická | 🔴 |
| 8 | Registrace má zbytečná pole | Kosmetická | 🔴 |
| 9 | Jméno z registrace se nepoužívá | Kosmetická | 🔴 |
| 10 | Zlomkové slovní úlohy tenké na L1 | Obsahová | 🔴 |
| 11 | Rovnice skoro bez KaTeXu (9/108) | Obsahová | 🔴 |
| 12 | Podtémata roztříštěná u výrazů a grafů | Obsahová | 🔴 |
| 13 | Chybí `ANTHROPIC_API_KEY` → AI hint vypnutý | Konfigurace | ⏸️ |
| 14 | Vercel Hobby → připomínka 1 h před testem nejede | Konfigurace | ⏸️ |
| 15 | Přihlášená část neproauditovaná | Ověření | ⏸️ |
| 16 | Geometrie je zdarma i premium zároveň | **Kritická** | 🔴 |
| 17 | Odhlášení smaže postup, který se nevrátí | **Kritická** | 🟡 čeká na migraci |

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

## 3. Diagnostika o 2 otázkách odemykala nejtěžší úroveň ✅

**Co se stalo:** v diagnostice jsem u zlomků trefil 2/2 → 100 % → podle pravidla `diag ≥ 85 %` se hned odemkla úroveň L3. Další trénink mi rovnou naservíroval „Střední ⭐⭐".

**Proč to vadilo:** dvě uhodnuté otázky nejsou důkaz zvládnutí. Žák, který tipoval, dostane těžké příklady a znechutí se. V přímém rozporu s pedagogikou sešitu („začni vždy lehkými").

**Příčina:** vlastní návrh z commitu `5827292` — `DIAG_UNLOCK_L3 = 0.85` nad vzorkem pouhých 2 otázek na téma.

**Řešení:** diagnostika odemyká nejvýš **L2** (při 2 otázkách = obě správně; jen zabrání tomu, aby silný žák dostával samé lehké). **L3 chce prokázané procvičení** — 4 správné odpovědi na L2 v daném tématu. Konstanta `DIAG_UNLOCK_L3` odstraněna.

**Ověřeno:**
- Deterministicky, 10 scénářů: diag 100 % → max L2 · 4×L2 → L3 · 3 správné nestačí · špatné odpovědi se nepočítají.
- Naživo: stav „zlomky 2/2 z diagnostiky" dřív startoval na Střední, nyní session běží **Lehká → Střední ×6** a těžká se neobjeví vůbec.

**Commit:** `d1db5ab`

---

## 4. Nekonzistentní čísla napříč aplikací ✅

| Údaj | Bylo | Nyní |
|---|---|---|
| Délka diagnostiky | **5 / 8 / 10 min** | **8 min** všude |
| Počet příkladů | **700+ / 900+** (reálně 925) | **900+** všude |
| Počet žáků | **1 200+** vs **500+** v sešitu | **500+** (shodně se sešitem) |

**Proč to vadilo:** žák si toho nevšimne, rodič ano — působilo to nedbale.

**Řešení:** `src/lib/site-stats.ts` drží čísla na jednom místě; všech 11 výskytů (landing, metadata, manifest, uvítací email, mapa témat, uvítací obrazovka) je odtud.
- Počet příkladů zaokrouhlen dolů na padesátky → tvrzení zůstane pravdivé i po přidání příkladů.
- Popis webu v `layout.tsx` byl 3× zkopírovaný → jedna konstanta.
- **Vědomě bez importu dat:** landing i mapa témat jsou klientské komponenty, nemá smysl kvůli jednomu číslu tahat do bundlu 400 kB JSONu. Soulad s databází proto hlídá `scripts/check-site-stats.mjs` (selže, když se rozejdou).

**Rozhodnutí Karla:** 500+ žáků (shoda se sešitem), diagnostika 8 minut.

**Pozn.:** „10 minut denně" u tréninku je jiný údaj a zůstává beze změny.

**Ověřeno:** landing 500+ / 8 min (obě místa) / 900+, meta description 900+, mapa témat „9 témat · 900+ příkladů", nikde nezůstal nezinterpolovaný `${...}`, konzole čistá.

**Commit:** `3c8bf27`

---

## 5. Zámky v diagnostice matou ✅

**Co žák viděl:** v průběhu diagnostiky kroky označené `Konstrukce 🔒`, `Úhly 🔒`, `Výrazy 🔒` — ale otázky z nich stejně vyplňoval.

**Proč to vadilo:** zámek u něčeho, co právě dělám, nedává smysl. Diagnostika má změřit všechna témata, aby mohla zacílit slabiny.

**Řešení:** zámky z diagnostiky odstraněny (obě zobrazení — hlavička kroku i seznam pod ukazatelem). Odstraněny i osiřelé importy `isTopicLocked` / `usePremium` — diagnostika už premium stav nikde nepotřebuje. Gating zůstává v mapě témat a tréninku.

**Ověřeno:** jako host všech 8 kroků bez jediného zámku (dřív jich mělo 5), regresně mapa témat dál zamyká 7 témat a sekci „ZAMČENO".

**Commit:** `3af6ee8`

---

## 6. Podtémata se ukazovala jako syrové slugy ✅

**Co žák viděl:** nad příkladem `odcitani`, `scitani a odcitani`, `kombinovane` — bez diakritiky a velkých písmen. Vypadá to jako interní databázový údaj, co se omylem dostal ven.

**Řešení — dvoustupňové**, protože pojmenovat všech ~110 slugů nedává smysl (velká část je jednorázový nepořádek, viz #12):
1. Popisky doplněny pro podtémata, která se **opravdu opakují** → **85 % příkladů** ukáže čitelný text.
2. `podtemaLabel()` vrací `null` místo slugu, když popisek nezná — PracticeCard, ConstructionCard i filtr v tréninku pak nezobrazí nic. Zbylých 137 příkladů tak nemá podtéma raději vůbec.

**Pokrytí popisky:** zlomky 96 % · výrazy 94 % · rovnice 96 % · geometrie 100 % · slovní úlohy 100 % · grafy 75 % · úhly 37 % · konstrukce 29 % · souhrnné 5 %

**Vedlejší přínos:** duplicitní slugy sdílí popisek, takže se sjednotí i vizuálně bez zásahu do dat — `linearni` / `linearni_rovnice` / `linearni_jednoduche` → všechny „Lineární rovnice".

**Ověřeno:** zlomky „Sčítání a odčítání", rovnice 5× „Lineární rovnice", nikde žádné podtržítko.

**Commit:** `71c0dc7`

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

## 16. Geometrie je zdarma i premium zároveň ⏸️

*(Nalezeno 2026-07-17 při ověřování nálezu #6.)*

**Co žák zažije:** na mapě témat vidí u Geometrie zelený štítek **„ZDARMA"**, klikne na „Procvičovat" — a dostane **„Toto téma je v Premium"**. Slib porušený o jedno kliknutí později.

**Příčina:** v `src/lib/subscription.ts` jsou **tři seznamy, které si odporují**:

| Seznam | Obsahuje | Používá |
|---|---|---|
| `GUEST_FREE_TOPICS` | zlomky, rovnice, **geometrie** | mapa témat, `isTopicLockedForGuest()` |
| `FREE_TOPICS` | zlomky, rovnice, **slovní úlohy** | (nikde? ověřit) |
| `PREMIUM_TOPICS` | vyrazy, **geometrie**, grafy, konstrukce, uhly, souhrnne | `isTopicLocked()` |

Geometrie je tedy současně „zdarma pro hosty" i „premium". Navíc `FREE_TOPICS` uvádí jako třetí téma zdarma slovní úlohy, zatímco `GUEST_FREE_TOPICS` geometrii — dvě různé odpovědi na tutéž otázku.

**Proč je to kritické:** není to kosmetika, ale rozbitý slib směrem k zákazníkovi. Zároveň to znamená, že *nevíme jistě, co je vlastně zdarma* — a to je základ monetizace.

⏸️ **Vyžaduje tvoje rozhodnutí:** která tři témata mají být zdarma? (A má se to lišit pro nepřihlášeného hosta a přihlášeného uživatele bez Premium?) Pak sjednotím na jeden zdroj pravdy.

---

## 17. Odhlášení smaže postup, který se už nevrátí 🔴

*(Nahlásil Karel 2026-07-17: „po opětovném přihlášení se ke mně appka chová jak k novému uživateli". Potvrzeno.)*

**Co žák zažije:** odhlásí se, znovu přihlásí — a je skoro na nule. Připravenost 0 %, žádná slabá místa, žádné odznaky, opakování začíná od začátku. Přestože má za sebou diagnostiku i tréninky.

**Mechanismus — dvě věci dohromady:**

1. `handleLogout()` v `profil/page.tsx` smaže 12 lokálních klíčů včetně `matemax-gamification`, `matemax-cards`, `matemax-progress`. Samo o sobě správně — na sdíleném zařízení nemá další uživatel vidět cizí data.
2. Jenže většina dat se **nikdy nenačte zpět ze Supabase**. `storage.ts` obsahuje jen zápisové funkce (`remoteSync*`, `remoteSave*`) a čtení pouze z localStorage. Žádná `hydrateFromRemote()` neexistuje.

**Co přežije přihlášení a co ne:**

| Data | Zapisuje se na server? | Načítá se zpět? | Výsledek |
|---|---|---|---|
| XP, streak, level | ✅ `user_xp` | ✅ `page.tsx` | zachováno |
| Výsledky diagnostiky | ✅ `diagnostic_results` | ✅ `LoggedInDashboard` | zachováno |
| SM-2 karty (opakování) | ✅ `sm2_cards` | ❌ | **opakování od nuly** |
| Odznaky | ✅ `user_badges` | ❌ | **zmizí** |
| Historie tréninků | ✅ `sessions` | ❌ | **prázdná heatmapa** |
| **`topicStats`** — úspěšnost po tématech | ❌ **nikam** | ❌ | **navždy pryč** |

**Nejhorší je `topicStats`.** Žije jen v localStorage a na server se neposílá vůbec. Přitom pohání připravenost (`getReadiness`), skóre v mapě učení, slabá místa i statistiky v profilu. Po odhlášení je nenávratně pryč — ani teoreticky ji nejde obnovit.

**Proč je to kritické:** tiše ničí to jediné, co žáka drží — vidět, že se lepší. A rozbíjí i adaptivitu: session builder bez `topicStats` a SM-2 karet neví, co žák umí, takže ho vrátí na začátek.

**Řešení (commit `0c251a8`) — 🟡 kód hotový, čeká na spuštění migrace:**
1. Nová tabulka `user_gamification` (JSONB + RLS) pro zálohu gamifikace včetně `topicStats`.
2. `sm2_cards` doplněny o `repetitions` a `last_quality`. Chyběly, přitom `last_quality` pohání odemykání obtížností — bez nich by se progrese L1→L2→L3 resetovala i po obnově.
3. `hydrateFromRemote()` natáhne karty, gamifikaci, odznaky a diagnostiku. **Slučuje po polích** (max / sjednocení / novější datum), ne „server přepíše lokál" — jinak by přihlášení na starším zařízení zahodilo novější postup.
4. `ProgressSync` v kořenovém layoutu volá obnovu z jednoho místa.

**Vedlejší oprava — tichý únik dat:** odhlášení maže klíč `matemax-sessions`, jenže historie se ukládá pod `matemax-session-history`. Na sdíleném zařízení ji tak viděl další uživatel.

**Ověřeno:** 14 testů slučování nad skutečnými funkcemi (obnova z prázdna · nezahození novějšího postupu · sjednocení z obou stran · zachování `last_quality`). Bez spuštěné migrace appka nespadne — dotazy degradují a obnoví se jen odznaky a diagnostika.

⏸️ **Zbývá:** spustit `supabase/migrations/20260717_user_gamification.sql` a ověřit naživo (odhlásit → přihlásit). Přihlášený průchod nemůžu otestovat sám.

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
