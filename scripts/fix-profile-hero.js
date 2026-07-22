const fs = require('fs');
let c = fs.readFileSync('src/app/(app)/profil/page.tsx', 'utf8');

// Find and replace the hero section
const OLD_START = '      {/* ── HERO SECTION ── */}\n      <div className="hero-animated rounded-2xl overflow-hidden">';
const OLD_END = '          <p className="text-xs text-white/40 mt-1">{pct} % do dalšího levelu</p>\n        </div>\n      </div>';

const startIdx = c.indexOf(OLD_START);
const endIdx = c.indexOf(OLD_END);

if (startIdx === -1) { console.log('START not found'); process.exit(1); }
if (endIdx === -1) { console.log('END not found'); process.exit(1); }

const before = c.substring(0, startIdx);
const after = c.substring(endIdx + OLD_END.length);

const NEW_HERO = `      {/* ── HERO PLAYER CARD ── */}
      <div className="hero-animated rounded-2xl overflow-hidden">
        <div className="px-5 pt-6 pb-5">
          {/* Top row: avatar + info */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: "80px", height: "80px",
                  background: "rgba(255,255,255,0.12)",
                  border: "3px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 0 24px rgba(124,58,237,0.45)",
                }}
              >
                {avatarEmoji
                  ? <span className="text-4xl leading-none">{avatarEmoji}</span>
                  : <span className="text-white text-4xl font-black">{initials}</span>
                }
              </div>
              <button
                type="button"
                onClick={() => { setShowPersonaForm(true); setTimeout(() => document.getElementById("nastaveni-section")?.scrollIntoView({ behavior: "smooth" }), 50); }}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-md press-scale"
                style={{ background: "#2E6DA4", border: "2px solid rgba(255,255,255,0.3)" }}
                title="Upravit profil"
              >
                ✏️
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-lg leading-tight truncate">
                {displayName || email || "Nepřihlášen"}
              </p>
              {displayName && email && (
                <p className="text-blue-300 text-xs mt-0.5 truncate">{email}</p>
              )}
              <div
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(253,224,71,0.18)", border: "1px solid rgba(253,224,71,0.4)" }}
              >
                <span className="text-sm">{level.icon_emoji}</span>
                <span className="text-xs font-bold" style={{ color: "#fde047" }}>{level.rank_title}</span>
              </div>

              {/* XP row */}
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-black text-white">⚡{xp}</p>
                <span className="text-xs text-blue-300">XP</span>
                {toNext !== null && (
                  <span className="text-[10px] text-white/50 ml-auto">{toNext} do ↑</span>
                )}
              </div>
              <div className="w-full bg-white/15 rounded-full h-2 overflow-hidden mt-1">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{ width: \`\${pct}%\`, background: "linear-gradient(90deg, rgba(255,255,255,0.9), rgba(168,85,247,0.9))" }}
                />
              </div>
            </div>
          </div>

          {/* Bottom stats row inside hero */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl py-2 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <p className="text-xl font-black text-white">{streak}</p>
              <p className="text-[10px] text-blue-200">🔥 streak</p>
            </div>
            <div className="rounded-xl py-2 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <p className="text-xl font-black text-white">{totalSolved}</p>
              <p className="text-[10px] text-blue-200">📚 příkladů</p>
            </div>
            <div className="rounded-xl py-2 text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              <p className="text-xl font-black text-white">{overallAccuracy !== null ? \`\${overallAccuracy}\xa0%\` : "—"}</p>
              <p className="text-[10px] text-blue-200">🎯 přesnost</p>
            </div>
          </div>
        </div>
      </div>`;

c = before + NEW_HERO + after;
fs.writeFileSync('src/app/(app)/profil/page.tsx', c, 'utf8');
console.log('Done — hero rewritten at index', startIdx);
