// Témata záznamového archu testu nanečisto.
// Klíč = suffix sloupce `body_*` v online_test_submissions.
export const TEST_TOPICS = [
  "zlomky",
  "vyrazy",
  "rovnice",
  "geometrie",
  "slovni_ulohy",
  "grafy",
  "uhly",
  "konstrukce",
  "kombinovane",
] as const;

export type TestTopic = (typeof TEST_TOPICS)[number];

export const TEST_TOPIC_LABELS: Record<TestTopic, string> = {
  zlomky: "Zlomky",
  vyrazy: "Výrazy",
  rovnice: "Rovnice",
  geometrie: "Geometrie",
  slovni_ulohy: "Slovní úlohy",
  grafy: "Grafy a logika",
  uhly: "Úhly",
  konstrukce: "Konstrukce",
  kombinovane: "Kombinované",
};

// Celkový počet bodů testu (CERMAT matematika)
export const TEST_MAX_POINTS = 50;

export const bodyColumn = (t: TestTopic) => `body_${t}` as const;
