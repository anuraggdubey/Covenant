import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import {
  candidateLabPolicy,
  fetchCandidateLabFromBroker,
  loadCandidateLab,
  STALE_LAB_QUOTE_AGE_MS
} from "@/lib/alpha/candidate-lab";
import { defaultActivePolicy } from "@/lib/alpha/loop";
import { clearOperatorActivePolicy } from "@/lib/alpha/runtime-policy";
import { clearCandidateLabCache, lastCandidateLab } from "@/lib/alpha/candidate-snapshot-cache";
import {
  candidateMatchesFilters,
  filterLadderRows,
  filterRankedCandidates
} from "@/lib/alpha/candidate-filters";
import { EMPTY_CANDIDATE_FILTERS, type RankedCandidateView } from "@/lib/alpha/candidate-lab-types";

function mockClient(): AlpacaReadClient {
  return new AlpacaReadClient({ mockMode: true });
}

function candidate(overrides: Partial<RankedCandidateView> = {}): RankedCandidateView {
  return {
    id: "c1",
    structure: "BULL_CALL_DEBIT",
    expiry: "2026-10-16",
    dte: 14,
    legs: [
      {
        symbol: "SPY261016C00500000",
        side: "buy",
        ratioQty: 1,
        positionIntent: "buy_to_open"
      },
      {
        symbol: "SPY261016C00505000",
        side: "sell",
        ratioQty: 1,
        positionIntent: "sell_to_open"
      }
    ],
    quantity: 1,
    limitPrice: "2.40",
    standaloneMaxLoss: "240.00",
    standaloneMaxGain: "260.00",
    breakevenUnderlying: "502.40",
    riskRewardRatio: "1.08",
    alphaScore: 70,
    expectedPnl: "12.00",
    lowerConfidenceBoundPnl: "1.00",
    scenarioCount: 20,
    thesis: "SPY BULL_CALL_DEBIT after-cost",
    ...overrides
  };
}

describe("Candidate Lab loader", () => {
  beforeEach(() => {
    clearCandidateLabCache();
    clearOperatorActivePolicy();
    vi.restoreAllMocks();
  });

  it("returns ranked spreads and a strike ladder from the broker", async () => {
    const payload = await fetchCandidateLabFromBroker(mockClient());
    expect(payload.source).toBe("BROKER");
    expect(payload.underlyings).toHaveLength(2);
    for (const row of payload.underlyings) {
      expect(["SPY", "QQQ"]).toContain(row.underlying);
      expect(row.expirations.length).toBeGreaterThan(0);
      expect(row.totalContractsInChain).toBeGreaterThan(0);
      expect(Object.keys(row.ladderByExpiry).length).toBeGreaterThan(0);
    }
  });

  it("labels a closed session STALE instead of refusing", async () => {
    const client = mockClient();
    vi.spyOn(client, "getClock").mockResolvedValue({
      timestamp: "2026-09-02T03:00:00.000Z",
      is_open: false,
      next_open: "2026-09-02T13:30:00.000Z",
      next_close: "2026-09-02T20:00:00.000Z"
    });

    const payload = await fetchCandidateLabFromBroker(client);
    expect(payload.freshness).toBe("STALE");
    expect(payload.clock.isOpen).toBe(false);
    expect(payload.warning).toMatch(/closed/i);
    expect(payload.underlyings.length).toBe(2);
  });

  it("widens quote-age only for closed-session observation", () => {
    expect(candidateLabPolicy(true).maxQuoteAgeMs).toBe(defaultActivePolicy.maxQuoteAgeMs);
    expect(candidateLabPolicy(false).maxQuoteAgeMs).toBe(STALE_LAB_QUOTE_AGE_MS);
  });

  it("serves the last success when a later fetch fails", async () => {
    const good = mockClient();
    await loadCandidateLab(good);
    expect(lastCandidateLab()).not.toBeNull();

    const broken = mockClient();
    vi.spyOn(broken, "getClock").mockRejectedValue(new Error("clock unreachable"));

    const fallback = await loadCandidateLab(broken);
    expect(fallback.source).toBe("CACHE");
    expect(fallback.freshness).toBe("STALE");
    expect(fallback.warning).toMatch(/last successful/i);
    expect(fallback.underlyings).toHaveLength(2);
  });

  it("throws when there is no cache and the broker fails", async () => {
    const broken = mockClient();
    vi.spyOn(broken, "getClock").mockRejectedValue(new Error("clock unreachable"));
    await expect(loadCandidateLab(broken)).rejects.toThrow("clock unreachable");
  });
});

describe("Candidate Lab filters", () => {
  const book = [
    candidate(),
    candidate({
      id: "c2",
      structure: "CREDIT_VERTICAL",
      expiry: "2026-10-23",
      standaloneMaxLoss: "500.00",
      legs: [
        {
          symbol: "QQQ261023P00450000",
          side: "sell",
          ratioQty: 1,
          positionIntent: "sell_to_open"
        },
        {
          symbol: "QQQ261023P00440000",
          side: "buy",
          ratioQty: 1,
          positionIntent: "buy_to_open"
        }
      ],
      thesis: "QQQ CREDIT_VERTICAL"
    })
  ];

  it("filters by OCC text, expiry, structure, strike window, and max loss", () => {
    expect(filterRankedCandidates(book, { ...EMPTY_CANDIDATE_FILTERS, query: "spy261016" })).toHaveLength(1);
    expect(filterRankedCandidates(book, { ...EMPTY_CANDIDATE_FILTERS, expiry: "2026-10-23" })).toEqual([book[1]]);
    expect(filterRankedCandidates(book, { ...EMPTY_CANDIDATE_FILTERS, structure: "CREDIT_VERTICAL" })).toEqual([
      book[1]
    ]);
    expect(filterRankedCandidates(book, { ...EMPTY_CANDIDATE_FILTERS, strikeMin: "504", strikeMax: "506" })).toHaveLength(1);
    expect(filterRankedCandidates(book, { ...EMPTY_CANDIDATE_FILTERS, maxLossMax: "300" })).toEqual([book[0]]);
  });

  it("filters ladder rows by strike and OCC symbol", () => {
    const rows = [
      { strike: "500", call: { symbol: "SPY261016C00500000", bid: "1.00", ask: "1.10" } },
      { strike: "510", put: { symbol: "SPY261016P00510000", bid: "2.00", ask: "2.10" } }
    ];
    expect(filterLadderRows(rows, { ...EMPTY_CANDIDATE_FILTERS, strikeMax: "505" })).toHaveLength(1);
    expect(filterLadderRows(rows, { ...EMPTY_CANDIDATE_FILTERS, query: "p00510000" })).toHaveLength(1);
  });

  it("does not match a candidate on an empty query", () => {
    expect(candidateMatchesFilters(candidate(), EMPTY_CANDIDATE_FILTERS)).toBe(true);
  });
});
