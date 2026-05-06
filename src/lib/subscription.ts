// Topics accessible to guests (not logged in)
export const GUEST_FREE_TOPICS = new Set(["zlomky", "rovnice", "geometrie"]);

// Topics accessible to all logged-in users (free tier)
export const FREE_TOPICS = new Set([
  "zlomky",
  "procenta",
  "rovnice",
  "pomer_meritko",
  "logicke_ulohy",
]);

// Topics behind a future paid tier (not enforced yet)
export const PREMIUM_TOPICS = new Set([
  "geometrie",
  "mocniny",
  "slovni_ulohy",
  "cisselne_rady",
  "vyrazy",
  "kombinovane",
  "geometrie_rovinna",
  "geometrie_prostorova",
  "uhly",
]);

export function isPremium(): boolean {
  return false;
}

/** Lock check for logged-in free users (future paid gate — currently inactive) */
export function isTopicLocked(tema: string): boolean {
  return !isPremium() && PREMIUM_TOPICS.has(tema) && false; // gate disabled for now
}

/** Lock check for guests (not authenticated) */
export function isTopicLockedForGuest(tema: string): boolean {
  return !GUEST_FREE_TOPICS.has(tema);
}
