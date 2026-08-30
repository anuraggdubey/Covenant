import { describe, it, expect } from "vitest";
import { evaluatePositionExit, type OpenPositionState } from "@/lib/monitor/position-monitor";
import type { Policy } from "@/types/domain";

const mockPolicy: Policy = {
  id: "pol_test",
  version: 1,
  status: "ACTIVE",
  policyHash: "mock_hash",
  createdAt: "2026-08-30T00:00:00Z",
  activatedAt: "2026-08-30T00:00:00Z",
  plainEnglishEcho: "Test",
  allowedUnderlyings: ["SPY"],
  allowedStructures: ["BULL_CALL_DEBIT"],
  riskProfile: "BALANCED",
  perTradeMaxLossPct: 0.02,
  portfolioHeatMaxLossPct: 0.06,
  dailyHaltPct: -0.03,
  minDte: 7,
  maxDte: 45,
  minDelta: 0.2,
  maxDelta: 0.8,
  maxQuoteAgeMs: 60000,
  maxBidAskWidthPct: 0.25,
  minOpenInterest: 0,
  minVolume: 0,
  duplicateExposureCooldownMinutes: 30,
  exitAttemptDeadlineMinutes: 15,
  missingStateAction: "ABSTAIN",
  modelAuthority: "VETO_OR_SHRINK",
  invariants: ["COV-01"],
};

describe("Position Monitor", () => {
  it("triggers exit when 50% profit target is reached", () => {
    const position: OpenPositionState = {
      symbol: "SPY_SPREAD_1",
      underlying: "SPY",
      qty: 2,
      entryPrice: "2.00", // $400 total entry
      currentPrice: "3.20",
      unrealizedPnl: "240.00", // +60% return
      expiry: "2026-09-18",
      dte: 10,
      legs: [],
    };

    const evalResult = evaluatePositionExit(position, mockPolicy);
    expect(evalResult.shouldExit).toBe(true);
    expect(evalResult.action).toBe("EXIT_PROFIT_TARGET");
  });

  it("triggers exit when 100% stop loss is hit", () => {
    const position: OpenPositionState = {
      symbol: "SPY_SPREAD_1",
      underlying: "SPY",
      qty: 1,
      entryPrice: "2.00", // $200 total entry
      currentPrice: "0.00",
      unrealizedPnl: "-200.00", // -100% loss
      expiry: "2026-09-18",
      dte: 5,
      legs: [],
    };

    const evalResult = evaluatePositionExit(position, mockPolicy);
    expect(evalResult.shouldExit).toBe(true);
    expect(evalResult.action).toBe("EXIT_STOP_LOSS");
  });

  it("triggers exit when expiration deadline is reached (DTE <= 0)", () => {
    const position: OpenPositionState = {
      symbol: "SPY_SPREAD_1",
      underlying: "SPY",
      qty: 1,
      entryPrice: "2.00",
      currentPrice: "2.10",
      unrealizedPnl: "10.00",
      expiry: "2026-08-30",
      dte: 0,
      legs: [],
    };

    const evalResult = evaluatePositionExit(position, mockPolicy);
    expect(evalResult.shouldExit).toBe(true);
    expect(evalResult.action).toBe("EXIT_EXPIRATION_DEADLINE");
  });

  it("holds position when within normal boundaries", () => {
    const position: OpenPositionState = {
      symbol: "SPY_SPREAD_1",
      underlying: "SPY",
      qty: 1,
      entryPrice: "2.00",
      currentPrice: "2.20",
      unrealizedPnl: "20.00", // +10% return
      expiry: "2026-09-18",
      dte: 15,
      legs: [],
    };

    const evalResult = evaluatePositionExit(position, mockPolicy);
    expect(evalResult.shouldExit).toBe(false);
    expect(evalResult.action).toBe("HOLD");
  });
});
