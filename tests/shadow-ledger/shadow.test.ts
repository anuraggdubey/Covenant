/**
 * Shadow Ledger — T-B10.
 *
 * The tests that matter here are the ones that stop the number flattering us:
 * no backfilling a mark, no shrink that widens, and a report that keeps its
 * caveat attached.
 */

import { describe, expect, it } from "vitest";

import { BackfillRefused, buildReport, createMark } from "@/lib/shadow-ledger";
import { FIXED_NOW, buildWorld } from "../fixtures";

const world = buildWorld();
const DECIDED = FIXED_NOW.toISOString();
const MARKED = new Date(FIXED_NOW.getTime() + 3_600_000).toISOString();

function mark(over: Partial<Parameters<typeof createMark>[0]> = {}) {
  return createMark({
    candidateId: "c-1",
    intent: { ...world.intent, quantity: 3 },
    decision: "VETO",
    failedInvariants: ["COV-03"],
    governedQuantity: 0,
    markPerContract: "-50.00",
    decidedAt: DECIDED,
    markedAt: MARKED,
    ...over
  });
}

describe("shadow marks", () => {
  it("records the ungoverned counterfactual at the full requested size", () => {
    const m = mark();
    expect(m.shadowQuantity).toBe(3);
    expect(m.governedQuantity).toBe(0);
  });

  it("refuses a mark that predates its decision", () => {
    expect(() =>
      mark({ markedAt: new Date(FIXED_NOW.getTime() - 60_000).toISOString() })
    ).toThrow(BackfillRefused);
  });

  it("refuses a governed size larger than the request", () => {
    expect(() => mark({ governedQuantity: 9 })).toThrow(/cannot widen/);
  });
});

describe("shadow report", () => {
  it("credits a veto that avoided a loss", () => {
    // Vetoed 3 lots that each went on to lose $50.
    const report = buildReport([mark()]);

    expect(report.governedPnl).toBe("0.00");
    expect(report.shadowPnl).toBe("-150.00");
    expect(report.safetyDelta).toBe("150.00");
    expect(report.lossAvoided).toBe("150.00");
    expect(report.missedUpside).toBe("0.00");
  });

  it("charges a veto that cost upside — the ledger cuts both ways", () => {
    const report = buildReport([mark({ markPerContract: "40.00" })]);

    expect(report.shadowPnl).toBe("120.00");
    expect(report.safetyDelta).toBe("-120.00");
    expect(report.missedUpside).toBe("120.00");
    expect(report.lossAvoided).toBe("0.00");
  });

  it("scores a shrink on the part that was prevented, not the whole trade", () => {
    // 3 requested, 1 taken, each contract loses $50: governed -50, shadow -150.
    const report = buildReport([
      mark({ decision: "SHRINK", governedQuantity: 1, failedInvariants: ["COV-02"] })
    ]);

    expect(report.governedPnl).toBe("-50.00");
    expect(report.shadowPnl).toBe("-150.00");
    expect(report.lossAvoided).toBe("100.00");
  });

  it("attributes to every rule that fired, without picking a winner", () => {
    const report = buildReport([mark({ failedInvariants: ["COV-02", "COV-03"] })]);

    expect(report.attribution).toHaveLength(2);
    expect(report.attribution.map((a) => a.invariant)).toEqual(["COV-02", "COV-03"]);
    // $150 avoided, split evenly across the two rules that stopped it.
    expect(report.attribution[0]!.lossAvoided).toBe("75.00");
    expect(report.attribution[0]!.interventions).toBe(1);
  });

  it("keeps the counterfactual caveat attached to the numbers", () => {
    const report = buildReport([mark()]);
    expect(report.caveat).toMatch(/not causal proof/i);
  });

  it("reports an empty book without inventing a result", () => {
    const report = buildReport([]);
    expect(report.candidates).toBe(0);
    expect(report.safetyDelta).toBe("0.00");
    expect(report.attribution).toEqual([]);
  });
});
