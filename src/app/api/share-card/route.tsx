import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streak = parseInt(searchParams.get("streak") ?? "0");
  const xp = parseInt(searchParams.get("xp") ?? "0");
  const name = (searchParams.get("name") ?? "").slice(0, 20);
  const score = searchParams.get("score"); // e.g. "8/10"
  const mode = searchParams.get("mode") ?? "streak"; // "streak" | "session"

  const W = 1200;
  const H = 630;

  // Streak fire emoji
  const fire = streak >= 30 ? "🔥🔥🔥" : streak >= 7 ? "🔥🔥" : "🔥";

  const title = mode === "session" && score
    ? `${score} správně!`
    : streak > 0
    ? `${streak} ${streak === 1 ? "den" : streak < 5 ? "dny" : "dní"} v řadě`
    : "Trénuji na přijímačky";

  const subtitle = mode === "session" && score
    ? `${name ? `${name} — ` : ""}${xp > 0 ? `+${xp} XP · ` : ""}Matematika přijímačky`
    : name
    ? `${name} cvičí každý den matematiku ${fire}`
    : `Denní streak na MateMax ${fire}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          background: "linear-gradient(135deg, #0D1B3E 0%, #1a3a6b 50%, #2E6DA4 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background math symbols */}
        {["π", "√", "∑", "∞", "×", "÷"].map((sym, i) => (
          <div
            key={sym}
            style={{
              position: "absolute",
              fontSize: 80 + i * 20,
              color: "rgba(255,255,255,0.04)",
              fontWeight: 900,
              top: `${10 + i * 13}%`,
              left: i % 2 === 0 ? `${i * 15}%` : undefined,
              right: i % 2 === 1 ? `${(i - 1) * 15}%` : undefined,
            }}
          >
            {sym}
          </div>
        ))}

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              background: "#ffffff",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 900,
              color: "#0D1B3E",
              letterSpacing: "-2px",
            }}
          >
            M²
          </div>
          <span
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.5px",
            }}
          >
            MateMax
          </span>
        </div>

        {/* Main number / streak */}
        <div
          style={{
            fontSize: mode === "session" && score ? 90 : 110,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1,
            marginBottom: 8,
            letterSpacing: "-4px",
          }}
        >
          {mode === "session" && score ? score : streak > 0 ? streak : "🎯"}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "rgba(255,255,255,0.95)",
            marginBottom: 12,
            letterSpacing: "-1px",
            textAlign: "center",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(147,197,253,0.9)",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>

        {/* XP badge */}
        {xp > 0 && !(mode === "session" && score) && (
          <div
            style={{
              marginTop: 28,
              background: "rgba(251,191,36,0.15)",
              border: "2px solid rgba(251,191,36,0.4)",
              borderRadius: 40,
              padding: "10px 28px",
              fontSize: 24,
              fontWeight: 700,
              color: "#fbbf24",
            }}
          >
            ⭐ {xp} XP celkem
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            fontSize: 20,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.5px",
          }}
        >
          matemax.matematika-snadno.cz
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
