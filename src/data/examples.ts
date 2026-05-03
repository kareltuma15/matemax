import rawData from "./databaze.json";
import { DBExample } from "@/types";

const db = rawData as { metadata: unknown; examples: DBExample[] };

export const examples: DBExample[] = db.examples;

export function getExampleById(id: string): DBExample | undefined {
  return examples.find((e) => e.id === id);
}

export function getExamplesByTema(tema: string): DBExample[] {
  return examples.filter((e) => e.tema === tema);
}

export const allTemas = [...new Set(examples.map((e) => e.tema))];
