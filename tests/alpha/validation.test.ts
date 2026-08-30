import { describe, it, expect } from "vitest";
import { runWalkForwardValidation } from "@/lib/alpha/validation";

describe("Walk-Forward Validation Engine", () => {
  it("generates out-of-sample regime metrics for SPY", () => {
    const report = runWalkForwardValidation("SPY");
    expect(report.symbol).toBe("SPY");
    expect(report.totalTrades).toBeGreaterThan(50);
    expect(report.regimes).toHaveLength(4);
    expect(report.overallWinRate).toContain("%");
    expect(report.overallMaxDrawdownPct).toContain("%");
  });

  it("generates out-of-sample regime metrics for QQQ", () => {
    const report = runWalkForwardValidation("QQQ");
    expect(report.symbol).toBe("QQQ");
    expect(report.totalTrades).toBeGreaterThan(50);
    expect(report.regimes).toHaveLength(4);
  });
});
