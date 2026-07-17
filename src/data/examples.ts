import rawData from "./databaze.json";
import cermatData from "./cermat-200.json";
import konstrukceData from "./konstrukce-interaktivni.json";
import doplnkyData from "./doplnky-uhly-souhrnne.json";
import { DBExample } from "@/types";

const db = rawData as { metadata: unknown; examples: DBExample[] };
const cermat = cermatData as { metadata: unknown; examples: DBExample[] };
const konstrukce = konstrukceData as { metadata: unknown; examples: DBExample[] };
const doplnky = doplnkyData as { metadata: unknown; examples: DBExample[] };

export const examples: DBExample[] = [
  ...db.examples, ...cermat.examples, ...konstrukce.examples, ...doplnky.examples,
];

export function getExampleById(id: string): DBExample | undefined {
  return examples.find((e) => e.id === id);
}

export function getExamplesByTema(tema: string): DBExample[] {
  return examples.filter((e) => e.tema === tema);
}

export const allTemas = [...new Set(examples.map((e) => e.tema))];
