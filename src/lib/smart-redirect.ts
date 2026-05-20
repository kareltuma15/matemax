// Smart post-login redirect — determines where to send user after login
// based on their current progress state in localStorage.
export function getSmartRedirect(fallback = "/trenink"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const diagDone = localStorage.getItem("matemax-diag-done") === "1";
    const progressRaw = localStorage.getItem("matemax-progress");

    // Completely new user — no data at all → onboarding flow
    if (!diagDone && !progressRaw) {
      return "/vitej";
    }

    // Check inactivity (3+ days without practice → homepage comeback modal)
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

    // Active user → go practice directly
    return "/trenink";
  } catch {
    return fallback;
  }
}
