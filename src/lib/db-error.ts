// Supabase JS při chybě NEVYHAZUJE výjimku, jen vrací { error }. Bez kontroly proto zápis
// selže potichu (tak se dřív ztrácely relace, SM-2 karty, doporučení i push odběry).
// Tenhle pomocník chybu zaloguje a z prohlížeče ji pošle do /api/error-report, kde se uloží
// a přijde upozornění. Každé místo se hlásí nejvýš jednou za načtení stránky.

const reported = new Set<string>();

export function reportDbError(
  where: string,
  error: { message?: string; code?: string } | null | undefined
): void {
  if (!error) return;
  const message = `[db] ${where}: ${error.code ?? "?"} ${error.message ?? ""}`.trim().slice(0, 400);
  console.error(message);

  if (typeof window === "undefined" || reported.has(where)) return;
  reported.add(where);
  try {
    void fetch("/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "unhandled_error", message, url: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // hlášení nikdy nesmí shodit appku
  }
}
