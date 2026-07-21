// Kam po přihlášení. Řízený domov („Dnes tě čeká X") je na „/", ne v katalogu
// témat na /trenink — žák má být veden, ne hozen do města plného možností.
export function getSmartRedirect(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const diagDone = localStorage.getItem("matemax-diag-done") === "1";
    const progressRaw = localStorage.getItem("matemax-progress");

    // Úplně nový uživatel — žádná data → onboarding
    if (!diagDone && !progressRaw) {
      return "/vitej";
    }

    // Delší pauza (3+ dny) → domov s comeback uvítáním
    if (progressRaw) {
      const progress = JSON.parse(progressRaw) as { lastActiveDate?: string | null };
      if (progress.lastActiveDate) {
        const daysSince = Math.floor(
          (Date.now() - new Date(progress.lastActiveDate).getTime()) / 86400000
        );
        if (daysSince >= 3) {
          return "/?comeback=1";
        }
      }
    }

    // Aktivní žák → řízený domov s dnešní misí
    return "/";
  } catch {
    return fallback;
  }
}
