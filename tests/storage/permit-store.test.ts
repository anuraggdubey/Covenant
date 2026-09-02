/**
 * The in-memory permit store is the path a judge hits.
 *
 * With no DATABASE_URL the console must still sign, expire and single-use a
 * permit exactly as Postgres would. These tests pin the semantics that
 * matter, because "it works on the machine with the database" is not a claim
 * we get to make about a fresh clone.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  InMemoryPermitStore,
  permitStorageMode,
  resetPermitStoreForTests
} from "@/lib/storage/permit-store";
import type { PreparedTrade } from "@/lib/permits/console-types";
import type { Policy, TradeIntent, TradePermit } from "@/types/domain";

import { buildWorld, permitClaimsFor, testKeyPair } from "../fixtures";
import { signPermit } from "@/lib/permits/sign";

function permitFor(ttlSeconds: number, now = new Date()): {
  permit: TradePermit;
  intent: TradeIntent;
  policy: Policy;
} {
  const { privateKeyPem } = testKeyPair();
  const world = buildWorld();
  const permit = signPermit(permitClaimsFor(world.intent, world.policy), {
    privateKeyPem,
    now,
    ttlSeconds
  });
  return { permit, intent: world.intent, policy: world.policy };
}

afterEach(() => {
  resetPermitStoreForTests();
});

describe("storage mode selection", () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it("falls back to memory when no database is configured", () => {
    delete process.env.DATABASE_URL;
    expect(permitStorageMode()).toBe("memory");
  });

  it("treats the .env.example placeholder as unconfigured", () => {
    process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/covenant";
    expect(permitStorageMode()).toBe("memory");
  });

  it("uses postgres when a real url is present", () => {
    process.env.DATABASE_URL = "postgresql://EXAMPLE_USER:EXAMPLE_PASSWORD@ep-example.neon.tech/covenant";
    expect(permitStorageMode()).toBe("postgres");
  });
});

describe("in-memory permit lifecycle", () => {
  it("stores a signed permit and lists it", async () => {
    const store = new InMemoryPermitStore();
    const { permit, intent, policy } = permitFor(60);

    await store.savePermit(permit, intent, policy);
    const listed = await store.list();

    expect(listed).toHaveLength(1);
    expect(listed[0]!.permitId).toBe(permit.permitId);
    expect(listed[0]!.lifecycle).toBe("SIGNED");
    expect(listed[0]!.execution).toBe("HELD");
  });

  it("reports a permit past its TTL as EXPIRED without being touched", async () => {
    const store = new InMemoryPermitStore();
    const past = new Date(Date.now() - 120_000);
    const { permit, intent, policy } = permitFor(60, past);

    await store.savePermit(permit, intent, policy);

    expect((await store.list())[0]!.lifecycle).toBe("EXPIRED");
  });

  it("consumes a nonce exactly once", async () => {
    const store = new InMemoryPermitStore();
    const { permit, intent, policy } = permitFor(60);
    await store.savePermit(permit, intent, policy);

    expect(await store.state(permit.nonce)).toBe("UNUSED");
    expect(await store.consume(permit.nonce)).toBe("CONSUMED");
    expect(await store.consume(permit.nonce)).toBe("ALREADY_USED");
    expect(await store.state(permit.nonce)).toBe("USED");
    expect((await store.list())[0]!.lifecycle).toBe("USED");
  });

  it("refuses a nonce it never issued", async () => {
    const store = new InMemoryPermitStore();
    expect(await store.state("covenant-paper:never-seen")).toBe("UNKNOWN");
    expect(await store.consume("covenant-paper:never-seen")).toBe("UNKNOWN");
  });

  it("refuses to consume an expired permit", async () => {
    const store = new InMemoryPermitStore();
    const past = new Date(Date.now() - 120_000);
    const { permit, intent, policy } = permitFor(60, past);
    await store.savePermit(permit, intent, policy);

    // Unused, but the window has closed. Authority is not durable.
    expect(await store.consume(permit.nonce)).toBe("ALREADY_USED");
  });

  it("records a broker outcome against the permit", async () => {
    const store = new InMemoryPermitStore();
    const { permit, intent, policy } = permitFor(60);
    await store.savePermit(permit, intent, policy);

    await store.recordExecution(permit.permitId, "SUBMITTED", {
      orderId: "paper-1",
      requestId: "req-1"
    });

    const detail = await store.getPermit(permit.permitId);
    expect(detail?.execution).toBe("SUBMITTED");
    expect(detail?.orderId).toBe("paper-1");
    expect(detail?.rejectionCode).toBeNull();
  });

  it("round-trips a draft and marks it signed", async () => {
    const store = new InMemoryPermitStore();
    const world = buildWorld();
    const draft: PreparedTrade = {
      draftId: "draft-1",
      status: "READY",
      symbol: "SPY",
      intent: world.intent,
      policy: {
        id: world.policy.id,
        version: world.policy.version,
        policyHash: world.policy.policyHash,
        plainEnglishEcho: world.policy.plainEnglishEcho
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    };

    await store.saveDraft(draft, "material-hash");
    expect((await store.getDraft("draft-1"))?.materialHash).toBe("material-hash");

    await store.markDraft("draft-1", "SIGNED");
    expect((await store.getDraft("draft-1"))?.draft.status).toBe("SIGNED");
    expect(await store.getDraft("missing")).toBeNull();
  });
});
