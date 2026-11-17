# MateMax → Vyhodnocení testů · krok 2 (propojení účtů) je hotový

> Karle: celý text pod čarou zkopíruj do Claude Code u appky Vyhodnocení testů.

---

Ahoj, tady MateMax. Krok 2 je postavený přesně podle dohodnutých formátů: nic jsem neměnil, jen pár věcí upřesňuju níž.
Krok 1 (odkaz `/trenink?doporuceni=…`) běží beze změny.

## Adresy

Základ: `https://matemax.matematika-snadno.cz`

### a) Obrazovka propojení
`GET /propojit?klient=vysledky&state=<state>&navrat=<navrat>`

- **`navrat`** musí být přesně jedna z těchto adres:
  - `https://vysledky.matematika-snadno.cz/api/matemax/navrat`;
  - `http://localhost:3001/api/matemax/navrat`, jen mimo produkci MateMaxu. Server MateMaxu ji v produkci odmítne.
- **`state`** se nemění, jen se vrátí. Povolené znaky jsou `A–Z a–z 0–9 . _ ~ -`, délka 1–512. Jiný `state` dá obrazovku „Odkaz na propojení není platný“.
- **Nepřihlášený:** vidí „Zaregistrovat se“ a „Už mám účet“. Po registraci i přihlášení (e-mail i Google) se vrátí zpátky na `/propojit` se stejnými parametry.
- **Souhlas:** obrazovka ukáže dohodnutý text a povinné zaškrtávátko „Jsem rodič a souhlasím“. Pod textem je i účet, který se propojí: oslovení, nebo e-mail přihlášeného žáka. Ten vidí jen on sám, nikam se nepředává.
- **Propojit:** přesměruje na `navrat?state=<state>&code=<code>`.
  - `code` je 32 náhodných bajtů v base64url, 43 znaků.
  - Platí 5 minut a použít jde jednou. V DB je jen jeho SHA-256.
- **Zrušit:** přesměruje na `navrat?state=<state>&chyba=odmitnuto`.
- **Jeden účet MateMaxu má jedno platné propojení.** Nové propojení stejného účtu zruší předchozí, staré `link_id` pak dostává `410`.

### b) Serverové rozhraní

Každé volání posílá hlavičku `Authorization: Bearer <MATEMAX_API_KEY>`. Bez ní nebo se špatným klíčem dostaneš `401`. Odpovědi jsou JSON s `Cache-Control: no-store`.

| Volání | Odpověď |
|---|---|
| `POST /api/vysledky/propojeni/vymena` `{"code":"…"}` | `200 {"link_id":"<UUID v4>","g":"m9"}`. Neplatný, prošlý nebo už použitý kód dá `400 {"error":"neplatny_kod"}`. |
| `POST /api/vysledky/vysledky` (tělo přesně podle dohody) | `200 {"ok":true}`. Zrušené propojení dá `410`, neznámé `link_id` `404`, špatná data `400 {"error":"neplatna_data"}`. Jiná třída než při propojení dá `400 {"error":"jina_trida"}`. |
| `GET /api/vysledky/procvicovani?link_id=…&od=YYYY-MM-DD` | `200` se souhrnem (viz níž). Zrušené propojení dá `410`, neznámé `404`. |
| `DELETE /api/vysledky/propojeni` `{"link_id":"…"}` | `200 {"ok":true}`, potom už jen `410`. |

**Upřesnění k výsledkům:**
- **Přepis:** `link_id` + `test.d` jsou klíč, opakované poslání přepíše předchozí.
- **Neznámá témata:** neznámé `k` / `s` a témata druhé třídy se tiše vynechají.
- **`g`:** třída žáka v MateMaxu ve chvíli propojení. Vrací se z výměny kódu.
- **Plán do příštího testu:** z výsledku se sestaví sám a ukáže se na domovské obrazovce MateMaxu jako „Plán po 1. testu nanečisto (14. 11.)“.
  - Témata jsou seřazená podle ztracených bodů, vážených jistotou. Pořadí vah od nejsilnější: `klopyta`, `zhorsilo`, `zatim1`, `doladit`, `nebylo`, `zlepsuje`, `jiste`.
  - Bere se nejvýš 3 témata. Téma s plným počtem bodů se nedoporučuje.
  - Novější test přepíše starší plán. Opakované poslání téhož testu postup v plánu nevynuluje.
  - Téma je splněné po 10 správných odpovědích od chvíle, kdy žák plán uvidí. Pravidlo 80 % z posledních 20 příkladů jsem zatím neudělal, protože MateMax si jednotlivé odpovědi na serveru nedrží.
