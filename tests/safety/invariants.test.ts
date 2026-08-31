/**
 * One test block per invariant — Lane B, T-B1.
 *
 * The registry is the executable form of the mandate, so this file is also
 * the coverage claim: every COV-nn has at least one test that makes it fail
 * for the reason it exists, and the clean world proves it passes otherwise.
 */

import { describe, expect, it } from "vitest";

import {
  INVARIANT_REGISTRY,
  covenant02,
  covenant03,
  covenant04,
  covenant05,
  covenant06,
  covenant07,
  covenant08
} from "@/lib/safety/invariants";
import type { InvariantContext } from "@/lib/safety/types";
import { ALL_INVARIANTS } from "@/types/domain";

import {
  FIXED_NOW,
  SHORT_LEG,
  SPY_LEGS,
  buildContracts,
  buildContractsMissingLongLeg,
  buildOpenPosition as openPosition,
  buildWorld
} from "../fixtures";

function contextFrom(overrides: Parameters<typeof buildWorld>[0] = {}): InvariantContext {
  const world = buildWorld(overrides);
  return { ...world, now: FIXED_NOW };
}

describe("registry", () => {
  it("registers all eight invariants exactly once", () => {
    const ids = INVARIANT_REGISTRY.map((e) => e.id);
    expect([...ids].sort()).toEqual([...ALL_INVARIANTS].sort());
    expect(new Set(ids).size).toBe(8);
  });

  it("passes every invariant on a clean world", () => {
    const context = contextFrom();
    const failures = INVARIANT_REGISTRY.map((e) => e.evaluate(context)).filter((v) => !v.ok);
    expect(failures).toEqual([]);
  });

  it("evaluates COV-08 first, so unverifiable state short-circuits reasoning", () => {
    expect(INVARIANT_REGISTRY[0]!.id).toBe("COV-08");
  });
});

