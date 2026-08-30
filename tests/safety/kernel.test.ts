/**
 * Safety Kernel behaviour — Lane B.
 *
 * The end-to-end test in this file is the one that matters most: a permit the
 * KERNEL issued, submitted through the REAL executor, reaching a transport.
 * Every other test in the suite proves something is refused; this one proves
 * the system can still trade. A gate that never opens is not a gate either.
 */

import { describe, expect, it } from "vitest";

import { submit } from "@/lib/execution/executor";
import { InMemoryNonceStore } from "@/lib/permits/nonce";
import { verifyPermitSignature } from "@/lib/permits/verify";
import { evaluate, shrinkIntent } from "@/lib/safety/kernel";
import * as money from "@/lib/money";
import {
  FIXED_NOW,
  SpyTransport,
  buildIntent,
  buildWorld,
  testKeyPair
} from "../fixtures";

function kernelOptions(world: ReturnType<typeof buildWorld>, keys: ReturnType<typeof testKeyPair>) {
  return {
    account: world.account,
    market: world.market,
    session: world.session,
    now: FIXED_NOW,
    nonceStore: new InMemoryNonceStore(),
    privateKeyPem: keys.privateKeyPem,
    ttlSeconds: 60
  };
}

describe("Safety Kernel — approval path", () => {
  it("approves a clean intent and issues a permit bound to it", async () => {
    const world = buildWorld();
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, kernelOptions(world, keys));

    expect(result.decision).toBe("APPROVE");
    expect(result.failedInvariants).toEqual([]);
    expect(result.permit).toBeDefined();
    expect(result.permit!.intentHash).toBe(world.intent.intentHash);
    expect(result.permit!.maxQuantity).toBe(world.intent.quantity);
    expect(verifyPermitSignature(result.permit!, { publicKeyPem: keys.publicKeyPem })).toEqual({
      ok: true
    });
  });

  it("registers the nonce it issued, so the executor will accept it exactly once", async () => {
    const world = buildWorld();
    const keys = testKeyPair();
    const nonceStore = new InMemoryNonceStore();

    const result = await evaluate(world.intent, world.policy, {
      ...kernelOptions(world, keys),
      nonceStore
    });

    expect(await nonceStore.state(result.permit!.nonce)).toBe("UNUSED");
  });

  it("end to end: kernel permit -> executor -> broker call, exactly once", async () => {
    const world = buildWorld();
    const keys = testKeyPair();
    const nonceStore = new InMemoryNonceStore();
    const transport = new SpyTransport();

    const decision = await evaluate(world.intent, world.policy, {
      ...kernelOptions(world, keys),
      nonceStore
    });
    expect(decision.decision).toBe("APPROVE");

    const submitted = await submit(decision.permit, decision.finalIntent!, {
      transport,
      nonceStore,
      activePolicy: world.policy,
      publicKeyPem: keys.publicKeyPem,
      now: FIXED_NOW
    });

    expect("orderId" in submitted).toBe(true);
    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0]!.legs).toHaveLength(2);
  });
});

describe("Safety Kernel — shrink never widens", () => {
  it("shrinks an oversized intent to the largest size the per-trade cap allows", async () => {
    // 3 contracts x $240 = $720 against a 0.6% cap on $100k equity = $600.
    const world = buildWorld({
      intent: { quantity: 3, standaloneMaxLoss: "720.00", portfolioHeatAfterTrade: "720.00" }
    });
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, kernelOptions(world, keys));

    expect(result.decision).toBe("SHRINK");
    expect(result.shrunkQuantity).toBe(2);
    expect(result.failedInvariants).toContain("COV-02");
    expect(result.permit!.maxQuantity).toBe(2);
    expect(result.finalIntent!.quantity).toBe(2);
    expect(result.finalIntent!.standaloneMaxLoss).toBe("480.00");
  });

  it("binds the permit to the shrunk intent, not the original", async () => {
    const world = buildWorld({
      intent: { quantity: 3, standaloneMaxLoss: "720.00", portfolioHeatAfterTrade: "720.00" }
    });
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, kernelOptions(world, keys));

    expect(result.permit!.intentHash).toBe(result.finalIntent!.intentHash);
    expect(result.permit!.intentHash).not.toBe(world.intent.intentHash);
  });

  it("the executor rejects the ORIGINAL intent once a shrink has happened", async () => {
    const world = buildWorld({
      intent: { quantity: 3, standaloneMaxLoss: "720.00", portfolioHeatAfterTrade: "720.00" }
    });
    const keys = testKeyPair();
    const nonceStore = new InMemoryNonceStore();
    const transport = new SpyTransport();

    const decision = await evaluate(world.intent, world.policy, {
      ...kernelOptions(world, keys),
      nonceStore
    });

    // The agent tries to use the shrink's permit with its original 3-lot intent.
    const result = await submit(decision.permit, world.intent, {
      transport,
      nonceStore,
      publicKeyPem: keys.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result).toMatchObject({ rejected: true, code: "INTENT_HASH_MISMATCH" });
    expect(transport.calls).toHaveLength(0);
  });

  it("shrinkIntent refuses to widen or to no-op", () => {
    const world = buildWorld({ intent: { quantity: 2, standaloneMaxLoss: "480.00" } });
    expect(() => shrinkIntent(world.intent, 3)).toThrow(/only ever reduce/);
    expect(() => shrinkIntent(world.intent, 2)).toThrow(/only ever reduce/);
    expect(() => shrinkIntent(world.intent, 0)).toThrow(/only ever reduce/);
  });

  it("vetoes rather than shrinking when even one contract breaches the cap", async () => {
    // A 0.1% cap on $100k is $100; one contract risks $240.
    const world = buildWorld({ policy: { perTradeMaxLossPct: 0.1 } });
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, kernelOptions(world, keys));

    expect(result.decision).toBe("VETO");
    expect(result.permit).toBeUndefined();
  });
});

