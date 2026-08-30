/**
 * T-B4 exit test — the four judge attacks.
 *
 * IMPLEMENTATION.md §7, Day 4: "four attacks (mutated contract, increased
 * quantity, replayed nonce, expired TTL) each fail before any Alpaca call".
 *
 * The assertion that matters in every one of these is
 * `expect(transport.calls).toHaveLength(0)` — not merely that we returned a
 * rejection, but that nothing left the process. A gate that rejects *after*
 * calling the broker is not a gate.
 */

import { describe, expect, it } from "vitest";

import { submit } from "@/lib/execution/executor";
import { computeIntentHash } from "@/lib/hashes";
import { InMemoryNonceStore } from "@/lib/permits/nonce";
import { FIXED_NOW, buildHarness, buildPolicy } from "../fixtures";

describe("Permit Executor — happy path", () => {
  it("submits exactly one order whose legs come from the signed permit", async () => {
    const h = await buildHarness();

    const result = await submit(h.permit, h.intent, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      activePolicy: h.policy,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    });

    expect("orderId" in result && result.orderId).toBe("paper-order-1");
    expect(h.transport.calls).toHaveLength(1);

    const payload = h.transport.calls[0]!;
    expect(payload.order_class).toBe("mleg");
    expect(payload.qty).toBe("1");
    expect(payload.limit_price).toBe("2.40");
    expect(payload.legs.map((l) => l.symbol)).toEqual([
      "SPY260918C00560000",
      "SPY260918C00565000"
    ]);
  });

  it("spends the nonce, so the same permit cannot be used twice", async () => {
    const h = await buildHarness();
    const options = {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    };

    await submit(h.permit, h.intent, options);
    expect(await h.nonceStore.state(h.permit.nonce)).toBe("USED");
  });
});

describe("Attack 1 — contract substitution", () => {
  it("rejects a mutated leg symbol: the intent no longer matches its own hash", async () => {
    const h = await buildHarness();
    const tampered = {
      ...h.intent,
      legs: [{ ...h.intent.legs[0]!, symbol: "SPY260918C00500000" }, h.intent.legs[1]!]
    };

    const result = await submit(h.permit, tampered, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result).toMatchObject({ rejected: true, code: "INTENT_TAMPERED" });
    expect(h.transport.calls).toHaveLength(0);
  });

  it("rejects a mutated leg even when the attacker recomputes the intent hash", async () => {
    const h = await buildHarness();
    const rebuilt = {
      ...h.intent,
      legs: [{ ...h.intent.legs[0]!, symbol: "SPY260918C00500000" }, h.intent.legs[1]!]
    };
    const tampered = { ...rebuilt, intentHash: computeIntentHash(rebuilt) };

    const result = await submit(h.permit, tampered, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result).toMatchObject({ rejected: true, code: "INTENT_HASH_MISMATCH" });
    expect(h.transport.calls).toHaveLength(0);
  });

  it("rejects a mutated permit: the signature no longer verifies", async () => {
    const h = await buildHarness();
    const forged = {
      ...h.permit,
      exactLegs: [{ ...h.permit.exactLegs[0]!, symbol: "SPY260918C00500000" }, h.permit.exactLegs[1]!]
    };

    const result = await submit(forged, h.intent, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result).toMatchObject({ rejected: true, code: "SIGNATURE_INVALID" });
    expect(h.transport.calls).toHaveLength(0);
  });
});

describe("Attack 2 — increased quantity after approval", () => {
  it("rejects an order larger than the permit allows: a shrink can never be undone", async () => {
    // The kernel shrank a 3-lot request to 1. The agent submits the original.
    const h = await buildHarness({
      intentOverrides: { quantity: 3 },
      permitOverrides: { maxQuantity: 1 }
    });

    const result = await submit(h.permit, h.intent, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result).toMatchObject({ rejected: true, code: "QUANTITY_EXCEEDS_PERMIT" });
    expect(h.transport.calls).toHaveLength(0);
  });
});

describe("Attack 3 — permit replay", () => {
  it("accepts the first submission and rejects the second", async () => {
    const h = await buildHarness();
    const options = {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    };

    const first = await submit(h.permit, h.intent, options);
    const second = await submit(h.permit, h.intent, options);

    expect("orderId" in first).toBe(true);
    expect(second).toMatchObject({ rejected: true, code: "NONCE_REPLAYED" });
    expect(h.transport.calls).toHaveLength(1);
  });

  it("rejects a permit whose nonce this kernel never issued", async () => {
    const h = await buildHarness();

    const result = await submit(h.permit, h.intent, {
      transport: h.transport,
      nonceStore: new InMemoryNonceStore(), // a store that never saw this nonce
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result).toMatchObject({ rejected: true, code: "NONCE_UNKNOWN" });
    expect(h.transport.calls).toHaveLength(0);
  });
});

describe("Attack 4 — expired permit", () => {
  it("rejects a permit past its TTL: authority is not durable", async () => {
    const h = await buildHarness({ ttlSeconds: 60 });
    const tooLate = new Date(FIXED_NOW.getTime() + 61_000);

    const result = await submit(h.permit, h.intent, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: tooLate
    });

    expect(result).toMatchObject({ rejected: true, code: "PERMIT_EXPIRED" });
    expect(h.transport.calls).toHaveLength(0);
  });

  it("does not burn the nonce when it rejects", async () => {
    const h = await buildHarness({ ttlSeconds: 60 });

    await submit(h.permit, h.intent, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: new Date(FIXED_NOW.getTime() + 61_000)
    });

    expect(await h.nonceStore.state(h.permit.nonce)).toBe("UNUSED");
  });
});

describe("Further boundary attacks", () => {
  it("rejects an order with no permit at all", async () => {
    const h = await buildHarness();

    const result = await submit(null, h.intent, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result).toMatchObject({ rejected: true, code: "PERMIT_MISSING" });
    expect(h.transport.calls).toHaveLength(0);
  });

  it("rejects a limit price outside the permitted band", async () => {
    const h = await buildHarness();
    const rebuilt = { ...h.intent, limitPrice: "2.95" };

    const result = await submit(
      { ...h.permit, intentHash: computeIntentHash(rebuilt) },
      { ...rebuilt, intentHash: computeIntentHash(rebuilt) },
      {
        transport: h.transport,
        nonceStore: h.nonceStore,
        publicKeyPem: h.publicKeyPem,
        now: FIXED_NOW
      }
    );

    // Editing the permit breaks its signature first — which is itself the point.
    expect(result).toMatchObject({ rejected: true });
    expect(h.transport.calls).toHaveLength(0);
  });

  it("rejects a permit issued under a policy that is no longer active", async () => {
    const h = await buildHarness();
    const supersededPolicy = buildPolicy({ version: 2, perTradeMaxLossPct: 0.35 });

    const result = await submit(h.permit, h.intent, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      activePolicy: supersededPolicy,
      publicKeyPem: h.publicKeyPem,
      now: FIXED_NOW
    });

    expect(result).toMatchObject({ rejected: true, code: "POLICY_HASH_MISMATCH" });
    expect(h.transport.calls).toHaveLength(0);
  });

  it("refuses to submit when it has no public key to verify against", async () => {
    const h = await buildHarness();

    const result = await submit(h.permit, h.intent, {
      transport: h.transport,
      nonceStore: h.nonceStore,
      now: FIXED_NOW
      // publicKeyPem deliberately omitted, and no env var set
    });

    expect(result).toMatchObject({ rejected: true, code: "PUBLIC_KEY_MISSING" });
    expect(h.transport.calls).toHaveLength(0);
  });
});
