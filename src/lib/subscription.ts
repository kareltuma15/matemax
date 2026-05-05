export const FREE_TOPICS = new Set(["zlomky", "procenta", "rovnice"]);

export const PREMIUM_TOPICS = new Set([
  "geometrie",
  "mocniny",
  "slovni_ulohy",
  "cisselne_rady",
  "vyrazy",
  "kombinovane",
]);

export function isPremium(): boolean {
  return false;
}

export function isTopicLocked(tema: string): boolean {
  return !isPremium() && PREMIUM_TOPICS.has(tema);
}
