import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = parseInt(searchParams.get("size") ?? "192");
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.44);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0D1B3E",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
          fontSize,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-4px",
        }}
      >
        M²
      </div>
    ),
    { width: size, height: size }
  );
}
