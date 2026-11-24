# Loops: opravy automatických e-mailů (24. 11. 2026)

Karel 24. 11.: „musíme všechno ihned opravit“. **NAHRÁNO 24. 11. 17:43** (Karel automatizace pozastavil, Claude nahrál texty + českou patičku přes API, náhled ověřen).
a přes API se automatizace pozastavit nedá. Postup: Karel pozastaví 3 automatizace → Claude nahraje texty níž → Karel je znovu spustí.

Všem třem e-mailům se zároveň nastavila nová česká patička „Česká patička MateMax“. Jazyk „cs“ Loops nepodporuje, zůstává výchozí.

Společné opravy: bez jména v oslovení („Ahoj znovu/zpátky“ při chybějícím jménu), bez mužského rodu, žádná nabídka
placených věcí dítěti (pravidlo reklamy dětem), texty platí pro 5. i 9. třídu, funkční odkazy.

## D+1 diagnostika (posílá se, když diagnostika není hotová)
- Předmět: **Diagnostika na tebe čeká**
- Text:
  > Ahoj!
  > Účet v MateMaxu máš. Teď zbývá jeden krok: diagnostika.
  > Zabere pár minut a ukáže, která témata procvičovat jako první. Pak trénuješ přesně to, co potřebuješ.
  > [Spustit diagnostiku](https://matemax.matematika-snadno.cz/diagnostika)
  > Karel
- BYLO: „{jméno}, diagnostika tě čeká (5 minut)“, „včera ses zaregistroval“, oslovení „Ahoj znovu“ bez jména.

## D+3 první trénink (diagnostika hotová, trénink ještě ne)
- Předmět: **Diagnostiku máš, teď první trénink**
- Text:
  > Ahoj!
  > Diagnostiku máš hotovou, takže víš, kde máš mezery.
  > Dnes je dobrý den na první trénink: pár minut a příklady přesně na tvoje témata.
  > [Spustit první trénink](https://matemax.matematika-snadno.cz/trenink)
  > Karel
- BYLO: oslovení „Ahoj zpátky“ bez jména, „Streak začíná prvním dnem“.

## D+7 „Jak ti to jde?“ (méně než 3 tréninky)
- Předmět: **Jak ti to jde?**
- Text:
  > Ahoj!
  > Jsi v MateMaxu týden. Chci se jen zeptat: jak ti to jde?
  > Začít je nejtěžší. Stačí pár příkladů denně a každý den tréninku se ti v appce zapíše do kalendáře.
  > Když ti něco nejde nebo nevíš, jak začít, odpověz na tenhle e-mail. Přečtu si to.
  > [Pokračovat v tréninku](https://matemax.matematika-snadno.cz)
  > Karel
- BYLO: nabídka pracovního sešitu „64 stran“ (ověřený fakt: 174 stran; sešit není pro 5. třídu a dětem se nic neprodává),
  odkaz na neexistující adresu s „www.“, předmět „… velký rozdíl v lednu“, slib „výsledky přijdou samy“.

## Co musí udělat Karel v Loops
1. Pozastavit 3 automatizace (Workflows → D+1, D+3, D+7 → Pause).
2. Settings → Company: adresa „Bohunice 81, 375 01 Všemyslice“ (teď je tam „37501 Týn nad Vltavou“).
3. Po nahrání textů automatizace znovu spustit.
