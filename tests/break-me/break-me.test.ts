/**
 * Break Me Engine — T-B8.
 *
 * The suite that attacks the invariants, and the tests that check the suite is
 * actually attacking them. Coverage is the point: an invariant that never
 * fires across hundreds of generated hostile states has not been shown to
 * work, and `mayActivate` refuses to let a policy go live on that basis.
 */

import { describe, expect, it } from "vitest";

import { applyAttack, mayActivate, runBreakMe } from "@/lib/break-me";
import { INVARIANT_REGISTRY } from "@/lib/safety/invariants";
import { FIXED_NOW, buildWorld } from "../fixtures";

const worldFactory = () => ({ ...buildWorld(), now: FIXED_NOW });
const policyHash = buildWorld().policy.policyHash;

describe("Break Me", () => {
  it("finds no counterexample against the current kernel", () => {
    const report = runBreakMe(worldFactory, policyHash, { seed: 20260830, runs: 300 });

    expect(report.counterexamples).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("exercises every one of the eight invariants", () => {
    const report = runBreakMe(worldFactory, policyHash, { seed: 20260830, runs: 300 });

    const uncovered = report.coverage.filter((row) => !row.covered).map((row) => row.invariant);
    expect(uncovered).toEqual([]);
    expect(report.fullyCovered).toBe(true);
    expect(report.coverage).toHaveLength(INVARIANT_REGISTRY.length);
  });

  it("pins the report to a policy hash and code revision", () => {
    const report = runBreakMe(worldFactory, policyHash, { seed: 20260830, runs: 60 });

    // A coverage report that does not name what it tested proves nothing later.
    expect(report.policyHash).toBe(policyHash);
    expect(report.codeRevision).toBeTruthy();
    expect(report.seed).toBe(20260830);
  });

  it("is reproducible: the same seed gives the same coverage", () => {
    const a = runBreakMe(worldFactory, policyHash, { seed: 4242, runs: 120 });
    const b = runBreakMe(worldFactory, policyHash, { seed: 4242, runs: 120 });

    expect(a.coverage.map((r) => r.invariant)).toEqual(b.coverage.map((r) => r.invariant));
    expect(a.passed).toBe(b.passed);
  });

  it("blocks activation when an invariant was never exercised", () => {
    // One run cannot hit all sixteen attacks, so coverage must be incomplete.
    const thin = runBreakMe(worldFactory, policyHash, { seed: 1, runs: 1 });

    const gate = mayActivate(thin);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/Untested invariants cannot be claimed/);
  });

  it("allows activation on a full, clean run", () => {
    const report = runBreakMe(worldFactory, policyHash, { seed: 20260830, runs: 300 });

    const gate = mayActivate(report);
    expect(gate.ok).toBe(true);
    expect(gate.reason).toMatch(/All eight invariants exercised/);
  });
});

describe("generated attacks actually reach the invariant they target", () => {
  const cases = [
    ["OVERSIZED_QUANTITY", "COV-02"],
    ["STALE_QUOTE", "COV-05"],
    ["DTE_OUT_OF_BAND", "COV-05"],
    ["SESSION_DATE_MISMATCH", "COV-04"],
    ["DAILY_LOSS_BREACHED", "COV-04"],
    ["DUPLICATE_EXPOSURE", "COV-06"],
    ["OVERDUE_POSITION", "COV-07"],
    ["MISSING_POSITIONS", "COV-03"],
    ["MISSING_CLOCK", "COV-08"],
    ["SNAPSHOT_DRIFT", "COV-08"],
    ["MODEL_WIDENED", "COV-08"]
  ] as const;

  it.each(cases)("%s trips %s", (attack, invariant) => {
    const context = applyAttack(worldFactory(), attack, 0.5);
    const evaluator = INVARIANT_REGISTRY.find((e) => e.id === invariant)!;

    expect(evaluator.evaluate(context).ok).toBe(false);
  });

  it("an unmodified world still passes everything", () => {
    const context = applyAttack(worldFactory(), "NONE", 0);
    const failures = INVARIANT_REGISTRY.map((e) => e.evaluate(context)).filter((v) => !v.ok);

    expect(failures).toEqual([]);
  });
});
