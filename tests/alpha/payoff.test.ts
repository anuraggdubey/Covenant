import { describe, it, expect } from "vitest";
import { calculateVerticalPayoff } from "@/lib/alpha/payoff";

describe("Vertical Spread Payoff & Standalone Max-Loss", () => {
  it("calculates exact hand-computed values for Bull Call Debit", () => {
    // Buy 500 Call @ Ask 5.50, Sell 505 Call @ Bid 3.00, Qty = 2
    const payoff = calculateVerticalPayoff({
      structure: "BULL_CALL_DEBIT",
      longLeg: {
        symbol: "SPY260116C00500000",
        strike: "500.00",
        ask: "5.50",
        bid: "5.40",
      },
      shortLeg: {
        symbol: "SPY260116C00505000",
        strike: "505.00",
        ask: "3.10",
        bid: "3.00",
      },
      quantity: 2,
      slippageBufferPerContract: "0.02",
    });

    expect(payoff.netDebitOrCreditPerShare).toBe("2.50");
    expect(payoff.limitPrice).toBe("2.50");
    expect(payoff.standaloneMaxLoss).toBe("504.00"); // (2.50 + 0.02) * 100 * 2
    expect(payoff.standaloneMaxGain).toBe("496.00"); // (5.00 - 2.50 - 0.02) * 100 * 2
    expect(payoff.breakevenUnderlying).toBe("502.50");
    expect(payoff.riskRewardRatio).toBe("0.98");
  });

  it("calculates exact hand-computed values for Bear Put Debit", () => {
    // Buy 450 Put @ Ask 4.20, Sell 445 Put @ Bid 2.20, Qty = 1
    const payoff = calculateVerticalPayoff({
      structure: "BEAR_PUT_DEBIT",
      longLeg: {
        symbol: "QQQ260220P00450000",
        strike: "450.00",
        ask: "4.20",
        bid: "4.10",
      },
      shortLeg: {
        symbol: "QQQ260220P00445000",
        strike: "445.00",
        ask: "2.30",
        bid: "2.20",
      },
      quantity: 1,
      slippageBufferPerContract: "0.02",
    });

    expect(payoff.netDebitOrCreditPerShare).toBe("2.00");
    expect(payoff.limitPrice).toBe("2.00");
    expect(payoff.standaloneMaxLoss).toBe("202.00"); // (2.00 + 0.02) * 100 * 1
    expect(payoff.standaloneMaxGain).toBe("298.00"); // (5.00 - 2.00 - 0.02) * 100 * 1
    expect(payoff.breakevenUnderlying).toBe("448.00");
  });

  it("fails closed if Bull Call strikes are inverted (long >= short)", () => {
    expect(() =>
      calculateVerticalPayoff({
        structure: "BULL_CALL_DEBIT",
        longLeg: {
          symbol: "SPY260116C00505000",
          strike: "505.00",
          ask: "3.10",
          bid: "3.00",
        },
        shortLeg: {
          symbol: "SPY260116C00500000",
          strike: "500.00",
          ask: "5.50",
          bid: "5.40",
        },
        quantity: 1,
      })
    ).toThrow("[FAIL-CLOSED] Bull Call Debit requires long strike");
  });

  it("fails closed if debit is non-positive or exceeds spread width", () => {
    // Debit exceeds width: Ask 6.00 vs Bid 0.50 for a $5 wide spread = $5.50 debit
    expect(() =>
      calculateVerticalPayoff({
        structure: "BULL_CALL_DEBIT",
        longLeg: {
          symbol: "SPY260116C00500000",
          strike: "500.00",
          ask: "6.00",
          bid: "5.90",
        },
        shortLeg: {
          symbol: "SPY260116C00505000",
          strike: "505.00",
          ask: "0.60",
          bid: "0.50",
        },
        quantity: 1,
      })
    ).toThrow("cannot exceed or equal spread width");
  });
});
