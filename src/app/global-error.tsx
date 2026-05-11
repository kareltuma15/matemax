"use client";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#F8FAFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#0D1B3E",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Něco se pokazilo
          </h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            Nastala neočekávaná chyba. Zkus to znovu.
            {error.digest && (
              <span style={{ display: "block", marginTop: "0.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
                Kód: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={unstable_retry}
            style={{
              background: "#1a3a6e",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Zkusit znovu
          </button>
        </div>
      </body>
    </html>
  );
}
