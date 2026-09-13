# Status update pro Claude chat — MateMax (2026-09-13 večer)

> Navazuje na `docs/PODKLAD-pro-tydenni-plan.md` (podklad z 8.9.). Tohle je
> **aktuální stav** tří větví z toho plánu + jedna nová věc, co se objevila po
> cestě. Karel pracuje sólo, po večerech/volném čase, vývoj přes Claude Code.
> Potřebuje od tebe **aktualizaci týdenního plánu** — co zbývá, v jakém pořadí,
> rozdělené do večerních bloků, s jasným (K)=Karel / (C)=Claude Code u položek.

## Kontext appky (nezměněno)
**MateMax** — Next.js/React/Supabase/Stripe appka na přípravu na CERMAT
přijímačky z matematiky. **Cíl: plná připravenost do listopadu.**

---

## 1) Obsah — Úhly (ROZDĚLANÉ, čeká na dokončení)
- **L1 (8 úloh):** ✅ hotovo, v produkci.
- **L2 (8 úloh):** ✅ hotovo, v produkci.
- **L3 (8 úloh, CERMAT úroveň — repliky reálných úloh: rovnoběžník s neznámou
  4α, Thaletova věta, soustava rovnoběžky+kolmice):** ⚠️ **postavené, vizuálně
  schválené Karlem, ale STÁLE NEZAPSANÉ do ostré databáze** — zůstalo viset v
  `src/data/nahled-batch.json`, ztratilo se to v přestávce, kdy jsme řešili
  E2E testování. **Akce (C): spustit merge skript, zapsat do produkce.** Pak
  bude téma Úhly hotové ve všech 3 úrovních — první kompletní téma.
- **Další témata ve frontě** (`docs/OBSAH-plan.md`): geometrie, grafy a
  logika, konstrukce, slovní úlohy — stejná smyčka (domluva → `/nahled` →
  schválení → zápis).

## 2) Diagnostika — ✅ HOTOVO (revize dokončena)
Refaktorováno na sdílené karty (`MoznostiCard`, stejné jako trénink) — KaTeX i
obrázky teď fungují automaticky. Opraveno v pořadí, které Karel schválil:
Q15/Q16 (úhly→obrázek), Q1/Q2 (zlomky→KaTeX), Q7/Q8/Q11 (geometrie/koláč→
obrázek), Q12 (číselná řada→sloupcový graf). Ověřeno automatizovaným
průchodem všech 16 otázek. **Zbývá (odloženo, samostatně později):**
obtížnost seedování (bere jen 10 nejlehčích) + zbylých 131/145 geometrie úloh
v celé DB bez obrázku.

## 3) E2E online testy — ŽIVÝ TEST PROBĚHL, jedna položka visí na 3. straně
Tohle byl dnes hlavní blok práce, sáhl hlouběji, než se čekalo. Shrnutí:

**Co je ověřené a funguje (živý test na produkci, ne jen teorie):**
- Registrace → přihláška → **Stripe platba** (test-mode) → **webhook**
  (`checkout.session.completed`) → enrollment `paid` — ✅ funguje
- Upload fotek záznamového archu → submission uložena — ✅ funguje
- Admin rozhraní (`/admin/testy` → Submissions) → vyplnění bodů → `reviewed`
  — ✅ funguje

**Bugy nalezené a opravené při testu:**
- Cena testovacího termínu byla pod Stripe minimem pro CZK (15 Kč) → appka to
  hlásila jako generické „Internal error" místo skutečné příčiny. **Opraveno**
  — teď se zobrazuje skutečná Stripe chyba (užitečné i pro budoucí ladění).
- **Systémový bug** (závažnější): Resend SDK nevyhazuje výjimku při API
  chybě, vrací `{ data, error }` — appka na **7 místech v celé appce**
  (potvrzení/připomínky/výsledky online testů, uvítací e-mail, týdenní
  report rodičům, error-alerting) tenhle `error` nikdy nekontrolovala, takže
  se **odmítnutý e-mail tvářil jako úspěšně odeslaný**. **Opraveno všude.**

**Co zbývá — mimo appku, na 3. straně:**
Doména `matematika-snadno.cz` (DNS na Wixu) není v Resendu plně ověřená —
Wix neumí MX záznam na poddoméně. Zjistili jsme přesnou příčinu (doména je
nastavená jako `spfType: migrated` místo `spfType: cname`) a **kontaktovali
Resend support** — potvrdili diagnózu a **eskalovali interně** přepnutí na
`cname` (nejde to změnit z dashboardu, dělá to jen jejich tým). Do té doby
appka posílá e-maily z **dočasného fallbacku** (`onboarding@resend.dev`),
který ale doručí jen na jeden konkrétní e-mail (vlastník Resend účtu), ne na
běžné studenty — **takže ostrý provoz e-mailů pro reálné studenty čeká na
odpověď od Resendu.**

**Akce (K):** až přijde odpověď od Resend supportu, přeposlat/dát vědět →
(C) dokončí přepnutí zpět na skutečnou doménu + ověření + deploy (odhad
10–15 minut práce, jakmile je doména hotová).

**Co JEŠTĚ nebylo otestováno** (mimo dnešní rozsah): automatické připomínky
24h/1h (cron), a e-mail „výsledky" doručený na skutečného studenta (visí na
výše zmíněné doméně).

---

## Nové zjištění: Vercel preview vs. produkce
Při ladění vyšlo najevo, že testování na preview URL (`...vercel.app`) může
mít jiné/chybějící env proměnné než produkční doména — doporučujeme vždy
testovat na `matemax.matematika-snadno.cz`. Nekontrolovali jsme systematicky,
jestli Vercel Preview environment má kompletní sadu proměnných — může to být
relevantní, pokud Karel používá preview URL i pro jiné účely (recenze PR
apod.).

---

## CO OD TEBE (Claude chat) POTŘEBUJI
Aktualizuj týdenní plán s ohledem na:
1. **Nejrychlejší dokončitelná věc:** zapsat Úhly L3 (pár minut práce (C),
   žádné čekání na nikoho) → hned hotové celé téma.
2. **Diagnostika je hotová** — může se škrtnout z plánu, případně nahradit
   odloženou položkou (obtížnost seedování + geometrie bez obrázku) jako
   samostatný, méně naléhavý bod pro některý z dalších večerů.
3. **E2E je z většiny hotové**, ale **blokuje ho 3. strana** (Resend support)
   — navrhni, ať se na to nečeká nečinně; mezitím pokračovat na obsahu
   (další téma po Úhlech) a k e-mailům se vrátit, až přijde odpověď.
4. Zvaž, jestli přidat nový krátký úkol: **zkontrolovat Vercel Preview env
   proměnné** (K, jednorázová kontrola v dashboardu, ~5 min), aby se
   podobný zmatek (preview vs. produkce) neopakoval příště.

Pracuj v češtině, stručně a akčně — Karel chce vědět, co dělá dnes večer.
