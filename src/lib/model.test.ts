import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, computeOutcome, deviationCheck, logitShares, solveGame } from "./model";
import { SCENARIOS } from "./scenarios";

describe("logitShares", () => {
  it("sums to 1 and is stable for huge utilities", () => {
    const s = logitShares([1000, 999]);
    expect(s[0] + s[1]).toBeCloseTo(1, 12);
    expect(s[0]).toBeCloseTo(1 / (1 + Math.exp(-1)), 12);
  });
});

describe("computeOutcome", () => {
  it("matches the hand-computed profit formula", () => {
    const o = computeOutcome(16, 16, DEFAULT_PARAMS);
    // U_A − U_B = 0.05·2 + 0.15·1 + 0.01·10 = 0.35
    const sA = 1 / (1 + Math.exp(-0.35));
    expect(o.A.share).toBeCloseTo(sA, 10);
    expect(o.A.profit).toBeCloseTo((16 - 8) * 1000 * sA * 20 - 2000, 6);
    expect(o.A.demand + o.B.demand).toBeCloseTo(1000, 9);
  });
});

describe("solveGame", () => {
  it("every equilibrium survives the unilateral deviation test", () => {
    for (const sc of SCENARIOS) {
      const g = solveGame(sc.params);
      for (const e of g.equilibria) {
        expect(deviationCheck(g, e.i, e.j, "A").gain).toBeLessThanOrEqual(1e-6);
        expect(deviationCheck(g, e.i, e.j, "B").gain).toBeLessThanOrEqual(1e-6);
      }
    }
  });
});
