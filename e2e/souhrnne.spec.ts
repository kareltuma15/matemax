import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { podtemaLabel } from "../src/types";

// Souhrnné úlohy kombinují témata; podtéma má tvar „geometrie_procenta" a popisek se skládá automaticky.
test("popisky podtémat souhrnných úloh se skládají ze složených názvů", () => {
  expect(podtemaLabel("geometrie_procenta")).toBe("Geometrie + procenta");
  expect(podtemaLabel("zlomky_geometrie")).toBe("Zlomky + geometrie");
  expect(podtemaLabel("geometrie_pytagoras")).toBe("Geometrie + Pythagorova věta");
  expect(podtemaLabel("rovnice_slovni")).toBe("Rovnice + slovní úloha");
  expect(podtemaLabel("mix")).toBeTruthy();                // existující popisek má přednost
  expect(podtemaLabel("geometrie_neznamy")).toBeNull();   // neznámé slovo → bez popisku
  expect(podtemaLabel("osa_usecky")).toBe("Osa úsečky"); // běžné podtéma se nemění
});

test("všechna podtémata souhrnných úloh v databázi mají popisek", () => {
  const files = ["databaze", "cermat-200", "doplnky-uhly-souhrnne"];
  const ex = files.flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples as { id: string; tema: string; podtema?: string }[]);
  const bez = ex.filter((e) => e.tema === "souhrnne" && e.podtema && !podtemaLabel(e.podtema)).map((e) => `${e.id}:${e.podtema}`);
  expect(bez, "souhrnné úlohy bez popisku podtématu").toEqual([]);
});
