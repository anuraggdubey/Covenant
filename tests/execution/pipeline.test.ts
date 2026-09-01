/**
 * The seam: proposal -> kernel -> permit -> executor.
 *
 * These tests exist because both halves of Covenant passed their own tests
 * for days while not being connected to each other. The interesting failures
 * live exactly here, at the join.
 */

import { describe, expect, it } from "vitest";

import { EventJournal, verifyChain } from "@/lib/audit/journal";
import { governIntent } from "@/lib/execution/pipeline";
import { InMemoryNonceStore } from "@/lib/permits/nonce";
import { verifyPermitSignature } from "@/lib/permits/verify";

import { FIXED_NOW, SpyTransport, buildWorld, testKeyPair } from "../fixtures";

function harness(overrides: Parameters<typeof buildWorld>[0] = {}) {
  const world = buildWorld(overrides);
  const keys = testKeyPair();
  return {
    world,
    keys,
    journal: new EventJournal({ codeRevision: "test", clock: () => FIXED_NOW }),
    nonceStore: new InMemoryNonceStore(),
    transport: new SpyTransport()
  };
}

describe("governIntent — approval", () => {
  it("issues a signed permit but does not submit when submission is opt-in", async () => {
    const h = harness();

    const result = await governIntent(h.world.intent, h.world.policy, {
      account: h.world.account,
      market: h.world.market,
      session: h.world.session,
      journal: h.journal,
      nonceStore: h.nonceStore,
      submit: false,
      transport: h.transport,
      privateKeyPem: h.keys.privateKeyPem,
      publicKeyPem: h.keys.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result.decision).toBe("APPROVE");
    expect(result.permit).toBeDefined();
    expect(result.heldForOperator).toBe(true);
    expect(result.execution).toBeUndefined();
    // The permit is real, not a placeholder — it verifies.
    expect(verifyPermitSignature(result.permit!, { publicKeyPem: h.keys.publicKeyPem })).toEqual({
      ok: true
    });
    // Nothing reached the broker.
    expect(h.transport.calls).toHaveLength(0);
  });

  it("submits exactly one order when submission is enabled", async () => {
    const h = harness();

    const result = await governIntent(h.world.intent, h.world.policy, {
      account: h.world.account,
      market: h.world.market,
      session: h.world.session,
      journal: h.journal,
      nonceStore: h.nonceStore,
      submit: true,
      transport: h.transport,
      privateKeyPem: h.keys.privateKeyPem,
      publicKeyPem: h.keys.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result.execution).toEqual({
      submitted: true,
      orderId: "paper-order-1",
      requestId: "req-1"
    });
    expect(h.transport.calls).toHaveLength(1);
    expect(h.journal.find("ORDER_SUBMITTED")).toBeDefined();
    expect(h.journal.find("ORDER_ACCEPTED")).toBeDefined();
  });

  it("writes a chain that verifies", async () => {
    const h = harness();

    await governIntent(h.world.intent, h.world.policy, {
      account: h.world.account,
      market: h.world.market,
      session: h.world.session,
      journal: h.journal,
      nonceStore: h.nonceStore,
      submit: true,
      transport: h.transport,
      privateKeyPem: h.keys.privateKeyPem,
      publicKeyPem: h.keys.publicKeyPem,
      now: FIXED_NOW
    });

    expect(verifyChain(h.journal.all())).toEqual([]);
  });
});

describe("governIntent — refusal", () => {
  it("records a veto and issues no permit", async () => {
    const h = harness({
      session: { state: "HALTED", haltedAt: FIXED_NOW.toISOString(), haltReason: "daily limit" }
    });

    const result = await governIntent(h.world.intent, h.world.policy, {
      account: h.world.account,
      market: h.world.market,
      session: h.world.session,
      journal: h.journal,
      nonceStore: h.nonceStore,
      submit: true,
      transport: h.transport,
      privateKeyPem: h.keys.privateKeyPem,
      publicKeyPem: h.keys.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result.decision).toBe("VETO");
    expect(result.permit).toBeUndefined();
    expect(result.failedInvariants).toContain("COV-04");
    expect(h.journal.find("KERNEL_REJECTED")).toBeDefined();
    expect(h.journal.find("PERMIT_SIGNED")).toBeUndefined();
    expect(h.transport.calls).toHaveLength(0);
  });

  it("abstains rather than throwing when the kernel cannot sign", async () => {
    const h = harness();

    // No signing key anywhere: the tick must decline one trade, not crash.
    const previous = process.env.PERMIT_SIGNING_PRIVATE_KEY;
    delete process.env.PERMIT_SIGNING_PRIVATE_KEY;
    try {
      const result = await governIntent(h.world.intent, h.world.policy, {
        account: h.world.account,
        market: h.world.market,
        session: h.world.session,
        journal: h.journal,
        nonceStore: h.nonceStore,
        submit: true,
        transport: h.transport,
        now: FIXED_NOW
      });

      expect(result.decision).toBe("ABSTAIN");
      expect(result.failedInvariants).toContain("COV-08");
      expect(result.reason).toMatch(/PERMIT_SIGNING_PRIVATE_KEY/);
      expect(h.transport.calls).toHaveLength(0);
    } finally {
      if (previous !== undefined) process.env.PERMIT_SIGNING_PRIVATE_KEY = previous;
    }
  });

  it("shrinks and binds the permit to the smaller intent", async () => {
    const h = harness({
      intent: { quantity: 3, standaloneMaxLoss: "720.00", portfolioHeatAfterTrade: "720.00" }
    });

    const result = await governIntent(h.world.intent, h.world.policy, {
      account: h.world.account,
      market: h.world.market,
      session: h.world.session,
      journal: h.journal,
      nonceStore: h.nonceStore,
      submit: true,
      transport: h.transport,
      privateKeyPem: h.keys.privateKeyPem,
      publicKeyPem: h.keys.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result.decision).toBe("SHRINK");
    expect(result.shrunkQuantity).toBe(2);
    expect(h.transport.calls[0]!.qty).toBe("2");
    expect(h.journal.find("MODEL_SHRANK")).toBeDefined();
  });
});

describe("governIntent — unit guard", () => {
  it("refuses a policy whose risk limits arrived in fraction units", async () => {
    const h = harness({
      // 0.006 means 0.6% to Lane C, but Policy expresses percent. Sized as a
      // percent this is a $6 cap on $100k; sized the other way, 100x too big.
      policy: { perTradeMaxLossPct: 0.006, portfolioHeatMaxLossPct: 0.025 }
    });

    await expect(
      governIntent(h.world.intent, h.world.policy, {
        account: h.world.account,
        market: h.world.market,
        session: h.world.session,
        journal: h.journal,
        nonceStore: h.nonceStore,
        submit: false,
        privateKeyPem: h.keys.privateKeyPem,
        now: FIXED_NOW
      })
    ).rejects.toThrow(/PERCENT/);
  });
});
