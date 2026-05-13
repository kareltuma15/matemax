# Wix Redesign — matematika-snadno.cz
*Plán pro implementaci v Wix editoru · Deadline: 25. 5. 2026*

---

## Barvy & vizuální styl (sjednotit s MateMax)
| Token | Hex | Použití |
|-------|-----|---------|
| Navy | `#0D1B3E` | Hlavní CTA, nadpisy, hero bg |
| Blue | `#2E6DA4` | Sekundární CTA, akcenty |
| Cyan | `#00B4D8` | Tagy, pilly, highlights |
| Light bg | `#F8FAFF` | Sekce bg |
| White | `#FFFFFF` | Karty |

Font: systémový sans-serif nebo Inter (Wix má v knihovně). Nadpisy bold/black, tělo regular.

---

## HOMEPAGE — kompletní přestavba

### 1. NAVIGACE (horní lišta)
**Zjednodušit z 7 na 5 položek:**
- Domů
- Jak to funguje
- MateMax *(nové — odkaz na /matemax nebo sekci na homepage)*
- Sešit *(přejmenovat "Plány a ceny" → konkrétní název produktu)*
- Kontakt

**CTA v navigaci (vpravo):**
- Tlačítko: `Vyzkoušet MateMax →` · bg: #2E6DA4 · text: white · rounded

---

### 2. HERO SEKCE
**Layout:** Celá šířka, tmavé bg (`#0D1B3E`), bílý text, výška ~80vh na desktopu.

**Headline (velký, tučný):**
> Přijímačky z matematiky  
> zvládneš. Zaručeně.

**Subtext (menší, šedavě bílý):**
> Videolekce + chytrý trénink + pracovní sešit. Vše co potřebuješ na jednom místě.

**CTA tlačítka (dvě vedle sebe):**
1. `Vyzkoušet MateMax zdarma →` · bg: #2E6DA4 · primary
2. `Koupit sešit (249 Kč)` · outline white · secondary

**Pod CTA — stats bar (3 čísla vedle sebe):**
- `700+` příkladů ve stylu CERMAT
- `150+` minut videolekci
- `9` témat CERMAT

**Vizuál (vpravo nebo jako bg):** Screenshot MateMax dashboardu nebo mockup sešitu. Pokud nemáš obrázek, dej tmavý gradient s math symboly (π, ∑, √) poloprůhledně.

---

### 3. SOCIAL PROOF STRIPE
Jednoduchý pruh mezi hero a dalšími sekcemi. Tmavě šedé bg.

**Text:** `"Používá ho přes X žáků · Přijímačky 2026 · Obsah přesně dle CERMAT"`

*(X = reálné číslo nebo "stovky žáků" pokud nemáš přesná data)*

---

### 4. SEKCE "CO DOSTANEŠ" — 3 produkty vedle sebe
**Nadpis sekce:** `Kompletní příprava — vybereš si, co ti sedí`

**3 karty (bílé, border, rounded-xl, shadow):**

#### Karta 1 — MateMax (aplikace)
- Ikona: 🧠 nebo screenshot
- Název: **MateMax — chytrý trénink**
- Popis: Diagnostika mezer → personalizovaný trénink → denní 10 minut. Algoritmus sleduje chyby a vrací se k nim ve správný čas.
- Cena: **Zdarma** (nebo "od 99 Kč/měs" až spustíš premium)
- CTA: `Spustit zdarma →` · bg: #2E6DA4

#### Karta 2 — Pracovní sešit PDF (launch produkt 1. 6.)
- Ikona: 📄 nebo mockup sešitu
- Název: **Pracovní sešit PDF**
- Popis: 50+ stran. Cheat sheety vzorců + CERMAT příklady k tisku. Jednou zaplatíš, máš navždy.
- Cena: **249 Kč** (červená "Akční cena" pill)
- CTA: `Koupit PDF →` · bg: #0D1B3E

#### Karta 3 — Fyzický sešit (launch 1. 9.)
- Ikona: 📚 nebo foto sešitu
- Název: **Fyzický sešit** *(brzy)*
- Popis: Tištěná verze s pevnou vazbou. Ideální na psaní a poznámky. Předobjednávky od září.
- Cena: **449 Kč** (badge "Brzy")
- CTA: `Chci být informován` · outline · bg: bílý

---

### 5. JAK TO FUNGUJE — 3 kroky (zjednodušit ze 4)
**Nadpis:** `Jak tě MateMax připraví?`

**3 kroky (čísla 01 / 02 / 03, ikona, nadpis, popis):**

01 🎯 **Diagnostika** — 8 minut, 18 otázek. Zjistíme kde máš mezery.  
02 🏋️ **Denní trénink** — 10 minut každý den. Algoritmus volí příklady přesně pro tebe.  
03 📊 **Vidíš pokrok** — Přehled v profilu, certifikát připravenosti, týdenní report pro rodiče.

