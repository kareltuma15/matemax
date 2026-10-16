// Záloha všech dat ze Supabase do JSON souborů (provizorium na plánu Free, který nemá zálohy).
// Spuštění:  node scripts/zaloha-supabase.mjs "C:/Users/Karel/zalohy-matemax"
// Čte přes service role z .env.local. Soubory obsahují OSOBNÍ ÚDAJE (e-maily, jména) — proto skript
// odmítne zapisovat dovnitř repozitáře a složku nikdy nedávej do gitu ani do sdílených disků.
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2];
if (!out) { console.error('Použití: node scripts/zaloha-supabase.mjs "C:/cesta/mimo/repozitar"'); process.exit(1); }
const repo = path.resolve(process.cwd());
const target = path.resolve(out);
if (target === repo || target.startsWith(repo + path.sep)) { console.error("Složka je uvnitř repozitáře — záloha s osobními údaji nesmí do gitu. Zvol jinou cestu."); process.exit(1); }

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("V .env.local chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const day = new Date().toISOString().slice(0, 10);
const dir = path.join(target, `matemax-${day}`);
fs.mkdirSync(dir, { recursive: true });

const spec = await (await fetch(`${URL_}/rest/v1/`, { headers: H })).json();
const tables = Object.keys(spec.definitions ?? {});
const summary = {};
for (const t of tables) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL_}/rest/v1/${t}?select=*`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    if (!r.ok) { console.error(`✗ ${t}: HTTP ${r.status}`); break; }
    const part = await r.json();
    rows.push(...part);
    if (part.length < 1000) break;
  }
  fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows, null, 1));
  summary[t] = rows.length;
}

// uživatelé z Authentication (e-mail, jméno, data registrace)
let page = 1, users = [];
for (;;) {
  const r = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000&page=${page}`, { headers: H })).json();
  const batch = r.users ?? [];
  users = users.concat(batch);
  if (batch.length < 1000) break;
  page++;
}
fs.writeFileSync(path.join(dir, "_auth_users.json"), JSON.stringify(users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, email_confirmed_at: u.email_confirmed_at, user_metadata: u.user_metadata })), null, 1));
summary._auth_users = users.length;
fs.writeFileSync(path.join(dir, "_souhrn.json"), JSON.stringify({ vytvoreno: new Date().toISOString(), tabulky: summary }, null, 2));

console.log(`Záloha uložena do ${dir}`);
for (const [t, n] of Object.entries(summary)) console.log(`  ${String(n).padStart(6)}  ${t}`);
console.log("Soubory obsahují osobní údaje — nikam je nenahrávej a nedávej do gitu.");
