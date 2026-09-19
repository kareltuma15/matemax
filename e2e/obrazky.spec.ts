import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Každý statický obrázek, na který odkazuje databáze úloh, musí existovat a být obrázek.
// Chrání před překlepem v cestě (žák by místo obrázku viděl prázdný rámeček).
type Ex = { id: string; image?: { kind: string; url?: string } };
const db = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/databaze.json"), "utf8"));
const examples: Ex[] = Array.isArray(db) ? db : (db.examples ?? db.priklady ?? []);

const staticUrls = new Map<string, string[]>();
for (const ex of examples) {
  if (ex.image?.kind === "static" && ex.image.url) {
    staticUrls.set(ex.image.url, [...(staticUrls.get(ex.image.url) ?? []), ex.id]);
  }
}

test.describe("statické obrázky úloh", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "nezávisí na viewportu, stačí jednou");
  });

  test("databáze má statické obrázky", () => {
    expect(staticUrls.size).toBeGreaterThan(0);
  });

  for (const [url, ids] of staticUrls) {
    test(`${url} existuje (${ids.slice(0, 3).join(", ")}${ids.length > 3 ? ", …" : ""})`, async ({ request }) => {
      const res = await request.get(url);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"] ?? "").toMatch(/^image\//);
    });
  }
});
