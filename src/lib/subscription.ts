// Topics accessible to guests (not logged in)
export const GUEST_FREE_TOPICS = new Set(["zlomky", "rovnice", "geometrie"]);

// Topics accessible to all logged-in users (free tier)
export const FREE_TOPICS = new Set([
  "zlomky",
  "rovnice",
  "slovni_ulohy",
]);

// Topics behind a future paid tier (not enforced yet)
export const PREMIUM_TOPICS = new Set([
  "vyrazy",
  "geometrie",
  "grafy_logika",
  "konstrukce",
  "uhly",
  "souhrnne",
]);

/** Lock check for logged-in free users */
export function isTopicLocked(tema: string, isPremium: boolean): boolean {
  return !isPremium && PREMIUM_TOPICS.has(tema);
}

/** Lock check for guests (not authenticated) */
export function isTopicLockedForGuest(tema: string): boolean {
  return !GUEST_FREE_TOPICS.has(tema);
}
