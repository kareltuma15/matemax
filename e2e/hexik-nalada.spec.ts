import { test, expect } from "@playwright/test";
import { naladaHexika } from "../src/lib/nalada-hexika";

// Nálada 3D Hexíka na Domově (Karel 19. 11. 2026): ospalý po pauze, stýská se mu večer, když hrozí přerušení série.
test.describe("nálada Hexíka", () => {
  test("dnes trénoval nebo nikdy: normální", () => {
    expect(naladaHexika({ lastActiveDate: "2026-11-19", streak: 5 }, new Date(2026, 10, 19, 20))).toBe("neutral");
    expect(naladaHexika({ lastActiveDate: null, streak: 0 }, new Date(2026, 10, 19, 20))).toBe("neutral");
  });
  test("2 a víc dní bez tréninku: ospalý", () => {
    expect(naladaHexika({ lastActiveDate: "2026-11-17", streak: 3 }, new Date(2026, 10, 19, 9))).toBe("ospaly");
    expect(naladaHexika({ lastActiveDate: "2026-10-30", streak: 1 }, new Date(2026, 10, 19, 9))).toBe("ospaly");
  });
  test("včera trénoval, série aspoň 2, večer: stýská se mu; ráno ještě ne", () => {
    expect(naladaHexika({ lastActiveDate: "2026-11-18", streak: 4 }, new Date(2026, 10, 19, 18))).toBe("smutny");
    expect(naladaHexika({ lastActiveDate: "2026-11-18", streak: 4 }, new Date(2026, 10, 19, 10))).toBe("neutral");
    expect(naladaHexika({ lastActiveDate: "2026-11-18", streak: 1 }, new Date(2026, 10, 19, 18))).toBe("neutral");
  });
  test("přes konec měsíce", () => {
    expect(naladaHexika({ lastActiveDate: "2026-11-30", streak: 3 }, new Date(2026, 11, 1, 19))).toBe("smutny");
  });
});
