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

## B) 🔴 MUSÍŠ opravit PŘED sobotou — jinak ti tiše nepůjdou e-maily

**Doména `matematika-snadno.cz` v Resendu nemá ani nastartovanou verifikaci.**
Všechny 4 e-maily (potvrzení přihlášky, připomínka 24h/1h, „arch přijat", výsledky)
se posílají z `noreply@matematika-snadno.cz` — bez ověřené domény Resend odesílání
odmítne a appka to **potichu spolkne** (jen log na serveru, nikde se to neukáže).

**Oprava (do DNS správy domény matematika-snadno.cz, kde ji spravuješ — Wedos/
Forpsi/Cloudflare/…), přidej tyto 3 záznamy:**

| Typ | Název (host) | Hodnota |
|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDTlBo0hiom+SMUt+M6lthQVDOWwr6ja+Q67y/tC+5VX4Dbme6QG4gMlen6euT2DBjch8wRgJwx3eJu7yWehnczFJa1oBwwhVecWl7FEI+VKyMmDGA1mDlYSmDOvV+99JRs3ZZFL+w/+ALL5452nlIMFLB1L1Y+NZGFRBhVng+ThwIDAQAB` |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (priorita 10) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |

Po přidání jdi do Resend dashboardu (Domains → matematika-snadno.cz) → **Verify**.
DNS propagace může trvat od pár minut po několik hodin — **udělej to dnes večer**,
ať má čas se to projevit do soboty.

**Pokud v pátek večer verifikace ještě neproběhne**, mám nachystanou 2minutovou
záchrannou variantu: dočasně přepnu odesílací adresu na Resend's `onboarding@
resend.dev` (funguje bez verifikace domény, doručí se kamkoliv), jen pro sobotní
test, a po doverifikování domény vrátím zpět. Napiš mi ve čtvrtek/pátek, jestli
DNS proběhla, ať vím, jestli mám tenhle fallback nasadit.

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
