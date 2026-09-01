import { describe, it, expect } from "vitest";
import { monitorPositions } from "@/lib/monitor/position-monitor";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import type { AlpacaPositionResponse } from "@/lib/monitor/position-monitor";
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
  maxBidAskWidthPct: 25,
  minOpenInterest: 0,
  minVolume: 0,
  duplicateExposureCooldownMinutes: 30,
  exitAttemptDeadlineMinutes: 15,
  missingStateAction: "ABSTAIN",
  modelAuthority: "VETO_OR_SHRINK",
  invariants: ["COV-01"],
};

describe("monitorPositions()", () => {
  it("returns empty positions in mock mode", async () => {
    const client = new AlpacaReadClient({ mockMode: true });
    const result = await monitorPositions(client, mockPolicy);

    expect(result.positions).toEqual([]);
    expect(result.summary.total).toBe(0);
    expect(result.summary.holdCount).toBe(0);
    expect(result.summary.exitCount).toBe(0);
    expect(result.summary.escalateCount).toBe(0);
    expect(result.timestamp).toBeDefined();
  });

  it("returns a valid timestamp", async () => {
    const client = new AlpacaReadClient({ mockMode: true });
    const now = "2026-08-31T14:00:00.000Z";
    const result = await monitorPositions(client, mockPolicy, now);

    expect(result.timestamp).toBe(now);
  });

  it("summary counts are consistent with positions", async () => {
    const client = new AlpacaReadClient({ mockMode: true });
    const result = await monitorPositions(client, mockPolicy);

    const { total, holdCount, exitCount, escalateCount } = result.summary;
    expect(total).toBe(holdCount + exitCount + escalateCount);
    expect(total).toBe(result.positions.length);
  });

  it("groups Alpaca option leg rows into a spread-level position", async () => {
    const positions: AlpacaPositionResponse[] = [
      buildPosition({
        symbol: "SPY260918C00500000",
        side: "long",
        qty: "1",
        cost_basis: "200.00",
        market_value: "220.00",
        unrealized_pl: "20.00",
      }),
      buildPosition({
        symbol: "SPY260918C00505000",
        side: "short",
        qty: "-1",
        cost_basis: "-120.00",
        market_value: "-125.00",
        unrealized_pl: "-5.00",
      }),
    ];
    const client = {
      isMockMode: () => false,
      getPositions: async () => positions,
    } as unknown as AlpacaReadClient;

    const result = await monitorPositions(client, mockPolicy, "2026-09-01T14:00:00.000Z");

    expect(result.summary.total).toBe(1);
    expect(result.summary.errorCount).toBe(0);
    expect(result.positions[0].position.symbol).toBe("SPY_2026-09-18_call");
    expect(result.positions[0].position.legs).toHaveLength(2);
    expect(result.positions[0].evaluation.action).toBe("HOLD");
  });

  it("escalates when Alpaca positions cannot be fetched", async () => {
    const client = {
      isMockMode: () => false,
      getPositions: async () => {
        throw new Error("provider unavailable");
      },
    } as unknown as AlpacaReadClient;

    const result = await monitorPositions(client, mockPolicy, "2026-09-01T14:00:00.000Z");

    expect(result.summary.errorCount).toBe(1);
    expect(result.positions[0].evaluation.action).toBe("ESCALATE");
    expect(result.positions[0].evaluation.reason).toContain("[FAIL-CLOSED]");
  });
});

function buildPosition(overrides: Partial<AlpacaPositionResponse>): AlpacaPositionResponse {
  return {
    asset_id: `asset_${overrides.symbol ?? "SPY260918C00500000"}`,
    symbol: "SPY260918C00500000",
    exchange: "OPRA",
    asset_class: "us_option",
    asset_marginable: false,
    qty: "1",
    avg_entry_price: "2.00",
    side: "long",
    market_value: "200.00",
    cost_basis: "200.00",
    unrealized_pl: "0.00",
    unrealized_plpc: "0.00",
    current_price: "2.00",
    lastday_price: "2.00",
    change_today: "0.00",
    qty_available: "1",
    ...overrides,
  };
}
