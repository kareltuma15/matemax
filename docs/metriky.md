# Slovník metrik MateMaxu

Admin 2.1, DA-01. Každá metrika má jednu definici a od fáze A2 jednu SQL funkci, kterou používají všechny stránky adminu, pondělní report i export. Čas je všude Europe/Prague. V adminu ji ukazuje ikonka „i“ u čísla.

**Kdo se nepočítá nikde:**
- testovací účty (`app_metadata.testovaci`),
- admin,
- zařízení „Nepočítat“,
- roboti.

Pravidlo je v kódu na jednom místě: `src/lib/admin-data.ts`.

| Metrika | Co počítá | Zdroj | Vylučuje | Měří se od |
|---|---|---|---|---|
| Žák | účet s třídou, který není rodič | `auth.users` | testovací, admin | vždy |
| Nový žák | žák s registrací v období (pražský den) | `auth.users.created_at` | dtto | vždy |
| Trénoval | dokončil aspoň 1 trénink, test nebo diagnostiku. Otevřená stránka nestačí. | `procvicovani`, `odpovedi` | dtto | 26. 5. 2026 (`odpovedi` od nasazení A1) |
| Pravidelní (severka) | 3+ různé dny s tréninkem za posledních 7 dní | dtto | dtto | 26. 5. 2026 |
| Aktivovaný | diagnostika i 1. trénink do 24 h od registrace | `diagnostic_completed`, tréninky | dtto | 25. 5. 2026 |
| Vrátil se | trénink druhý den po registraci | tréninky | dtto | 26. 5. 2026 |
| Návštěvy webu za den | anonymní denní otisky na veřejných stránkách. Součet za víc dní nejsou lidé. | `page_viewed` (`prihlasen` = false) | roboti, „Nepočítat“, admin | 15. 11. 2026 |
| Vstup ze zdroje | první stránka v záložce se zdrojem (utm, sloučená doména) | `page_viewed.vstup` | návrat z platby, vlastní web | 26. 11. 2026 |
| Úspěšnost na 1. pokus | správně napoprvé / všichni, kdo úlohu začali (i přeskočení) | `odpovedi.spravne_napoprve` | opakování SM-2 se počítá zvlášť | nasazení A1 |
| Čas na úlohu | medián `cas_ms` | `odpovedi` | přeskočené | nasazení A1 |
| Platící | aktivní předplatné ve Stripe | Stripe, `user_premium` | testovací klíč; ruční Premium zvlášť | vždy |
| Ruční Premium | Premium udělené v adminu s datem konce | `user_premium.trial_granted_by` = `admin:…` | | vždy |
| Z testů s účtem | žák s výsledky z testu nanečisto, který má do 7 dní účet | `vysledky_propojeni`, `vysledky_testy` | | 17. 11. 2026 |

## Malá čísla (DA-06)

- Vždy počet. Procento jen s počtem („2 ze 4“).
- Procentní změnu ukazovat až od základu 20, jinak „141 proti 23“.
- Pod 30 pozorování přidat štítek „malý vzorek“. U podílů dát do „i“ Wilsonův interval.
- Výkyvy hlídat Poissonovým testem, ne procenty.

## Proč se čísla do 26. 11. 2026 neshodovala

1. Supabase vrátí nejvýš 1 000 řádků na dotaz. Statistiky, Řídicí panel a seznam účtů četly jen část dat. Od A1 se čte po stránkách (`nactiVse`).
2. Anonymní návštěvník má otisk platný 1 den, takže součet za 7 dní počítal stejné lidi víckrát. Metrika se proto jmenuje „Návštěvy webu za den“.
3. „Trénovalo dnes“ měl Řídicí panel podle dokončených tréninků a Statistiky podle otevřené stránky Trénink, včetně admina. Od A1 se počítá podle dokončených tréninků všude.
4. Trychtýř počítal každý krok zvlášť. 96 ze 108 lidí, kteří otevřeli registraci, přišlo rovnou z reklamy. Trychtýř po lidech přijde ve fázi B.
5. Admin účet nebyl vyloučený. Od A1 se vylučuje automaticky.
