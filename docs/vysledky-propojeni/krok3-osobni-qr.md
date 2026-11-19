# MateMax → Vyhodnocení testů · krok 3: osobní QR kód žáka

> Karle: tohle celé zkopíruj do Claude Code u appky Vyhodnocení testů.

---

Ahoj, tady MateMax. Karel schválil (19. 11.) osobní QR kód pro každého žáka. Staví na kroku 2 (propojení účtů), formáty kroku 2 se nemění.
Mockup celého toku: https://claude.ai/artifact/AXPPxEfRa398WWBjrHZa4p

## Proč
Dnes musí rodič ve Vyhodnocení najít tlačítko „Propojit s MateMaxem“. Osobní QR to zkrátí na jedno naskenování. Žák se v MateMaxu přihlásí nebo zaregistruje a účty se propojí samy. Výsledky každého dalšího testu pak chodí do MateMaxu bez kódu a bez klikání.

## Rozhodnutí Karla
- **Souhlas se nezaškrtává.** Obě appky má stejný provozovatel a výsledky s doporučením jsou součást zaplacené služby. Propojit si účty může žák sám. Rodič je o tom **informován**: větou v připomínce a e-mailem po propojení s odkazem na zrušení. MateMax z obrazovky propojení zaškrtávátko „Jsem rodič a souhlasím“ odstraní. Do zásad ochrany osobních údajů přibude věta o propojení (Karel ji schválí v MS Dashboardu).
- **Zadání testu tiskne Vyhodnocení pro každého žáka zvlášť.** Osobní QR patří na titulní stranu zadání, které si žák po testu nechává.
- Druhý kanál je **připomínka rodičům týden před testem**, kterou Vyhodnocení už posílá.

## Co postavit ve Vyhodnocení

### 1. Osobní kód žáka
- Ke každému žákovi přihlášenému na test vytvoř kód: 16 náhodných bajtů v base64url (22 znaků). Ulož jen jeho SHA-256.
- Platnost: do 45 dní po posledním testu, na který je žák přihlášený. Nový test platnost prodlouží, kód zůstává stejný.
- Kód nenese jméno, třídu ani body. Je to jen klíč k záznamu žáka ve Vyhodnocení.

### 2. Adresa z QR: `GET https://vysledky.matematika-snadno.cz/q/<kod>`
- **Neplatný nebo prošlý kód:** přesměruj na `https://matemax.matematika-snadno.cz/` (běžná úvodní stránka MateMaxu).
- **Žák už je propojený:** přesměruj na `https://matemax.matematika-snadno.cz/?z=qr` (MateMax otevře Domov s plánem).
- **Žák ještě propojený není:** založ `state` svázaný s tímto žákem (stejně jako dnes u tlačítka „Propojit s MateMaxem“) a přesměruj na:
  ```
  https://matemax.matematika-snadno.cz/propojit?klient=vysledky&state=<state>&navrat=<navrat>&uvod=qr&g=<m5|m9>&test=<RRRR-MM-DD>
  ```
  - `uvod=qr`: MateMax ukáže úvod pro žáka (Hexík, „Tady budou tvoje výsledky z testu“) místo textu pro rodiče.
  - `g`: třída žáka z přihlášky (`m5` nebo `m9`). MateMax ji předvyplní při registraci.
  - `test`: den nejbližšího testu, nebo posledního, pokud další není. MateMax ho ukáže v úvodu („Test nanečisto 12. 12.“).
  - `navrat` a `state` platí přesně jako v kroku 2.
- Jeden kód smí propojit jen jeden účet MateMaxu. Když už propojený je, další naskenování jen otevře MateMax (viz výš). Nikdy nepřepojí jiný účet.

### 3. Po návratu (`navrat?state=…&code=…`)
Výměna kódu za `link_id` probíhá jako v kroku 2. Navíc:
1. Pokud už máš výsledky testu, pošli je hned (`POST /api/vysledky/vysledky`).
2. Pošli rodiči krátký e-mail „Propojeno s MateMaxem“: kdy se propojilo, že se do MateMaxu posílají jen body po tématech a že propojení jde jedním kliknutím zrušit. Zrušení zavolá dnešní `DELETE /api/vysledky/propojeni`. Text e-mailu schválí Karel v MS Dashboardu.
3. Přesměruj žáka zpět do MateMaxu na `https://matemax.matematika-snadno.cz/?z=qr&propojeno=1`. MateMax ukáže „Propojeno s Testy nanečisto“ a případně Truhlu Generálka.
- Při `chyba=odmitnuto` přesměruj na `https://matemax.matematika-snadno.cz/`.

### 4. QR na zadání testu (titulní strana, každý žák zvlášť)
- QR s adresou z bodu 2, s logem M² uprostřed (korekce chyb úrovně H). Tiskový rozměr aspoň 25 × 25 mm.
- Vedle QR jméno žáka a text: **„Doma naskenuj: výsledky z testu, plán do dalšího testu a Truhla Generálka v MateMaxu.“**
- Pod tím malým písmem: „Kód je jen tvůj.“

### 5. QR v připomínce týden před testem
Nový blok pod stávající připomínkou (texty schválí Karel v MS Dashboardu):
- nadpis **„Výsledky rovnou do MateMaxu“**,
- tři body: po testu dítě uvidí body po tématech a plán, co trénovat do dalšího testu; za test dostane v MateMaxu Truhlu Generálka; vy ve Vyhodnocení uvidíte, kolik a co trénovalo, jméno ani e-mail se nepředávají,
- tlačítko **„Otevřít MateMax“** (adresa z bodu 2) a vedle QR se stejnou adresou s popiskem „Dítě si kód může načíst svým telefonem nebo tabletem“,
- pod tím věta: „Kód je jen pro vaše dítě. Pokud už propojené je, otevře se rovnou MateMax.“

## Co udělá MateMax (já)
- `/propojit`: zaškrtávátko odstraním (platí i pro dnešní tlačítko z Vyhodnocení). Místo něj bude informační text a tlačítko „Propojit“.
- `uvod=qr`: úvod pro žáka, registrace s předvyplněnou třídou z `g`, po registraci i přihlášení přes Google návrat zpět na `/propojit` (jako dnes).
- `?z=qr&propojeno=1`: potvrzení na Domově.
- **Truhla Generálka bez kódu:** po propojení ji MateMax připíše sám podle dne testu ve výsledcích. Pravidla jsou stejná jako u kódu: za první test i legendární pozadí, za zlepšení Legendární truhla. Společný kód Generálka dál funguje pro děti bez propojení.
- Termín: do 28. 11. Dám vědět, až to bude na produkci.

## Termíny
| Kdo | Co | Do |
|---|---|---|
| MateMax | změny výš | 28. 11. |
| Vyhodnocení | body 1–5 | 3. 12. |
| Karel | schválit texty (připomínka, e-mail po propojení, věta do zásad), vyzkoušet s jedním testovacím žákem | 4. 12. |
| Vyhodnocení | připomínka k testu 12. 12. s QR | 5. 12. |
| Vyhodnocení | zadání testu 12. 12. s osobním QR | 11. 12. |

Až budeš mít body 1–3, napiš Karlovi adresu testovacího QR. Vyzkouším celý tok proti produkci MateMaxu.
