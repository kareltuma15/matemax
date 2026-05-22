// Client-side error tracking — runs before React hydration.
// Captures unhandled JS errors and promise rejections, deduplicates within session,
// and POSTs to /api/error-report for alerting + storage.

const REPORT_URL = "/api/error-report";

function getSessionKey(message: string, source?: string): string {
  return `err:${message.slice(0, 60)}:${source ?? ""}`;
}

function alreadyReported(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
    return false;
  } catch {
    return false;
  }
}

async function postError(payload: {
  type: "unhandled_error" | "unhandled_rejection";
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  url: string;
}): Promise<void> {
  try {
    await fetch(REPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Silently ignore — reporting must never break the app
  }
}

window.addEventListener("error", (event) => {
  const message = event.error?.message ?? event.message ?? "Unknown error";
  const source = event.filename ?? undefined;
  const key = getSessionKey(message, source);
  if (alreadyReported(key)) return;

  postError({
    type: "unhandled_error",
    message,
    stack: event.error?.stack?.slice(0, 800),
    source,
    lineno: event.lineno,
    colno: event.colno,
    url: window.location.href,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
      ? reason
      : "Unhandled promise rejection";
  const key = getSessionKey(message);
  if (alreadyReported(key)) return;

  postError({
    type: "unhandled_rejection",
    message,
    stack: reason instanceof Error ? reason.stack?.slice(0, 800) : undefined,
    url: window.location.href,
  });
});
