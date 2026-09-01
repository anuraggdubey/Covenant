/**
 * Reconstructing a defined-risk envelope from raw broker legs.
 *
 * This is the arithmetic COV-03 sums, so an error here does not throw — it
 * quietly authorises risk the kernel thinks it has already counted. Every
 * case below is checked against a hand-computed figure for that reason.
 */

import { describe, expect, it } from "vitest";

import type { OpenPositionState } from "@/lib/monitor/position-monitor";
import { toOpenPosition, toOpenPositions } from "@/lib/safety/position-risk";
import type { Leg } from "@/types/domain";

const NOW = "2026-09-02T14:30:00.000Z";

function leg(symbol: string, side: "buy" | "sell"): Leg {
  return {
    symbol,
    ratioQty: 1,
    side,
    positionIntent: side === "buy" ? "buy_to_open" : "sell_to_open"
  };
}

function state(overrides: Partial<OpenPositionState> = {}): OpenPositionState {
  return {
    symbol: "SPY_2026-09-18_call",
    underlying: "SPY",
    qty: 1,
    entryPrice: "2.40",
    currentPrice: "2.60",
    unrealizedPnl: "20.00",
    expiry: "2026-09-18",
    dte: 16,
    legs: [leg("SPY260918C00560000", "buy"), leg("SPY260918C00565000", "sell")],
    ...overrides
  };
}

describe("classifying a held vertical", () => {
  it("reads a long-lower / short-higher call pair as a bull call debit", () => {
    const mapped = toOpenPosition(state(), NOW);
    expect(mapped?.structure).toBe("BULL_CALL_DEBIT");
  });

  it("reads a long-higher / short-lower put pair as a bear put debit", () => {
    const mapped = toOpenPosition(
      state({
        legs: [leg("SPY260918P00560000", "buy"), leg("SPY260918P00555000", "sell")]
      }),
      NOW
    );
    expect(mapped?.structure).toBe("BEAR_PUT_DEBIT");
  });

  it("reads a short-lower / long-higher call pair as a credit vertical", () => {
    const mapped = toOpenPosition(
      state({
        legs: [leg("SPY260918C00560000", "sell"), leg("SPY260918C00565000", "buy")]
      }),
      NOW
    );
    expect(mapped?.structure).toBe("CREDIT_VERTICAL");
  });
});

describe("max loss", () => {
  it("a debit spread risks exactly the premium paid", () => {
    // 1 contract, $2.40 net debit, x100 multiplier.
    const mapped = toOpenPosition(state({ entryPrice: "2.40", qty: 1 }), NOW);
    expect(mapped?.standaloneMaxLoss).toBe("240.00");
  });

  it("scales with quantity", () => {
    const mapped = toOpenPosition(state({ entryPrice: "2.40", qty: 3 }), NOW);
    expect(mapped?.standaloneMaxLoss).toBe("720.00");
  });

  it("a credit spread risks the width less the credit received", () => {
    // 560/565 width is $5. Collect $1.85 -> risk $3.15 x 100 = $315.
    const mapped = toOpenPosition(
      state({
        entryPrice: "1.85",
        legs: [leg("SPY260918C00560000", "sell"), leg("SPY260918C00565000", "buy")]
      }),
      NOW
    );
    expect(mapped?.structure).toBe("CREDIT_VERTICAL");
    expect(mapped?.standaloneMaxLoss).toBe("315.00");
  });

  it("never understates: a credit above the width falls back to the full width", () => {
    const mapped = toOpenPosition(
      state({
        entryPrice: "9.00", // impossible for a $5 spread; treat as fully at risk
        legs: [leg("SPY260918C00560000", "sell"), leg("SPY260918C00565000", "buy")]
      }),
      NOW
    );
    expect(mapped?.standaloneMaxLoss).toBe("500.00");
  });

  it("never understates: a debit above the width is clamped to the width", () => {
    const mapped = toOpenPosition(state({ entryPrice: "12.00" }), NOW);
    expect(mapped?.standaloneMaxLoss).toBe("500.00");
  });
});

describe("refusing to guess", () => {
  it("returns null for a single naked leg", () => {
    expect(toOpenPosition(state({ legs: [leg("SPY260918C00560000", "buy")] }), NOW)).toBeNull();
  });

  it("returns null when both legs are the same side", () => {
    expect(
      toOpenPosition(
        state({ legs: [leg("SPY260918C00560000", "buy"), leg("SPY260918C00565000", "buy")] }),
        NOW
      )
    ).toBeNull();
  });

  it("returns null for a mixed call/put pair", () => {
    expect(
      toOpenPosition(
        state({ legs: [leg("SPY260918C00560000", "buy"), leg("SPY260918P00555000", "sell")] }),
        NOW
      )
    ).toBeNull();
  });

  it("returns null for an underlying outside the mandate universe", () => {
    expect(
      toOpenPosition(
        state({
          underlying: "AAPL",
          legs: [leg("AAPL260918C00230000", "buy"), leg("AAPL260918C00235000", "sell")]
        }),
        NOW
      )
    ).toBeNull();
  });

  it("returns null for an unparseable symbol", () => {
    expect(toOpenPosition(state({ legs: [leg("NONSENSE", "buy"), leg("ALSO-BAD", "sell")] }), NOW))
      .toBeNull();
  });
});

describe("the whole book, or nothing", () => {
  it("maps a book of priceable positions", () => {
    const result = toOpenPositions([state(), state({ symbol: "SPY_2026-10-16_call" })], NOW);
    expect("positions" in result && result.positions).toHaveLength(2);
  });

  it("refuses a partial book — one unpriceable position invalidates the heat sum", () => {
    const result = toOpenPositions(
      [state(), state({ symbol: "weird", legs: [leg("SPY260918C00560000", "buy")] })],
      NOW
    );
    expect("unresolved" in result && result.unresolved).toEqual(["weird"]);
  });

  it("an empty book is a fact we can assert", () => {
    const result = toOpenPositions([], NOW);
    expect("positions" in result && result.positions).toEqual([]);
  });
});
