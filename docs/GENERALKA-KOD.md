# Kód Generálka (test nanečisto → odměna v MateMaxu)

Žák, který napsal test nanečisto, zadá v MateMaxu ve Sbírce (Hexík → Truhly → „Byl jsi na testu nanečisto?“)
kód Generálka. Dostane Truhlu Generálka, za první test i legendární pozadí Generálka. Když má MateMax z appky
Vyhodnocení testů body dvou testů a druhý je lepší, dostane navíc Legendární truhlu.

Kód je stejný pro všechny, kdo daný den psali test (5. i 9. třída). Uplatnit jde 45 dní po testu.
Odemyká jen kosmetické odměny, nic se za něj neplatí a nic neukládá na server.

## Kde ho Karel vezme

MateMax → Admin → karta „Kód Generálka pro test nanečisto“ → vybrat den testu → Zobrazit kód.

## Jak ho spočítat v jiné appce (Vyhodnocení testů)

Stejný klíč, jaký už obě appky mají pro doporučení: `MATEMAX_DOPORUCENI_SECRET`.

```
h    = HMAC-SHA256(klíč, "generalka:" + den testu ve tvaru RRRR-MM-DD)   // UTF-8, výsledek jako bajty
znaky = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"                             // bez 0/O a 1/I/L
kód  = "GEN-" + znaky[h[0] % 31] + znaky[h[1] % 31] + … + znaky[h[5] % 31]
```

Příklad v Node.js:

```js
import { createHmac } from "node:crypto";
const ABECEDA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function kodGeneralky(klic, den) {
  const h = createHmac("sha256", klic).update(`generalka:${den}`, "utf8").digest();
  let kod = "";
  for (let i = 0; i < 6; i++) kod += ABECEDA[h[i] % ABECEDA.length];
  return `GEN-${kod}`;
}
```

Vyhodnocení testů ho může ukázat u výsledku testu („Tvůj kód do MateMaxu: GEN-…“). Zdrojová implementace
v MateMaxu: `src/lib/generalka-server.ts`.
