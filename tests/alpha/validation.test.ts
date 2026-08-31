import { describe, expect, it } from "vitest";
import { runWalkForwardValidation } from "@/lib/alpha/validation";

describe("Walk-Forward Validation Status", () => {
  it.each(["SPY", "QQQ"] as const)("publishes no invented metrics for %s", (symbol) => {
    const report = runWalkForwardValidation(symbol);
    expect(report).toEqual(expect.objectContaining({
      symbol,
      status: "NOT_AVAILABLE",
      provenance: "UNAVAILABLE",
    }));
    expect(report.requirements.length).toBeGreaterThan(0);
    expect(report).not.toHaveProperty("overallSharpe");
    expect(report).not.toHaveProperty("overallPnl");
  });
});
