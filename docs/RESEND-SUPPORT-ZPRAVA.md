# Zpráva pro Resend support (zkopíruj do jejich chatu/e-mailu)

> Anglicky, ať to jde support týmu vyřídit rychle. Domain ID a datum jsou
> doplněné, stačí zkopírovat a odeslat.

---

Hi, I need help getting our domain fully verified — we've hit a platform
limitation that your own dashboard already flagged, but I can't get past it.

**Domain:** matematika-snadno.cz (id: 85973d0b-981f-4e55-be84-afb4ba4e6eee)

**Situation:**
- Our DNS is hosted on Wix, which does not support adding a custom MX record
  on a subdomain (only a single "connect one email provider" wizard for the
  root domain — confirmed by your own dashboard message: *"Wix doesn't
  support subdomains for MX records... Delete this domain and add it again
  to get new CNAME records instead, which would work on Wix."*)
- I followed that exact suggestion: deleted the domain and re-added it,
  received the new CNAME record (`rsend` → `send.forge.rmta.net`), added it
  to our Wix DNS, and it verified successfully.
- Current record status:
  - DKIM (TXT `resend._domainkey`) → **verified**
  - SPF (CNAME `rsend`) → **verified**
  - SPF (MX `send`) → pending (can't be added on Wix — see above)
  - SPF (TXT `send`) → pending
- Overall domain status is stuck at **`partially_verified`** and stays there.
- I confirmed via the API that `partially_verified` is not enough to send —
  attempting to send from `noreply@matematika-snadno.cz` returns:
  `403 "The matematika-snadno.cz domain is not verified. Please, add and
  verify your domain..."`

**Question:** Since DKIM and the CNAME-based SPF path are both verified, and
the only remaining pending records (MX + TXT on `send`) are structurally
impossible to add on Wix, is there a way to get this domain to a fully
`verified` / sendable state without those two records? Or is there an
alternative path (e.g. removing the legacy MX/TXT requirement now that the
CNAME satisfies the same purpose)?

Happy to provide any additional info needed. Thanks!
