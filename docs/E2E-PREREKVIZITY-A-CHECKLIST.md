# E2E online testy — prerekvizity (ověřeno) + checklist na sobotu 12.9.

> Ověřeno přímo (read-only dotazy do Supabase/Stripe/Resend, žádné platby, nic
> neposláno) 2026-09-10 večer. Testovací termín i PDF jsou už připravené —
> sobotní blok jde čistě na live test.

## A) Co jsem ověřil TEĎ a je to ✅ v pořádku

| Položka | Výsledek |
|---|---|
| Tabulka `online_test_sessions` | ✅ existuje |
| Tabulka `online_test_enrollments` | ✅ existuje |
| Tabulka `online_test_submissions` | ✅ existuje |
| Bucket `test-sessions` | ✅ existuje (neveřejný — appka ale používá **signed URL**, takže to je správně, ne bug) |
| Bucket `submissions` | ✅ existuje (stejně, přes signed URL / server-side upload) |
| Stripe režim | ✅ **test mode** (`sk_test...`) — žádné riziko ostrého stržení peněz |
| Stripe webhook | ✅ zaregistrovaný na `https://matemax.matematika-snadno.cz/api/stripe/webhook`, stav `enabled`, poslouchá `checkout.session.completed` |
| `RESEND_API_KEY` | ✅ platný klíč (ověřeno voláním Resend API) |

## B) Stav k 12.9. dopoledne — fallback nasazen, DNS pořád čeká na tebe

**Update:** ověřil jsem přes veřejné DNS, že záznamy ještě nikdo nepřidal (doména
běží na **Wix DNS** — `ns4/ns5.wixdns.net`). Aby tě to neblokovalo právě dnes,
nasadil jsem **dočasný fallback**: e-maily teď jdou z `onboarding@resend.dev`
místo `noreply@matematika-snadno.cz` (commit `cf65896`, live na produkci).

⚠️ **Omezení fallbacku:** `onboarding@resend.dev` doručí **jen na e-mail, kterým
je založený Resend účet** — tj. `karel.tuma15@gmail.com`. **Dnešní test proto
dělej pod účtem s tímhle e-mailem** (přihlas se do appky tímto e-mailem, ne jiným
testovacím). Na jiný e-mail by dnes zpráva nedošla.

### Trvalá oprava (Wix DNS) — udělej, až budeš mít chvíli, není to dnes blokující
Doména `matematika-snadno.cz` je na **Wix**. Postup:
1. Přihlas se na `wix.com` → **Domains** (buď v Wix účtu nahoře, nebo v nastavení webu).
2. Klikni na `matematika-snadno.cz` → **DNS Records** (může být i pod „Advanced" nebo „Manage DNS").
3. Přidej 3 nové záznamy:

