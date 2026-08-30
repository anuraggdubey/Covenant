import { describe, expect, it } from "vitest";
import { analyzeMarketSignals } from "@/lib/alpha/signals";
import type { AlpacaBar } from "@/lib/alpaca/types";

function bars(count: number): AlpacaBar[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.4;
    return {
      t: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      o: close - 0.2, h: close + 0.8, l: close - 0.8, c: close,
      v: 1_000_000, n: 10_000, vw: close,
    };
  });
}

describe("Market signals", () => {
  it("abstains instead of inventing default volatility", () => {
    const signals = analyzeMarketSignals(bars(20));
    expect(signals.usable).toBe(false);
    expect(signals.realizedVol20d).toBe(0);
    expect(signals.summary).toContain("ABSTAIN");
  });

  it("computes deterministic trend, EWMA/range volatility, and IV premium", () => {
    const first = analyzeMarketSignals(bars(60), 0.25);
    const second = analyzeMarketSignals(bars(60), 0.25);
    expect(first).toEqual(second);
    expect(first.usable).toBe(true);
    expect(first.trend).toBe("BULLISH");
    expect(first.dailyLogReturns).toHaveLength(59);
    expect(first.rangeVol20d).toBeGreaterThan(0);
    expect(first.ivPremium).toBeDefined();
  });
});
