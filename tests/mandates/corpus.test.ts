/**
 * The mandate compiler against Lane C's corpus — T-B7 meets T-C1.
 *
 * This is the cross-lane contract: Lane C wrote 12 mandates and what each
 * should compile to, without seeing the compiler. If these pass, the
 * contradiction demo works on inputs we did not tune against.
 *
 * The assertions are ranked by what actually matters. Status and contradiction
 * codes are safety-critical and asserted for all 12. Universe and structures
 * are asserted where the text states them plainly.
 */

import { describe, expect, it } from "vitest";

import corpus from "@/docs/mandates/corpus-v1.json";
import { compileMandate, materialisePolicy } from "@/lib/mandates/compile";

interface CorpusCase {
  id: string;
  title: string;
  mandateText: string;
  expectedCompiledPolicy: {
    status: string;
    riskProfile: string;
    allowedUnderlyings: string[];
    allowedStructures: string[];
    riskOverrides: Record<string, number>;
  };
  expectedContradictions: { code: string; fields: string[] }[];
}

const CASES = (corpus as unknown as { cases: CorpusCase[] }).cases;

describe("mandate corpus", () => {
  it("carries the twelve cases Lane C specified", () => {
    expect(CASES).toHaveLength(12);
    expect(CASES.filter((c) => c.expectedContradictions.length > 0)).toHaveLength(4);
  });

  it.each(CASES.map((c) => [c.id, c] as const))(
    "%s compiles to the expected status and contradictions",
    (_id, testCase) => {
      const result = compileMandate(testCase.mandateText);

      expect(result.draft.status).toBe(testCase.expectedCompiledPolicy.status);

      const gotCodes = result.contradictions.map((c) => c.code).sort();
      const wantCodes = testCase.expectedContradictions.map((c) => c.code).sort();
      expect(gotCodes).toEqual(wantCodes);

      // The fields a contradiction points at are what the UI highlights.
      for (const expected of testCase.expectedContradictions) {
        const actual = result.contradictions.find((c) => c.code === expected.code);
        expect(actual?.fields.sort()).toEqual([...expected.fields].sort());
      }
    }
  );

  it.each(CASES.map((c) => [c.id, c] as const))(
    "%s compiles to the expected universe and structures",
    (_id, testCase) => {
      const result = compileMandate(testCase.mandateText);
      expect(result.draft.allowedUnderlyings).toEqual(
        testCase.expectedCompiledPolicy.allowedUnderlyings
      );
      expect(result.draft.allowedStructures).toEqual(
        testCase.expectedCompiledPolicy.allowedStructures
      );
    }
  );

  it("reads the risk profile whenever the mandate names one", () => {
    const named = CASES.filter((c) => /conservative|balanced|aggressive/i.test(c.mandateText));
    expect(named.length).toBeGreaterThan(6);

    for (const testCase of named) {
      expect(compileMandate(testCase.mandateText).draft.riskProfile).toBe(
        testCase.expectedCompiledPolicy.riskProfile
      );
    }
  });

  it("records only the limits that genuinely differ from the profile", () => {
    for (const testCase of CASES) {
      const result = compileMandate(testCase.mandateText);
      expect(result.draft.riskOverrides).toEqual(testCase.expectedCompiledPolicy.riskOverrides);
    }
  });
});

describe("activation is fail-closed", () => {
  const blocked = CASES.filter((c) => c.expectedContradictions.length > 0);

  it.each(blocked.map((c) => [c.id, c] as const))(
    "%s cannot be materialised into an activatable policy",
    (_id, testCase) => {
      const result = compileMandate(testCase.mandateText);
      expect(() =>
        materialisePolicy(result, { id: "p", version: 1, createdAt: "2026-08-31T00:00:00.000Z" })
      ).toThrow(/Cannot activate a BLOCKED policy/);
    }
  );

  it("materialises a clean mandate with the right units", () => {
    // The corpus stores fractions (0.006); Policy stores percent (0.6).
    const result = compileMandate(CASES[0]!.mandateText);
    const policy = materialisePolicy(result, {
      id: "p-1",
      version: 1,
      createdAt: "2026-08-31T00:00:00.000Z"
    });

    expect(policy.riskProfile).toBe("BALANCED");
    expect(policy.perTradeMaxLossPct).toBeCloseTo(0.6, 6);
    expect(policy.portfolioHeatMaxLossPct).toBeCloseTo(2.5, 6);
    expect(policy.dailyHaltPct).toBeCloseTo(-1.25, 6);
    expect(policy.missingStateAction).toBe("ABSTAIN");
    expect(policy.modelAuthority).toBe("VETO_OR_SHRINK");
    expect(policy.policyHash).toHaveLength(64);
    // Never activated by compilation alone.
    expect(policy.status).toBe("DRAFT");
  });

  it("explains a contradiction in words the author can act on", () => {
    const forced = CASES.find((c) =>
      c.expectedContradictions.some((x) => x.code === "FORCED_TRADE_CONFLICT")
    )!;
    const result = compileMandate(forced.mandateText);

    expect(result.contradictions[0]!.explanation).toMatch(/abstain/i);
    expect(result.contradictions[0]!.explanation.length).toBeGreaterThan(60);
  });
});