- **Připomínka:** 0–3 dny před `dalsi` ukáže domovská obrazovka „Za 2 dny je další test nanečisto. Zopakuj si hlavně …“ s nejslabším tématem. Je jen v appce, ne e-mailem.

**Souhrn procvičování:**
```json
{"temata":[{"k":"zlomky","prikladu":16,"spravne":13,"minut":26},
           {"k":"zlomky","s":"upravy","prikladu":6,"spravne":5,"minut":6},
           {"k":"slovni_ulohy","prikladu":4,"spravne":2,"minut":4},
           {"k":"slovni_ulohy","s":"pohyb","prikladu":4,"spravne":2,"minut":4}],
 "posledni_aktivita":"2026-11-20T18:04:00Z","plan":[{"k":"geometrie"},{"k":"zlomky"},{"k":"slovni_ulohy","s":"pohyb"}]}
```
- **Okruhy:** za každý okruh je jedna položka bez `s`, to je celkový součet za okruh.
- **Dovednosti:** hned za okruhem je rozpad podle dovedností (`k` + `s`). Je to část okruhu, **nesčítej ho s ním.**
- **Pořadí:** okruhy jdou podle počtu příkladů.
- **`minut`:** čas tréninku rozdělený podle počtu příkladů, zaokrouhlený.
- **Od kdy:** započítá se procvičování od data `od` včetně, podle kalendářního dne žáka. `posledni_aktivita` je poslední trénink v tom období, jinak `null`.
- **`plan`:** témata aktuálního nesplněného plánu, `s` jen když ho má. Splněný plán nebo žádný plán dá `[]`.
- **Od kdy se sbírá:** souhrn se ukládá od nasazení kroku 2. Starší trénink v něm není.

**Zrušení:**
- **Z MateMaxu:** žák může propojení zrušit v Profilu („Propojeno s Testy nanečisto“, pak „Zrušit propojení“). Ty se to dozvíš tak, že dostaneš `410`.
- **Výsledky testů:** při zrušení z kterékoli strany MateMax smaže výsledky testů, které od tebe dostal. Plán a vlastní trénink zůstávají žákovi.

## Admin
Karel v admin přehledu MateMaxu u účtu uvidí:
- jestli je účet propojený a od kdy,
- výsledky testů nanečisto po tématech,
- aktuální plán.

## Co nastavit (Karel)
1. **Klíč:** vygeneruj klíč `MATEMAX_API_KEY`, aspoň 32 náhodných znaků. Dej ho do Vercelu MateMaxu (Production) a stejný do Vyhodnocení testů. Nikam ho nepiš.
2. **Migrace:** v Supabase MateMaxu spusť `supabase/migrations/20261117_propojeni_vysledky.sql`. Založí tabulky propojení, výsledků testů a souhrnu tréninků s RLS.
3. **Redeploy:** po přidání klíče ve Vercelu spusť u MateMaxu Redeploy, ať si appka klíč načte.

## Jak to vyzkoušet
1. Ve Vyhodnocení testů klikni na „Propojit s MateMaxem“. Návrat musí být produkční adresa.
2. V MateMaxu se přihlas účtem dítěte, zaškrtni souhlas a klikni na Propojit.
3. Vyhodnocení dostane `code` a vymění ho za `link_id`.
4. Pošli výsledek testu. Na domovské obrazovce MateMaxu se objeví plán.
5. Zavolej `procvicovani`. Po prvním dokončeném tréninku v něm uvidíš čísla.
