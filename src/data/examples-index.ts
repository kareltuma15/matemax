// Lightweight lookup — only id + tema, ~15 KB vs 261 KB for full examples.
// Use this where you only need to count/group examples by topic.
import rawData from "./databaze.json";
import cermatData from "./cermat-200.json";

type Slim = { id: string; tema: string };
const db = rawData as { examples: Slim[] };
const cermat = cermatData as { examples: Slim[] };

export const examplesIndex: Slim[] = [
  ...db.examples.map(({ id, tema }) => ({ id, tema })),
  ...cermat.examples.map(({ id, tema }) => ({ id, tema })),
];