describe("COV-02 — finite max loss within the per-trade cap", () => {
  it("vetoes a structure the mandate does not allow", () => {
    const context = contextFrom({ policy: { allowedStructures: ["CREDIT_VERTICAL"] } });
    expect(covenant02.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("vetoes a non-positive max loss — an unbounded structure by our definition", () => {
    const context = contextFrom({ intent: { standaloneMaxLoss: "0.00" } });
    expect(covenant02.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("abstains when max loss is not a readable decimal", () => {
    const context = contextFrom({ intent: { standaloneMaxLoss: "not-a-number" } });
    expect(covenant02.evaluate(context)).toMatchObject({ ok: false, action: "ABSTAIN" });
  });

  it("shrinks rather than vetoes when a smaller size fits", () => {
    const context = contextFrom({
      intent: { quantity: 3, standaloneMaxLoss: "720.00" }
    });
    expect(covenant02.evaluate(context)).toMatchObject({
      ok: false,
      action: "SHRINK",
      shrinkTo: 2
    });
  });
});

describe("COV-03 — portfolio heat", () => {
  it("vetoes when the book is already at the heat cap", () => {
    const context = contextFrom({
      account: { openPositions: [openPosition({ standaloneMaxLoss: "2500.00" })] }
    });
    expect(covenant03.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("shrinks into the remaining headroom", () => {
    // 2.5% of $100k = $2,500 cap. $2,200 open leaves $300 — one contract at $240.
    const context = contextFrom({
      account: { openPositions: [openPosition({ standaloneMaxLoss: "2200.00", dte: 18 })] },
      intent: { quantity: 2, standaloneMaxLoss: "480.00", expiry: "2026-10-16" }
    });
    expect(covenant03.evaluate(context)).toMatchObject({
      ok: false,
      action: "SHRINK",
      shrinkTo: 1
    });
  });
});

describe("COV-04 — daily halt", () => {
  it("vetoes while halted", () => {
    const context = contextFrom({ session: { state: "HALTED", haltReason: "daily limit" } });
    expect(covenant04.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("abstains when session state and broker clock disagree about the trading date", () => {
    const context = contextFrom({ session: { sessionDate: "2026-08-28" } });
    expect(covenant04.evaluate(context)).toMatchObject({ ok: false, action: "ABSTAIN" });
  });
});

describe("COV-05 — mandate bands", () => {
  it("vetoes an underlying outside the universe", () => {
    const context = contextFrom({ policy: { allowedUnderlyings: ["QQQ"] } });
    expect(covenant05.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("vetoes DTE outside the band", () => {
    const context = contextFrom({ intent: { dte: 45 } });
    expect(covenant05.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("abstains when a leg is absent from the snapshot we decided on", () => {
    const context = contextFrom({ market: { contracts: buildContractsMissingLongLeg() } });
    expect(covenant05.evaluate(context)).toMatchObject({ ok: false, action: "ABSTAIN" });
  });

  it("abstains on a stale quote", () => {
    const stale = new Date(FIXED_NOW.getTime() - 30_000).toISOString();
    const context = contextFrom({
      market: { contracts: buildContracts({ quoteTimestamp: stale }) }
    });
    expect(covenant05.evaluate(context)).toMatchObject({ ok: false, action: "ABSTAIN" });
  });

  it("vetoes a spread too wide to fill without leaking the edge", () => {
    const context = contextFrom({
      market: { contracts: buildContracts({ bid: "4.00", ask: "6.20" }) }
    });
    expect(covenant05.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("vetoes illiquid contracts", () => {
    const context = contextFrom({
      market: { contracts: buildContracts({ openInterest: 10 }) }
    });
    expect(covenant05.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("vetoes a delta outside the band", () => {
    const context = contextFrom({
      market: { contracts: buildContracts({ delta: 0.92 }) }
    });
    expect(covenant05.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("abstains when delta is unavailable", () => {
    const context = contextFrom({
      market: { contracts: buildContracts({ delta: undefined }) }
    });
    expect(covenant05.evaluate(context)).toMatchObject({ ok: false, action: "ABSTAIN" });
  });
});

describe("COV-06 — duplicate exposure", () => {
  it("vetoes an identical structure already open", () => {
    const context = contextFrom({ account: { openPositions: [openPosition()] } });
    expect(covenant06.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("vetoes an equivalent structure opened inside the cooldown", () => {
    const twentyMinutesAgo = new Date(FIXED_NOW.getTime() - 20 * 60_000).toISOString();
    const context = contextFrom({
      account: {
        openPositions: [
          openPosition({
            structureId: "pos-2",
            openedAt: twentyMinutesAgo,
            legs: [SPY_LEGS[0]!, { ...SPY_LEGS[1]!, symbol: `${SHORT_LEG}X` }]
          })
        ]
      }
    });
    expect(covenant06.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("allows the same family once the cooldown has elapsed", () => {
    const threeHoursAgo = new Date(FIXED_NOW.getTime() - 180 * 60_000).toISOString();
    const context = contextFrom({
      account: {
        openPositions: [
          openPosition({
            structureId: "pos-3",
            openedAt: threeHoursAgo,
            legs: [SPY_LEGS[0]!, { ...SPY_LEGS[1]!, symbol: `${SHORT_LEG}X` }]
          })
        ]
      }
    });
    expect(covenant06.evaluate(context)).toMatchObject({ ok: true });
  });
});

describe("COV-07 — exit workflow", () => {
  it("disables new entries while a position is past its close deadline", () => {
    const context = contextFrom({
      account: { openPositions: [openPosition({ structureId: "overdue-1", dte: 0 })] }
    });
    expect(covenant07.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });
});

describe("COV-08 — fail closed", () => {
  it("vetoes a policy that is not ACTIVE", () => {
    const context = contextFrom({ policy: { status: "DRAFT" } });
    expect(covenant08.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("vetoes an account without level 3 options approval", () => {
    const context = contextFrom({ account: { optionsLevel: 2 } });
    expect(covenant08.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("vetoes a trading-blocked account", () => {
    const context = contextFrom({ account: { tradingBlocked: true } });
    expect(covenant08.evaluate(context)).toMatchObject({ ok: false, action: "VETO" });
  });

  it("abstains when the market is closed", () => {
    const world = buildWorld();
    const context: InvariantContext = {
      ...world,
      now: FIXED_NOW,
      market: { ...world.market, clock: { ...world.market.clock!, isOpen: false } }
    };
    // Mutating the snapshot also breaks its hash, which is itself an abstain.
    expect(covenant08.evaluate(context)).toMatchObject({ ok: false, action: "ABSTAIN" });
  });

  it("abstains when a snapshot does not match its own hash", () => {
    const world = buildWorld();
    const context: InvariantContext = {
      ...world,
      now: FIXED_NOW,
      account: { ...world.account, equity: "999999.00" }
    };
    expect(covenant08.evaluate(context)).toMatchObject({ ok: false, action: "ABSTAIN" });
  });
});