describe("Safety Kernel — refusals issue no permit", () => {
  it("vetoes every entry while the session is halted (COV-04)", async () => {
    const world = buildWorld({
      session: { state: "HALTED", haltedAt: FIXED_NOW.toISOString(), haltReason: "daily limit" }
    });
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, kernelOptions(world, keys));

    expect(result.decision).toBe("VETO");
    expect(result.failedInvariants).toContain("COV-04");
    expect(result.permit).toBeUndefined();
  });

  it("vetoes when the day's loss has breached the mandate limit (COV-04)", async () => {
    const world = buildWorld({ account: { dayPnl: "-1400.00", dayPnlPct: -1.4 } });
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, kernelOptions(world, keys));

    expect(result.decision).toBe("VETO");
    expect(result.failedInvariants).toContain("COV-04");
  });

  it("abstains when the market snapshot is not the one the intent was built on (COV-08)", async () => {
    const world = buildWorld();
    const keys = testKeyPair();
    const staleIntent = buildIntent(world.policy, world.account, world.market, {
      marketSnapshotHash: "a-different-snapshot"
    });

    const result = await evaluate(staleIntent, world.policy, kernelOptions(world, keys));

    expect(result.decision).toBe("ABSTAIN");
    expect(result.failedInvariants).toContain("COV-08");
    expect(result.permit).toBeUndefined();
  });

  it("abstains on a stale intent (COV-08)", async () => {
    const world = buildWorld();
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, {
      ...kernelOptions(world, keys),
      now: new Date(FIXED_NOW.getTime() + 120_000)
    });

    expect(result.decision).toBe("ABSTAIN");
  });

  it("vetoes a model that tried to widen its own confidence (COV-08)", async () => {
    const world = buildWorld();
    const keys = testKeyPair();
    const greedy = buildIntent(world.policy, world.account, world.market, {
      modelConfidenceMultiplier: 1.4
    });

    const result = await evaluate(greedy, world.policy, kernelOptions(world, keys));

    expect(result.decision).toBe("VETO");
    expect(result.reason).toMatch(/only shrink/);
  });

  it("abstains when it has no state to evaluate at all", async () => {
    const world = buildWorld();
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, {
      session: world.session,
      now: FIXED_NOW,
      privateKeyPem: keys.privateKeyPem
    });

    expect(result.decision).toBe("ABSTAIN");
    expect(result.failedInvariants).toContain("COV-08");
  });

  it("abstains when re-fetching state throws", async () => {
    const world = buildWorld();
    const keys = testKeyPair();

    const result = await evaluate(world.intent, world.policy, {
      ...kernelOptions(world, keys),
      stateProvider: {
        fetchAccount: async () => {
          throw new Error("alpaca unreachable");
        },
        fetchMarket: async () => world.market
      }
    });

    expect(result.decision).toBe("ABSTAIN");
  });
});

describe("money", () => {
  it("computes a percentage cap exactly", () => {
    expect(money.format(money.pctOf(money.parse("100000.00"), 0.6))).toBe("600.00");
    expect(money.format(money.pctOf(money.parse("100000.00"), 2.5))).toBe("2500.00");
  });

  it("round-trips decimal strings without float drift", () => {
    expect(money.format(money.parse("0.10") + money.parse("0.20"))).toBe("0.30");
  });

  it("refuses values it cannot represent exactly", () => {
    expect(() => money.parse("1.2345678")).toThrow();
    expect(() => money.parse("abc")).toThrow();
  });
});
