import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") ?? "Student").slice(0, 40);
  const readiness = Math.min(100, Math.max(0, parseInt(searchParams.get("readiness") ?? "0")));
  const xp = parseInt(searchParams.get("xp") ?? "0");
  const streak = parseInt(searchParams.get("streak") ?? "0");
  const dateStr = (searchParams.get("date") ?? "").slice(0, 40);

  const W = 1200;
  const H = 800;

  const readinessLabel =
    readiness >= 90 ? "Mistrovska priprava" :
    readiness >= 80 ? "Vynikajici priprava" :
    readiness >= 70 ? "Dobra priprava" :
    readiness >= 60 ? "Solidni zaklad" :
    "Rozvijecis se";

  const readinessColor =
    readiness >= 80 ? "#22c55e" :
    readiness >= 70 ? "#3b82f6" :
    readiness >= 60 ? "#f59e0b" :
    "#ef4444";

  const stars =
    readiness >= 90 ? "★★★" :
    readiness >= 75 ? "★★" :
    "★";

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          background: "linear-gradient(145deg, #060c1a 0%, #0D1B3E 50%, #0f2347 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold outer border */}
        <div
          style={{
            position: "absolute",
            top: 22,
            right: 22,
            bottom: 22,
            left: 22,
            border: "4px solid #fbbf24",
            borderRadius: 20,
          }}
        />
        {/* Inner subtle border */}
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 36,
            bottom: 36,
            left: 36,
            border: "1.5px solid rgba(251,191,36,0.22)",
            borderRadius: 14,
          }}
        />

        {/* Corner ornaments */}
        <div style={{ position: "absolute", top: 50, left: 50, width: 16, height: 16, background: "#fbbf24", borderRadius: "50%", opacity: 0.55 }} />
        <div style={{ position: "absolute", top: 50, right: 50, width: 16, height: 16, background: "#fbbf24", borderRadius: "50%", opacity: 0.55 }} />
        <div style={{ position: "absolute", bottom: 50, left: 50, width: 16, height: 16, background: "#fbbf24", borderRadius: "50%", opacity: 0.55 }} />
        <div style={{ position: "absolute", bottom: 50, right: 50, width: 16, height: 16, background: "#fbbf24", borderRadius: "50%", opacity: 0.55 }} />

        {/* Math symbol watermarks */}
        {["π", "√", "∑", "∞"].map((sym, i) => (
          <div
            key={sym}
            style={{
              position: "absolute",
              fontSize: 200,
              color: "rgba(255,255,255,0.022)",
              fontWeight: 900,
              top: i < 2 ? -30 : undefined,
              bottom: i >= 2 ? -30 : undefined,
              left: i % 2 === 0 ? 40 : undefined,
              right: i % 2 === 1 ? 40 : undefined,
            }}
          >
            {sym}
          </div>
        ))}

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 1,
            width: "100%",
            paddingLeft: 80,
            paddingRight: 80,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div
              style={{
                width: 50,
                height: 50,
                background: "#ffffff",
                borderRadius: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 900,
                color: "#0D1B3E",
                letterSpacing: "-2px",
              }}
            >
              M²
            </div>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "-0.5px",
              }}
            >
              MateMax
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#fbbf24",
              letterSpacing: "5px",
              marginBottom: 16,
            }}
          >
            CERTIFIKAT PRIPRAVENOSTI
          </div>

          {/* Gold divider */}
          <div
            style={{
              width: 520,
              height: 2,
              background: "linear-gradient(90deg, rgba(251,191,36,0) 0%, #fbbf24 50%, rgba(251,191,36,0) 100%)",
              marginBottom: 22,
            }}
          />

          {/* Issued to text */}
          <div style={{ fontSize: 19, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
            Timto se osvedcuje, ze zak/zakyni
          </div>

          {/* Student name */}
          <div
            style={{
              fontSize: name.length > 22 ? 46 : name.length > 15 ? 54 : 62,
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-1.5px",
              marginBottom: 14,
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>

          {/* Achievement text */}
          <div
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.5)",
              marginBottom: 22,
              textAlign: "center",
              maxWidth: 800,
              lineHeight: 1.5,
            }}
          >
            dosahl/a urovne pripravenosti na prijimaci zkousky ze stredoskolske matematiky
          </div>

          {/* Big readiness score */}
          <div
            style={{
              fontSize: 100,
              fontWeight: 900,
              color: "#fbbf24",
              lineHeight: 1,
              letterSpacing: "-4px",
              marginBottom: 6,
            }}
          >
            {readiness} %
          </div>

          {/* Stars + level label */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20, color: "#fbbf24" }}>{stars}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: readinessColor }}>{readinessLabel}</span>
            <span style={{ fontSize: 20, color: "#fbbf24" }}>{stars}</span>
          </div>

          {/* Thin divider */}
          <div
            style={{
              width: 400,
              height: 1,
              background: "rgba(251,191,36,0.2)",
              marginBottom: 16,
            }}
          />

          {/* Stats row */}
          {(xp > 0 || streak > 0) && (
            <div style={{ display: "flex", gap: 28, alignItems: "center", marginBottom: 14 }}>
              {xp > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 17 }}>⭐</span>
                  <span style={{ fontSize: 16, color: "#fbbf24", fontWeight: 700 }}>{xp} XP</span>
                </div>
              )}
              {streak > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 17 }}>🔥</span>
                  <span style={{ fontSize: 16, color: "#fb923c", fontWeight: 700 }}>{streak} dni v rade</span>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          {dateStr && (
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
              {dateStr}
            </div>
          )}

          {/* Footer */}
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", letterSpacing: "0.5px" }}>
            matemax.matematika-snadno.cz
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
