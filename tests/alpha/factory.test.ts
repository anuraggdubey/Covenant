import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateCandidates } from "@/lib/alpha/factory";
import type { MarketSnapshot, Policy, OptionContractSnapshot } from "@/types/domain";

const defaultPolicy: Policy = {
  id: "pol_test_default",
  version: 1,
  status: "ACTIVE",
  policyHash: "mock_policy_hash",
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

function createMockMarketSnapshot(
  contracts: Record<string, OptionContractSnapshot>
): MarketSnapshot {
  return {
    timestamp: "2026-08-30T14:30:00.000Z",
    feed: "indicative",
    underlying: "SPY",
    underlyingPrice: "500.00",
    contracts,
    snapshotHash: "mock_market_hash",
  };
}

describe("Candidate Factory", () => {
  it("generates Bull Call Debit vertical spreads from valid option chain", () => {
    const contracts: Record<string, OptionContractSnapshot> = {
      SPY260918C00495000: {
        symbol: "SPY260918C00495000",
        strike: "495.00",
        expiration: "2026-09-18",
        type: "call",
        bid: "7.00",
        ask: "7.20",
        bidSize: 50,
        askSize: 50,
        delta: 0.6,
        openInterest: 500,
        volume: 200,
        quoteTimestamp: "2026-08-30T14:29:50.000Z",
      },
      SPY260918C00500000: {
        symbol: "SPY260918C00500000",
        strike: "500.00",
        expiration: "2026-09-18",
        type: "call",
        bid: "4.00",
        ask: "4.15",
        bidSize: 50,
        askSize: 50,
        delta: 0.5,
        openInterest: 1000,
        volume: 500,
        quoteTimestamp: "2026-08-30T14:29:50.000Z",
      },
      SPY260918C00505000: {
        symbol: "SPY260918C00505000",
        strike: "505.00",
        expiration: "2026-09-18",
        type: "call",
        bid: "2.00",
        ask: "2.10",
        bidSize: 50,
        askSize: 50,
        delta: 0.35,
        openInterest: 800,
        volume: 300,
        quoteTimestamp: "2026-08-30T14:29:50.000Z",
      },
    };

    const market = createMockMarketSnapshot(contracts);
    const candidates = generateCandidates(market, defaultPolicy, 1);

    expect(candidates.length).toBeGreaterThan(0);
    const first = candidates[0];
    expect(first.structure).toBe("BULL_CALL_DEBIT");
    expect(first.legs).toHaveLength(2);
    expect(first.legs[0].side).toBe("buy");
    expect(first.legs[1].side).toBe("sell");
    expect(Number(first.payoff.standaloneMaxLoss)).toBeGreaterThan(0);
  });

  it("Property Test: Never emits an unknown symbol or an undefined-risk structure", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            strikeOffset: fc.integer({ min: -20, max: 20 }),
            bid: fc.double({ min: 0.5, max: 20, noNaN: true }),
            spread: fc.double({ min: 0.05, max: 0.5, noNaN: true }),
            type: fc.constantFrom("call" as const, "put" as const),
            delta: fc.double({ min: 0.25, max: 0.75, noNaN: true }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (rawItems) => {
          const contracts: Record<string, OptionContractSnapshot> = {};

          contracts.SPY260919C00495000 = {
            symbol: "SPY260919C00495000", strike: "495.00", expiration: "2026-09-19", type: "call",
            bid: "7.00", ask: "7.20", bidSize: 20, askSize: 20, delta: 0.6,
            openInterest: 100, volume: 50, quoteTimestamp: "2026-08-30T14:30:00.000Z",
          };
          contracts.SPY260919C00500000 = {
            symbol: "SPY260919C00500000", strike: "500.00", expiration: "2026-09-19", type: "call",
            bid: "4.00", ask: "4.15", bidSize: 20, askSize: 20, delta: 0.5,
            openInterest: 100, volume: 50, quoteTimestamp: "2026-08-30T14:30:00.000Z",
          };

          rawItems.forEach((item, idx) => {
            const strikeNum = 500 + item.strikeOffset;
            const strikeStr = strikeNum.toFixed(2);
            const symbol = `SPY260918${item.type === "call" ? "C" : "P"}${String(strikeNum * 1000).padStart(8, "0")}`;

            const bidStr = item.bid.toFixed(2);
            const askStr = (item.bid + item.spread).toFixed(2);

            contracts[symbol] = {
              symbol,
              strike: strikeStr,
              expiration: "2026-09-18",
              type: item.type,
              bid: bidStr,
              ask: askStr,
              bidSize: 20,
              askSize: 20,
              delta: item.type === "call" ? item.delta : -item.delta,
              openInterest: 100,
              volume: 50,
              quoteTimestamp: "2026-08-30T14:30:00.000Z",
            };
          });

          const market = createMockMarketSnapshot(contracts);
          const candidates = generateCandidates(market, defaultPolicy, 1);
          expect(candidates.length).toBeGreaterThan(0);

          for (const cand of candidates) {
            // Invariant 1: Structure must be defined-risk
            expect(["BULL_CALL_DEBIT", "BEAR_PUT_DEBIT", "CREDIT_VERTICAL"]).toContain(
              cand.structure
            );

            // Invariant 2: Every leg symbol exists in snapshot
            for (const leg of cand.legs) {
              expect(contracts[leg.symbol]).toBeDefined();
            }

            // Invariant 3: Max loss is strictly finite and > 0
            const maxLoss = Number(cand.payoff.standaloneMaxLoss);
            expect(Number.isFinite(maxLoss)).toBe(true);
            expect(maxLoss).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("fails closed on missing Greeks, liquidity, or mixed underlying symbols", () => {
    const base: OptionContractSnapshot = {
      symbol: "SPY260918C00495000", strike: "495.00", expiration: "2026-09-18", type: "call",
      bid: "7.00", ask: "7.20", bidSize: 20, askSize: 20, delta: 0.6,
      openInterest: 100, volume: 50, quoteTimestamp: "2026-08-30T14:30:00.000Z",
    };
    const validSecond: OptionContractSnapshot = {
      ...base, symbol: "SPY260918C00500000", strike: "500.00", bid: "4.00", ask: "4.15", delta: 0.5,
    };

    expect(generateCandidates(createMockMarketSnapshot({
      [base.symbol]: { ...base, delta: undefined },
      [validSecond.symbol]: validSecond,
    }), defaultPolicy)).toHaveLength(0);
    expect(generateCandidates(createMockMarketSnapshot({
      [base.symbol]: { ...base, volume: 0 },
      [validSecond.symbol]: validSecond,
    }), defaultPolicy)).toHaveLength(0);
    expect(generateCandidates(createMockMarketSnapshot({
      QQQ260918C00495000: { ...base, symbol: "QQQ260918C00495000" },
      [validSecond.symbol]: validSecond,
    }), defaultPolicy)).toHaveLength(0);
  });
});