**CTA pod kroky:** `Začít diagnostikou →`

---

### 6. TESTIMONIAL / DŮVĚRA
*(Pokud nemáš reálné recenze, vynech nebo dej placeholder)*

**Nadpis:** `Co říkají žáci a rodiče`

3 karty s citáty. Příklad:
> *"Za 3 týdny denního tréninku jsem se zlepšil o 15 %. Algoritmus opravdu ví, kde jsem špatný."*  
> — Tomáš, 9. třída, Praha

Pokud nemáš recenze: přidej místo toho blok s logoty škol nebo výsledky — "Přijímačky 2026: naši žáci uspěli na gymnázia v Praze, Brně, Ostravě."

---

### 7. PRICING (zjednodušený)
**Nadpis:** `Vyber si svůj plán`

**2 karty (ne 3):**

| Zdarma | Premium |
|--------|---------|
| 3 témata | Všechna témata |
| Diagnostika | Diagnostika |
| 10 příkladů/den | Neomezeno |
| — | Týdenní report pro rodiče |
| — | CERMAT cvičné testy |
| **0 Kč** | **99 Kč / měsíc** |
| `Začít zdarma` | `Vyzkoušet Premium` |

*(Premium zatím jako "brzy" nebo "waitlist" pokud ještě nespouštíš)*

---

### 8. FAQ (zkrácená verze — 4 otázky max)
Nechat jen nejdůležitější:
1. Pro jaký věk je MateMax určen?
2. Jak dlouho denně se má dítě učit?
3. Jak se liší MateMax od sešitu?
4. Funguje MateMax offline?

---

### 9. FOOTER
**Levý sloupec:**  
Logo M² + "Matematika Snadno"  
Karel Tůma · Praha 5  
*IČO: XXXXXX* *(opravit!)*

**Střední sloupec:**  
Navigace: Domů / Jak to funguje / MateMax / Sešit / Kontakt

**Pravý sloupec:**  
`karel@matematika-snadno.cz`  
Instagram odkaz  
"© 2026 Matematika Snadno"

---

## PRODUKTOVÁ STRÁNKA — PDF sešit
*(Nová stránka nebo rozšíření existující)*

### URL: /sesit nebo /pdf-sesit

### Layout:
**Hero:**
- Velký nadpis: `Pracovní sešit — Matematika na přijímačky`
- Subtext: `50+ stran · PDF · Vytisknout doma nebo v kopírce · Jednou, navždy`
- Mockup PDF (screenshot první stránky)
- CTA: `Koupit za 249 Kč →` *(Wix Stores button)*

**Co je uvnitř (3–4 body):**
- ✅ Cheat sheety vzorců pro všechna CERMAT témata
- ✅ 100+ příkladů ve stylu přijímaček s řešením
- ✅ Přehledné tabulky a schémata
- ✅ Kompatibilní s MateMax tréninkem

**Ukázka (gallery nebo PDF embed):**
Vlož 2–3 screenshoty ze sešitu. Wix umí PDF preview widget.

**FAQ:**
- Jak dostanu PDF? — Okamžitě po zaplacení na email.
- Mohu ho vytisknout? — Ano, A4, doporučujeme oboustranně.
- Vrácení peněz? — Do 14 dnů bez udání důvodu.

**CTA znovu dole:** `Koupit za 249 Kč →`

---

## PRIORITNÍ POŘADÍ IMPLEMENTACE

| Pořadí | Úkol | Čas v editoru |
|--------|------|---------------|
| 1 | Hero sekce — nový text + 2 CTA | 30 min |
| 2 | Navigace zjednodušit + CTA tlačítko | 15 min |
| 3 | Sekce "Co dostaneš" — 3 karty | 45 min |
| 4 | Stats stripe pod hero | 20 min |
| 5 | Jak to funguje — zjednodušit na 3 kroky | 20 min |
| 6 | Produktová stránka PDF sešitu | 60 min |
| 7 | FAQ zkrátit | 15 min |
| 8 | Footer opravit (IČO, email) | 15 min |

**Celkem: ~3–4 hodiny · Ideálně Sobota 17. 5.**

---

## POZNÁMKY K WIXU

- **Barvy:** Přidej do Wix Site Design → Colors paletu: `#0D1B3E`, `#2E6DA4`, `#00B4D8`, `#F8FAFF`
- **Fonty:** Nastav hlavní font na Inter nebo Poppins (Wix font library)
- **Mobilní verze:** Každou sekci zkontroluj v mobile preview — Wix layout se sám neupraví
- **Wix Stores:** Produkt PDF musí mít `productType: digital` + nahraný PDF soubor
- **SEO:** Po implementaci zkontrolovat meta tituly každé stránky (Settings → SEO)
