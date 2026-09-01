/**
 * Guards for the unit convention.
 *
 * This is a regression test for a real, silent, cross-lane bug: `Policy`
 * expresses equity ratios and spread width as PERCENT, but Lane C calibrates
 * them as FRACTIONS and three separate call sites in the alpha lane read them
 * as fractions. The disagreement was 100x, in both directions:
 *
 *   - the kernel read 0.006 as 0.6% -> a $6 per-trade cap on $100k, so it
 *     vetoed everything;
 *   - the candidate factory compared a 0.26 ratio against a 25 percent band,
 *     so its spread filter was always false and never rejected anything.
 *
 * Neither showed up in either lane's own tests, because each lane was
 * internally consistent. They only surfaced when the loop was joined.
 */

import { describe, expect, it } from "vitest";

import { defaultActivePolicy } from "@/lib/alpha/loop";
import {
  assertPercentUnits,
  dailyHaltFraction,
  looksLikeFractionUnits,
  perTradeFraction,
  portfolioHeatFraction
} from "@/lib/policy-units";
import { profileLimits, toPolicyUnits } from "@/lib/mandates/profiles";

import { buildPolicy } from "./fixtures";

describe("percent <-> fraction conversion", () => {
  const policy = buildPolicy({
    perTradeMaxLossPct: 0.6,
    portfolioHeatMaxLossPct: 2.5,
    dailyHaltPct: -1.25
  });

  it("converts equity ratios for code that multiplies equity directly", () => {
    expect(perTradeFraction(policy)).toBeCloseTo(0.006, 10);
    expect(portfolioHeatFraction(policy)).toBeCloseTo(0.025, 10);
    expect(dailyHaltFraction(policy)).toBeCloseTo(-0.0125, 10);
  });

  it("a 0.6% cap on $100k equity is $600, not $6 and not $60,000", () => {
    const equity = 100_000;
    expect(equity * perTradeFraction(policy)).toBeCloseTo(600, 6);
  });
});

describe("fraction-unit detection", () => {
  it("flags a policy that arrived in fraction units", () => {
    const wrong = buildPolicy({ perTradeMaxLossPct: 0.006, portfolioHeatMaxLossPct: 0.025 });
    expect(looksLikeFractionUnits(wrong)).toBe(true);
    expect(() => assertPercentUnits(wrong, "test")).toThrow(/PERCENT/);
  });

  it("accepts every calibrated profile once converted", () => {
    for (const name of ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as const) {
      const limits = toPolicyUnits(profileLimits(name));
      const policy = buildPolicy({
        riskProfile: name,
        perTradeMaxLossPct: limits.perTradeMaxLossPct,
        portfolioHeatMaxLossPct: limits.portfolioHeatMaxLossPct,
        dailyHaltPct: limits.dailyHaltPct
      });
      expect(looksLikeFractionUnits(policy), `${name} looks like fractions`).toBe(false);
      expect(() => assertPercentUnits(policy, name)).not.toThrow();
    }
  });

  it("rejects the raw profile file, which is deliberately in fractions", () => {
    const raw = profileLimits("BALANCED");
    const policy = buildPolicy({
      perTradeMaxLossPct: raw.perTradeMaxLossPct,
      portfolioHeatMaxLossPct: raw.portfolioHeatMaxLossPct
    });
    expect(looksLikeFractionUnits(policy)).toBe(true);
  });
});

describe("the shipped default policy", () => {
  it("is in percent units", () => {
    expect(() => assertPercentUnits(defaultActivePolicy, "defaultActivePolicy")).not.toThrow();
  });

  it("matches the calibrated BALANCED profile exactly", () => {
    const expected = toPolicyUnits(profileLimits("BALANCED"));
    expect(defaultActivePolicy.perTradeMaxLossPct).toBeCloseTo(expected.perTradeMaxLossPct, 10);
    expect(defaultActivePolicy.portfolioHeatMaxLossPct).toBeCloseTo(
      expected.portfolioHeatMaxLossPct,
      10
    );
    expect(defaultActivePolicy.dailyHaltPct).toBeCloseTo(expected.dailyHaltPct, 10);
    expect(defaultActivePolicy.maxBidAskWidthPct).toBeCloseTo(expected.maxBidAskWidthPct, 10);
  });

  it("has a spread band a real option chain can actually clear", () => {
    // 25%, not 0.25%. A quarter-percent band would reject every option quote
    // in existence, which is how the bug hid: it looked like "safety".
    expect(defaultActivePolicy.maxBidAskWidthPct).toBeGreaterThan(1);
    expect(defaultActivePolicy.maxBidAskWidthPct).toBeLessThanOrEqual(100);
  });
});
