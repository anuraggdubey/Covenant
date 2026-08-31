/**
 * Proof surface tests — Lane B, T-B5 and T-B9.
 *
 * A hash chain that nobody has tried to break is a decoration. Each test here
 * tampers with the manifest the way someone hiding an inconvenient decision
 * actually would — edit a payload, drop an event, swap a permit, rewrite the
 * recorded verdict — and asserts the verifier catches it and names the event.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { EventJournal, verifyChain } from "@/lib/audit/journal";
import { buildDemoRun } from "@/lib/audit/demo-run";
import { verifyManifest } from "@/lib/audit/verify";
import type { CovenantEvent, RunManifest } from "@/types/domain";

import { testKeyPair } from "../fixtures";

const FIXED = new Date("2026-08-31T14:30:00.000Z");

function journalWithThree(): EventJournal {
  const journal = new EventJournal({ codeRevision: "test", clock: () => FIXED });
  journal.append("POLICY_ACTIVATED", { policy: "p1" });
  journal.append("TRADE_INTENT_CREATED", { intent: "i1" });
  journal.append("KERNEL_ABSTAINED", { reason: "stale quote" });
  return journal;
}

describe("event journal", () => {
  it("chains each event to the one before it", () => {
    const events = journalWithThree().all();

    expect(events).toHaveLength(3);
    expect(events[0]!.previousEventHash).toBeNull();
    expect(events[1]!.previousEventHash).toBe(events[0]!.eventHash);
    expect(events[2]!.previousEventHash).toBe(events[1]!.eventHash);
    expect(verifyChain(events)).toEqual([]);
  });

  it("catches an edited payload and names the event", () => {
    const events = [...journalWithThree().all()];
    events[1] = { ...events[1]!, payload: { intent: "something-else" } };

    const failures = verifyChain(events);

    expect(failures.some((f) => f.eventId === "evt-0002")).toBe(true);
    expect(failures[0]!.reason).toMatch(/payloadHash/);
  });

  it("catches a deleted event — the link to it goes missing", () => {
    const all = [...journalWithThree().all()];
    const withHole: CovenantEvent[] = [all[0]!, all[2]!];

    expect(verifyChain(withHole).length).toBeGreaterThan(0);
  });

  it("catches a reordered chain", () => {
    const all = [...journalWithThree().all()];
    const swapped: CovenantEvent[] = [all[0]!, all[2]!, all[1]!];

    expect(verifyChain(swapped).length).toBeGreaterThan(0);
  });
});

describe("run manifest verification", () => {
  it("verifies a freshly built demo run", async () => {
    const { privateKeyPem } = testKeyPair();
    const report = verifyManifest(await buildDemoRun(privateKeyPem));

    expect(report.ok).toBe(true);
    expect(report.counts.failed).toBe(0);
    // Both labels must be present: recorded facts AND reproduced checks.
    expect(report.counts.recorded).toBeGreaterThan(0);
    expect(report.counts.reproduced).toBeGreaterThan(0);
  });

  it("verifies the manifest committed to the repository", () => {
    const path = resolve(process.cwd(), "demo/run_manifest.json");
    const manifest = JSON.parse(readFileSync(path, "utf8")) as RunManifest;

    const report = verifyManifest(manifest);

    expect(report.ok).toBe(true);
    expect(manifest.publicKeyPem).toContain("BEGIN PUBLIC KEY");
    // The manifest must never carry the half that could mint a new permit.
    expect(JSON.stringify(manifest)).not.toContain("PRIVATE KEY");
  });

  it("records both an approval and a refusal — not only the wins", async () => {
    const { privateKeyPem } = testKeyPair();
    const manifest = await buildDemoRun(privateKeyPem);

    const types = manifest.events.map((e) => e.eventType);
    expect(types).toContain("ORDER_SUBMITTED");
    expect(types).toContain("KERNEL_REJECTED");
    expect(types).toContain("PERMIT_REPLAY_REJECTED");
  });

  it("fails when a permit signature is swapped for another key's", async () => {
    const { privateKeyPem } = testKeyPair();
    const other = testKeyPair();
    const manifest = await buildDemoRun(privateKeyPem);

    const forged: RunManifest = { ...manifest, publicKeyPem: other.publicKeyPem };
    const report = verifyManifest(forged);

    expect(report.ok).toBe(false);
    expect(report.checks.some((c) => c.id === "permit.signature" && !c.ok)).toBe(true);
  });

  it("fails when a recorded verdict is rewritten to hide a veto", async () => {
    const { privateKeyPem } = testKeyPair();
    const manifest = await buildDemoRun(privateKeyPem);

    // Someone edits the halted-session rejection to look like a clean pass.
    const events = manifest.events.map((event) =>
      event.eventType === "KERNEL_REJECTED"
        ? {
            ...event,
            payload: {
              ...(event.payload as Record<string, unknown>),
              failedInvariants: [],
              decision: "APPROVE"
            }
          }
        : event
    );

    const report = verifyManifest({ ...manifest, events });

    expect(report.ok).toBe(false);
    // Two independent checks catch it: the payload hash, and re-running COV-04.
    expect(report.checks.some((c) => c.id === "chain.integrity" && !c.ok)).toBe(true);
    expect(report.checks.some((c) => c.id === "invariants.reproduce" && !c.ok)).toBe(true);
  });

  it("fails when a submitted order no longer matches its permit", async () => {
    const { privateKeyPem } = testKeyPair();
    const manifest = await buildDemoRun(privateKeyPem);

    const events = manifest.events.map((event) => {
      if (event.eventType !== "ORDER_SUBMITTED") return event;
      const payload = event.payload as { order: { qty: string; legs: { symbol: string }[] } };
      return {
        ...event,
        payload: {
          ...payload,
          order: { ...payload.order, legs: [{ symbol: "SPY260918C00500000" }, payload.order.legs[1]! ] }
        }
      };
    });

    const report = verifyManifest({ ...manifest, events });

    expect(report.ok).toBe(false);
    expect(report.checks.some((c) => c.id === "order.matches-permit" && !c.ok)).toBe(true);
  });
});