| Typ | Název (host) | Hodnota |
|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDTlBo0hiom+SMUt+M6lthQVDOWwr6ja+Q67y/tC+5VX4Dbme6QG4gMlen6euT2DBjch8wRgJwx3eJu7yWehnczFJa1oBwwhVecWl7FEI+VKyMmDGA1mDlYSmDOvV+99JRs3ZZFL+w/+ALL5452nlIMFLB1L1Y+NZGFRBhVng+ThwIDAQAB` |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (priorita 10) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |

4. Ulož. Jdi do Resend dashboardu (Domains → matematika-snadno.cz) → **Verify**.
5. Až tam uvidíš stav **„Verified"**, napiš mi — vrátím `FROM` zpět na
   `noreply@matematika-snadno.cz` a smažu dočasný fallback (jedna řádka, 2 minuty).

### Update 13.9. — kořenová příčina nalezena, čeká se na Resend

Domain byl smazán a znovu přidán (dle rady Resend dashboardu), CNAME (`rsend` →
`send.forge.rmta.net`) přidán do Wixu a **ověřen**. DKIM taky **verified**. Ale
doména se vytvořila jako **`spfType: migrated`** (CNAME navíc k starému MX+TXT),
místo **`spfType: cname`** (čistě CNAME, bez MX — jediná varianta, kterou Wix
zvládne). Proto zůstává trvale na **`partially_verified`** — a to (ověřeno
empiricky přes API) **nestačí k odesílání** ze skutečné domény (403 „domain is
not verified").

**Řešeno přes Resend support** (`docs/RESEND-SUPPORT-ZPRAVA.md`) — jejich tým
potvrdil přesnou diagnózu a **eskaloval interně přepnutí `migrated → cname`**.
Řekli: *„No additional action is needed on your side in the meantime."*

**Až se ozvou, že je to přepnuté:**
1. Zkontrolovat stav domény (má dojít na plné `verified`).
2. Vrátit `FROM` v `src/lib/online-test-emails.ts` zpět na
   `MateMax <noreply@matematika-snadno.cz>` (dnes tam je dočasný fallback
   `onboarding@resend.dev` — ten umí poslat JEN na vlastníka Resend účtu,
   `karel.tuma@matematika-snadno.cz`, ne na běžné studenty).
3. Ověřit reálným odesláním na libovolný e-mail (ne jen účet vlastníka).
4. Commit + deploy.

### ⚠️ Vedlejší nález (netýká se soboty, ale stojí za pozornost)
`STRIPE_PRICE_ID` (používá se pro **předplatné** appky, ne pro online testy) ukazuje
na cenu **0 Kč / měsíc**. Buď je to záměrný testovací produkt, nebo omylem zůstala
nulová cena z vývoje — zkontroluj to, až budeš mít čas, není to blokující pro sobotu.

### Jedna věc, kterou nemůžu ověřit já
**Zda produkční prostředí na Vercelu má stejné env proměnné jako tvůj lokální
`.env.local`.** Nemám přístup k Vercel dashboardu. Nepřímý důkaz, že to sedí:
webhook je zaregistrovaný přímo na produkční URL pod stejným Stripe test-mode
účtem, který čtu lokálně — to by nešlo, kdyby produkce používala jiný Stripe účet.
Přesto: **jen pro jistotu mrkni do Vercel → Project → Settings → Environment
Variables**, že `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` a `RESEND_API_KEY`
tam jsou vyplněné (nemusíš vidět hodnoty, stačí že nejsou prázdné).

---

## C) Testovací termín — už založený, čeká na tebe

Založil jsem ostrý (test-mode) termín přímo v databázi a nahrál 3 zástupné PDF
(jasně označené „TEST", ať nejsou zaměnitelné se skutečným zadáním — skutečný
obsah jsem neměl k dispozici a nechtěl jsem si ho vymýšlet):

- **Název:** „TEST — E2E ověření flow (neplatit skutečnou kartou)"
- **Termín:** nastavený do minulosti (9.9.), takže je **hned teď plně otevřený**
  — nemusíš čekat na žádný konkrétní čas v sobotu, arch i zadání jsou odemčené.
- **Cena:** 10 Kč (test-mode — žádná skutečná platba)
- **Kapacita:** 30
- Je **publikovaný** (uvidíš ho na `/testy-nanecisto` na živém webu) — protože jsi
  chtěl testovat celý flow včetně veřejného seznamu a přihlášky. Vzhledem k
  test-mode Stripe klíči by ho stejně nikdo cizí nemohl reálně zaplatit, ale
  název jasně říká „TEST — neplatit". **Po dokončení testování mi řekni a termín
  smažu / odpublikuju**, ať nezůstává viset na produkci.

---

## D) Checklist pro živý test v sobotu (krok za krokem)

Potřebuješ: reálnou e-mailovou schránku (kam se přihlásíš), Stripe testovací
kartu `4242 4242 4242 4242`, libovolné budoucí datum expirace, libovolné CVC.

1. **Registrace / přihlášení** — pokud ještě nemáš účet, založ si ho na
   `matemax.matematika-snadno.cz` (nebo použij existující).
   - ✅ očekávané: přihlásíš se, appka tě pustí dovnitř.
2. **Najdi test na `/testy-nanecisto`** — měl bys vidět „TEST — E2E ověření flow".
   - ✅ očekávané: termín je vidět, cena 10 Kč.
3. **Klikni přihlásit se a zaplatit** → přesměruje na Stripe Checkout.
   - Zadej kartu `4242 4242 4242 4242`, libovolné datum/CVC.
   - ✅ očekávané: platba projde, appka tě vrátí zpět.
4. **Zkontroluj e-mail** — mělo by dorazit „Přihlášení potvrzeno".
   - ⚠️ Tohle je přesně místo, kde dnes hrozí selhání kvůli bodu B) — pokud nedorazí,
     zkontroluj stav Resend domény a napiš mi.
5. **Jdi do detailu testu** (`/test/[id]`) — měl bys vidět zadání (PDF „TEST -
   ZADANI") a záznamový arch ke stažení.
   - ✅ očekávané: oba PDF se otevřou (obsahují jen text „TEST - ZADANI" / „TEST
     - ZAZNAMOVY ARCH" — je to záměrně jen zástupný obsah).
6. **Nahraj fotky** (klidně vyfoť cokoliv, třeba prázdný papír — testujeme jen
   mechaniku uploadu, ne obsah) přes formulář na odevzdání.
   - ✅ očekávané: appka potvrdí přijetí, dorazí e-mail „Arch přijat".
7. **Přepni se do admina** (`/admin/testy`) svým admin účtem
   (`karel.tuma15@gmail.com`) → najdi termín → **Submissions**.
   - ✅ očekávané: vidíš svoje odevzdání, stav „submitted", fotky se dají otevřít.
8. **Vyplň body** (per téma + celkem) → ulož.
   - ✅ očekávané: stav se změní na „reviewed".
9. **Odešli e-mail s výsledky** (tlačítko u odevzdání).
   - ✅ očekávané: dorazí e-mail s výsledky, stav „sent".
10. **(Volitelně) zkontroluj připomínky** — cron `test-reminders` běží přes
    GitHub Actions hodinově; s termínem nastaveným do minulosti se připomínky
    24h/1h už neodešlou (to je v pořádku, netestuje se tím tento konkrétní běh).

**Po dokončení:** napiš mi výsledek každého kroku (zvlášť bodu 4 a 9 — e-maily).
Podle toho buď potvrdíme „ready na listopad", nebo rovnou opravíme, co nevyšlo.
