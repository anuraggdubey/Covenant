import { describe, it, expect } from "vitest";
import {
  parseOccSymbol,
  buildMarketSnapshot,
  buildAccountSnapshot,
  verifySnapshotHash,
} from "@/lib/alpha/snapshots";
import type { AlpacaOptionSnapshotsResponse, AlpacaAccountResponse } from "@/lib/alpaca/types";

describe("Snapshot Parsing & Hashing", () => {
  it("correctly parses standard OCC option symbols", () => {
    const parsed = parseOccSymbol("SPY260116C00500000");
    expect(parsed.underlying).toBe("SPY");
    expect(parsed.expiration).toBe("2026-01-16");
    expect(parsed.type).toBe("call");
    expect(parsed.strike).toBe("500.00");

    const parsedPut = parseOccSymbol("QQQ260220P00450500");
    expect(parsedPut.underlying).toBe("QQQ");
    expect(parsedPut.expiration).toBe("2026-02-20");
    expect(parsedPut.type).toBe("put");
    expect(parsedPut.strike).toBe("450.50");
  });

  it("fails closed on invalid OCC symbol or unsupported root", () => {
    expect(() => parseOccSymbol("AAPL260116C00150000")).toThrow(
      "[FAIL-CLOSED] Unsupported underlying in symbol: AAPL"
    );
    expect(() => parseOccSymbol("INVALID_SYMBOL")).toThrow(
      "[FAIL-CLOSED] Invalid OCC option symbol format"
    );
  });

  it("builds a canonical MarketSnapshot and generates a verifiable hash", () => {
    const rawSnapshots: AlpacaOptionSnapshotsResponse = {
      snapshots: {
        "SPY260116C00500000": {
          latestQuote: {
            ap: 5.5,
            as: 10,
            bp: 5.4,
            bs: 20,
            t: "2026-08-30T14:30:00Z",
          },
          greeks: { delta: 0.5, gamma: 0.02, theta: -0.05, vega: 0.1 },
          impliedVolatility: 0.18,
          dailyBar: { t: "2026-08-30T14:30:00Z", o: 5.3, h: 5.6, l: 5.2, c: 5.4, v: 321, n: 25, vw: 5.4 },
        },
      },
    };

    const marketSnapshot = buildMarketSnapshot(
      "SPY",
      "510.50",
      rawSnapshots,
      "indicative",
      "2026-08-30T14:30:00.000Z"
    );

    expect(marketSnapshot.snapshotHash).toHaveLength(64);
    expect(marketSnapshot.feed).toBe("indicative");
    expect(marketSnapshot.contracts.SPY260116C00500000.volume).toBe(321);
    expect(verifySnapshotHash(marketSnapshot)).toBe(true);

    // Tampering test: mutating a field invalidates hash
    const tampered = { ...marketSnapshot, underlyingPrice: "520.00" };
    expect(verifySnapshotHash(tampered)).toBe(false);
  });

  it("rejects incomplete and cross-underlying chains", () => {
    expect(() => buildMarketSnapshot("SPY", "500", {
      snapshots: {},
      next_page_token: "more",
    })).toThrow("pagination remains");

    expect(() => buildMarketSnapshot("SPY", "500", {
      snapshots: {
        QQQ260918C00450000: {
          latestQuote: { ap: 3.1, as: 10, bp: 3, bs: 10, t: "2026-08-30T14:30:00Z" },
        },
      },
    })).toThrow("contains contract");
  });

  it("builds a canonical AccountSnapshot and generates a verifiable hash", () => {
    const rawAccount: AlpacaAccountResponse = {
      id: "acc_100k_test",
      account_number: "PA12345678",
      status: "ACTIVE",
      currency: "USD",
      buying_power: "200000.00",
      regt_buying_power: "200000.00",
      daytrading_buying_power: "400000.00",
      cash: "100000.00",
      portfolio_value: "100000.00",
      equity: "100000.00",
      last_equity: "99500.00",
      multiplier: "2",
      initial_margin: "0",
      maintenance_margin: "0",
      last_maintenance_margin: "0",
      sma: "0",
      daytrade_count: 0,
      balance_asof: "2026-08-30",
      pattern_day_trader: false,
      options_approved_level: 3,
      options_trading_level: 3,
    };

    const accountSnapshot = buildAccountSnapshot(
      rawAccount,
      0.02,
      "2026-08-30T14:30:00.000Z"
    );

    expect(accountSnapshot.snapshotHash).toHaveLength(64);
    expect(accountSnapshot.equity).toBe("100000.00");
    expect(accountSnapshot.dailyUnrealizedPnl).toBe("500.00");
    expect(verifySnapshotHash(accountSnapshot)).toBe(true);

    // Tampering test
    const tampered = { ...accountSnapshot, equity: "150000.00" };
    expect(verifySnapshotHash(tampered)).toBe(false);
  });
});
