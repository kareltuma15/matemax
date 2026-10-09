import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { checkAnswer, toAngleMinutes } from "../src/lib/normalize";

// Úhly ve stupních a minutách: dřív se „53°30′" zjednodušilo na „53", takže každé minuty byly uznané.
test("stupně a minuty se porovnávají přesně a zvládnou různé zápisy", () => {
  expect(toAngleMinutes("22°30′")).toBe(22 * 60 + 30);
  expect(toAngleMinutes("22°30'")).toBe(22 * 60 + 30);
  expect(toAngleMinutes("22 30")).toBe(22 * 60 + 30);
  expect(toAngleMinutes("22° 30")).toBe(22 * 60 + 30);
  expect(toAngleMinutes("22 st 30 min")).toBe(22 * 60 + 30);
  expect(toAngleMinutes("22,5")).toBe(22 * 60 + 30);
  expect(toAngleMinutes("22,5°")).toBe(22 * 60 + 30);
  expect(toAngleMinutes("22°75′")).toBeNull();
  expect(toAngleMinutes("abc")).toBeNull();

  for (const ok of ["60°15′", "60°15'", "60 15", "60°15", "60,25", "60,25°"]) expect(checkAnswer(ok, "60°15′"), ok).toBe(true);
  for (const bad of ["60", "60°", "60°30′", "61°15′", "6015", "60 51"]) expect(checkAnswer(bad, "60°15′"), bad).toBe(false);
  // existující úloha s minutami (PAP_1 má odpověď 53°30′) už nebere „53"
  expect(checkAnswer("53", "53°30′")).toBe(false);
  expect(checkAnswer("53 30", "53°30′")).toBe(true);
  // běžné úhly beze změny
  expect(checkAnswer("52", "52°")).toBe(true);
  expect(checkAnswer("52°", "52°")).toBe(true);
  expect(checkAnswer("53", "52°")).toBe(false);
});

test("každá úloha na úhly v databázi má obrázek a odpovědi s minutami jdou vyhodnotit", () => {
  const ex = JSON.parse(fs.readFileSync("src/data/databaze.json", "utf8")).examples as { id: string; tema: string; image?: unknown; odpoved: string }[];
  for (const e of ex.filter((x) => /^UHN/.test(x.id))) {
    expect(e.tema).toBe("uhly");
    expect(e.image, `${e.id} nemá obrázek`).toBeTruthy();
    expect(checkAnswer(e.odpoved, e.odpoved), e.id).toBe(true);
  }
});
