# Revize nákupu Premium (stav k 9. 10. 2026)

**Závěr:** v kódu je nákup Premium kompletní a rozumně napsaný, ale **nikdy nebyl ověřen end-to-end a pravděpodobně nefunguje naostro**: Stripe testovací cena stojí 0 Kč, zákaznický portál není nastavený a o živém (produkčním) nastavení Stripe nevím nic — nemám k němu přístup. Navíc se cena v appce (99 Kč/měsíc) rozchází s plány na webu (Měsíční 400 Kč, Kompletní 2 490 Kč).

## Jak nákup teče

1. `/cenik` → tlačítko „Koupit Premium“ → `POST /api/stripe/create-checkout` (přihlášený uživatel, token ověřen).
2. Server najde/založí Stripe zákazníka, uloží `stripe_customer_id` do `user_premium` a vytvoří Checkout Session (`mode: subscription`, cena `STRIPE_PRICE_ID`, čeština, slevové kódy povoleny).
3. Po zaplacení Stripe zavolá `POST /api/stripe/webhook` (podpis ověřen) s událostmi `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`.
4. Webhook nastaví `user_premium.is_premium` (a `stripe_subscription_id`). Aplikace čte `usePremium()`; zámky témat jsou v `src/lib/subscription.ts`.
5. Správa předplatného: `POST /api/stripe/portal` (Stripe Customer Portal).

## Co jsem zkontroloval (jen čtení)

Testovací klíč z `.env.local` (`sk_test_…`):

| Kontrola | Výsledek |
|---|---|
| `STRIPE_PRICE_ID` | existuje, aktivní, CZK, měsíčně, **částka 0 Kč**, produkt se jmenuje „test“ |
| Webhook endpoint (testovací režim) | `https://matemax.matematika-snadno.cz/api/stripe/webhook`, aktivní, 4 správné události |
| Customer Portal | **nenastaven** (0 konfigurací) → tlačítko „Spravovat předplatné“ by skončilo chybou |
| Předplatná/zákazníci v testu | 0 předplatných, 1 zákazník (váš z 25. 5.) |
| `user_premium` v DB | 3 řádky: váš (admin) Premium zdarma, jeden uživatel s ukončeným týdenním trialem, váš řádek se Stripe zákazníkem z 25. 5., dnes `is_premium=false` |

Jediný pokus o nákup byl 25. 5. a skončil bez trvalého Premium. **Žádný cizí uživatel nikdy nezaplatil.**

## Co jsem opravil v kódu (commit v tomto balíku)

- Webhook dřív párovat zaplaceného zákazníka umožnil jen přes uložené `stripe_customer_id`. Když se uložení při zakládání checkoutu nepovedlo (kód to jen zalogoval a platbu nerušil), zákazník zaplatil a **Premium nedostal** — jen řádek v logu. Teď se použije záloha: `supabase_user_id` z metadat předplatného, nebo ze zákazníka ve Stripe.
- Selhání zápisu do `user_premium` teď shodí webhook (HTTP 500), takže Stripe událost zopakuje; dřív se chyba zahodila.
- Admin přehled (`/admin`) ukazuje plán uživatele (Premium / Trial / Zdarma), takže vidíte, kdo opravdu platí.

Nasazené to ještě není otestované proti reálnému Stripe — viz test níže.

## Co musíte udělat vy (nemám přístup do Stripe ani Vercelu)

1. **Stripe → režim Test:** vytvořit produkt „MateMax Premium“ s cenou **99 Kč / měsíc** (nebo cenou, kterou rozhodnete), zkopírovat `price_…`.
2. **Stripe → Nastavení → Billing → Customer portal:** uložit výchozí nastavení (zrušení předplatného, změna platební karty) — v testovacím i živém režimu.
3. **Test na Preview nasazení:** do Vercelu (Preview) dát testovací klíč, nové `STRIPE_PRICE_ID`, testovací `STRIPE_WEBHOOK_SECRET` (ze stránky webhooku); koupit kartou `4242 4242 4242 4242`; ověřit, že `/admin` ukáže uživatele jako Premium; v portálu zrušit a ověřit návrat na Zdarma.
4. **Živý režim:** Stripe (Live) → stejný produkt/cena; **vlastní Live webhook endpoint** na stejné URL se 4 událostmi a jeho `whsec_…`; do Vercelu **Production** vložit `sk_live_…`, live `price_…` a live `whsec_…`. Ověřit jedním reálným nákupem vlastní kartou (a refundem).
5. **Rozhodnutí o ceně:** Má být MateMax Premium 99 Kč/měsíc, nebo se napojí na plány z webu (Měsíční 400 Kč / Kompletní 2 490 Kč)? Do rozhodnutí neměním ceny v kódu (návrh čeká ve Schvalování).

## Další rizika (nízká/střední)

- `invoice.payment_failed` hned vypíná Premium; Stripe ale platbu zkouší znovu několik dní. Doporučuji ponechat až `customer.subscription.updated` se stavem `past_due`/`unpaid` (v kódu už je) a vypnout reakci na `payment_failed` — jinak zákazník přijde o Premium po první neprošlé platbě.
- Zámky témat jsou jen v prohlížeči (obsah je v JS balíku), takže technicky zdatný uživatel je obejde. Pro 99 Kč to je přijatelné, ale nemělo by se na to spoléhat u dražších plánů.
- Online testy nanečisto přes Stripe (`/api/stripe/test-checkout`) jsou paralelní s rezervacemi ve Wix Bookings; oba řádky v `online_test_enrollments` jsou vaše testovací. Rozhodněte, jestli se funkce používá, jinak ji vypnout, ať nezmate zákazníky.
- Žádná fakturace/DPH logika (jste neplátce) — Stripe pošle potvrzení; faktury případně řešit zvlášť.
