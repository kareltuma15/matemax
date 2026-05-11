import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MateMax — Příprava na přijímačky z matematiky";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0D1B3E 0%, #1a3a6e 60%, #0e4a8a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
          }}
        />

        {/* logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            marginBottom: 32,
            fontSize: 48,
          }}
        >
          📐
        </div>

        {/* title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
            marginBottom: 16,
          }}
        >
          MateMax
        </div>

        {/* tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#93c5fd",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Adaptivní příprava na přijímačky z matematiky
        </div>

        {/* stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 48,
            padding: "16px 48px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          {[
            { value: "700+", label: "příkladů" },
            { value: "9", label: "témat" },
            { value: "SM-2", label: "algoritmus" },
          ].map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <span style={{ fontSize: 32, fontWeight: 700, color: "#ffffff" }}>{s.value}</span>
              <span style={{ fontSize: 16, color: "#94a3b8", marginTop: 4 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* domain */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "#475569",
          }}
        >
          matemax.matematika-snadno.cz
        </div>
      </div>
    ),
    { ...size }
  );
}
