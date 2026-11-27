import { test, expect } from "@playwright/test";
import crypto from "crypto";
import { lepsiStav, STAVY } from "../src/lib/zpravy-log";
import { otiskChyby } from "../src/lib/system-log";

/**
 * Admin 2.1, fáze B1: sběr dat pro Zprávy a Zdraví systému. Bez databáze (pravidla) a webhook bez podpisu.
 */

test.describe("log zpráv a chyb (bez prohlížeče)", () => {
  test("stav zprávy nikdy nespadne na horší, vrácení a spam přepíšou dobré", () => {
    expect(lepsiStav("odeslano", "doruceno")).toBe("doruceno");
    expect(lepsiStav("kliknuto", "doruceno")).toBe("kliknuto");
    expect(lepsiStav("otevreno", "kliknuto")).toBe("kliknuto");
    expect(lepsiStav("doruceno", "vraceno")).toBe("vraceno");
    expect(lepsiStav("vraceno", "doruceno")).toBe("vraceno");
    expect(lepsiStav("kliknuto", "spam")).toBe("spam");
    expect(lepsiStav("doruceno", "neznamy")).toBe("doruceno");
    for (const s of Object.values(STAVY)) expect(s.nazev.length).toBeGreaterThan(2);
  });

  test("otisk chyby: stejná chyba s jinými čísly a ID = stejný otisk", () => {
    const a = otiskChyby("klient", "Cannot read 12 of undefined (id 1b4e28ba-2fa1-11d2-883f-0016d3cca427)", "/trenink");
    const b = otiskChyby("klient", "Cannot read 7 of undefined (id 9c5b94b1-35ad-49bb-b118-8e8fc24abf80)", "/trenink");
    expect(a).toBe(b);
    expect(otiskChyby("server", "x", "/a")).not.toBe(otiskChyby("server", "x", "/b"));
  });
});

test("webhook Resendu bez platného podpisu nic nezapíše", async ({ request }) => {
  const telo = JSON.stringify({ type: "email.delivered", data: { email_id: crypto.randomUUID() } });
  const r = await request.post("/api/resend/webhook", { data: telo, headers: { "content-type": "application/json", "svix-id": "msg_test", "svix-timestamp": String(Math.floor(Date.now() / 1000)), "svix-signature": "v1,neplatny" } });
  expect(r.status()).toBe(401);
});

test("stav push: neplatné tělo se tiše přijme a nic nezmění", async ({ request }) => {
  const r = await request.post("/api/push/stav", { data: { z: "neni-uuid", stav: "kliknuto" } });
  expect(r.ok()).toBe(true);
  const r2 = await request.post("/api/push/stav", { data: { z: crypto.randomUUID(), stav: "smazat" } });
  expect(r2.ok()).toBe(true);
});
