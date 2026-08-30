import { describe, it, expect } from "vitest";
import { propose } from "@/lib/alpha/engine";
import { buildMarketSnapshot, buildAccountSnapshot } from "@/lib/alpha/snapshots";
import { sha256Canonical } from "@/lib/alpha/canonical";
import type { Policy } from "@/types/domain";
import type { AlpacaBar } from "@/lib/alpaca/types";

const validPolicy: Policy = {
  id: "pol_test_alpha",
  version: 1,
  status: "ACTIVE",
  policyHash: "mock_policy_hash_123",
  createdAt: "2026-08-30T12:00:00Z",
  activatedAt: "2026-08-30T12:00:00Z",
  plainEnglishEcho: "Trade defined risk SPY/QQQ vertical spreads",
  allowedUnderlyings: ["SPY", "QQQ"],
  allowedStructures: ["BULL_CALL_DEBIT", "BEAR_PUT_DEBIT"],
  riskProfile: "BALANCED",
  perTradeMaxLossPct: 0.006,
  portfolioHeatMaxLossPct: 0.025,
  dailyHaltPct: -0.0125,
  minDte: 7,
  maxDte: 21,
  minDelta: 0.2,
  maxDelta: 0.8,
  maxQuoteAgeMs: 60000,
  maxBidAskWidthPct: 0.25,
  minOpenInterest: 10,
  minVolume: 5,
  duplicateExposureCooldownMinutes: 30,
  exitAttemptDeadlineMinutes: 15,
  missingStateAction: "ABSTAIN",
  modelAuthority: "VETO_OR_SHRINK",
  invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"],
};

function createValidSnapshots() {
  const rawAccount = {
    id: "acc_test_100k",
    account_number: "PA12345678",
    status: "ACTIVE",
    currency: "USD",
    buying_power: "200000.00",
    regt_buying_power: "200000.00",
    daytrading_buying_power: "400000.00",
    cash: "100000.00",
    portfolio_value: "100000.00",
    equity: "100000.00",
    last_equity: "100000.00",
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

  const rawOptions = {
    snapshots: {
      SPY260918C00495000: {
        latestQuote: {
          ap: 7.2,
          as: 50,
          bp: 7.0,
          bs: 50,
          t: "2026-08-30T14:29:50.000Z",
        },
        greeks: { delta: 0.6, gamma: 0.02, theta: -0.05, vega: 0.1 },
        impliedVolatility: 0.18,
        open_interest: 500,
        latestTrade: { p: 7.1, s: 100, t: "2026-08-30T14:29:50.000Z" },
        dailyBar: { t: "2026-08-30T14:29:50.000Z", o: 7, h: 7.3, l: 6.9, c: 7.1, v: 200, n: 25, vw: 7.1 },
      },
      SPY260918C00500000: {
        latestQuote: {
          ap: 4.15,
          as: 50,
          bp: 4.0,
          bs: 50,
          t: "2026-08-30T14:29:50.000Z",
        },
        greeks: { delta: 0.5, gamma: 0.02, theta: -0.05, vega: 0.1 },
        impliedVolatility: 0.18,
        open_interest: 800,
        latestTrade: { p: 4.1, s: 200, t: "2026-08-30T14:29:50.000Z" },
        dailyBar: { t: "2026-08-30T14:29:50.000Z", o: 4, h: 4.2, l: 3.9, c: 4.1, v: 300, n: 30, vw: 4.1 },
      },
    },
  };

  const market = buildMarketSnapshot(
    "SPY",
    "500.00",
    rawOptions,
    "indicative",
    "2026-08-30T14:30:00.000Z"
  );
  const account = buildAccountSnapshot(rawAccount, 0.0, "2026-08-30T14:30:00.000Z");

  return { market, account };
}

const bars: AlpacaBar[] = Array.from({ length: 60 }, (_, index) => {
  const close = 470 + index * 0.5;
  return {
    t: new Date(Date.UTC(2026, 6, 2 + index)).toISOString(),
    o: close - 0.4,
    h: close + 0.8,
    l: close - 0.8,
    c: close,
    v: 50_000_000,
    n: 100_000,
    vw: close,
  };
});

describe("Alpha Engine propose()", () => {
  it("proposes a valid TradeIntent given valid market & account state", async () => {
    const { market, account } = createValidSnapshots();
    const result = await propose(validPolicy, market, account, { bars, chainIvAverage: 0.18 });

    expect("intent" in result).toBe(true);
    if ("intent" in result) {
      const intent = result.intent;
      expect(intent.underlying).toBe("SPY");
      expect(intent.structure).toBe("BULL_CALL_DEBIT");
      expect(intent.legs).toHaveLength(2);
      expect(intent.quantity).toBeGreaterThanOrEqual(1);
      expect(intent.marketSnapshotHash).toBe(market.snapshotHash);
      expect(intent.accountSnapshotHash).toBe(account.snapshotHash);

      // Verify intent hash calculation
      const calculatedHash = sha256Canonical(intent, ["intentHash"]);
      expect(intent.intentHash).toBe(calculatedHash);
    }
  });

  it("fails closed (ABSTAIN) when market snapshot hash is tampered", async () => {
    const { market, account } = createValidSnapshots();
    const tamperedMarket = { ...market, snapshotHash: "invalid_tampered_hash" };
    const result = await propose(validPolicy, tamperedMarket, account);

    expect("abstain" in result).toBe(true);
    if ("abstain" in result) {
      expect(result.reason).toContain("invalid cryptographic hash");
    }
  });

  it("fails closed (ABSTAIN) when account options level is below 3", async () => {
    const { market, account } = createValidSnapshots();
    // Build an account with level 2
    const level2Account = { ...account, optionsLevel: 2 };
    // Recompute valid hash for this modified account
    level2Account.snapshotHash = sha256Canonical(level2Account, ["snapshotHash"]);

    const result = await propose(validPolicy, market, level2Account);
    expect("abstain" in result).toBe(true);
    if ("abstain" in result) {
      expect(result.reason).toContain("below required Level 3");
    }
  });

  it("fails closed (ABSTAIN) when policy is not ACTIVE", async () => {
    const { market, account } = createValidSnapshots();
    const draftPolicy: Policy = { ...validPolicy, status: "DRAFT" };
    const result = await propose(draftPolicy, market, account);

    expect("abstain" in result).toBe(true);
    if ("abstain" in result) {
      expect(result.reason).toContain("is not ACTIVE");
    }
  });

  it("fails closed (ABSTAIN) when model confidence is 0 (veto)", async () => {
    const { market, account } = createValidSnapshots();
    const result = await propose(validPolicy, market, account, {
      modelConfidenceMultiplier: 0.0,
      bars,
      chainIvAverage: 0.18,
    });

    expect("abstain" in result).toBe(true);
  });

  it("fails closed when historical signal evidence is missing", async () => {
    const { market, account } = createValidSnapshots();
    const result = await propose(validPolicy, market, account);
    expect(result).toEqual(expect.objectContaining({ abstain: true }));
    if ("abstain" in result) expect(result.reason).toContain("At least 21 daily bars");
  });
});
