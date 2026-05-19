export const TRIAL_DAYS = 7;

export function generateReferralCode(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function getReferralLink(userId: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://matemax.matematika-snadno.cz";
  return `${base}/registrace?ref=${generateReferralCode(userId)}`;
}

export const PENDING_REF_KEY = "matemax-pending-ref";
