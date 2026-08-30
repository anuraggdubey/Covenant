import Decimal from "decimal.js";
import type { Structure, Leg } from "@/types/domain";

export interface PayoffCalculation {
  structure: Structure;
  netDebitOrCreditPerShare: string; // decimal string: positive = debit paid, negative = credit received
  limitPrice: string;              // absolute price per share to submit in limit order
  standaloneMaxLoss: string;       // total max loss in dollars for the specified quantity (decimal string)
  standaloneMaxGain: string;       // total max gain in dollars for the specified quantity (decimal string)
  breakevenUnderlying: string;     // underlying price at breakeven
  riskRewardRatio: string;
}

export interface PayoffParams {
  structure: Structure;
  longLeg: {
    symbol: string;
    strike: string;
    ask: string;
    bid: string;
  };
  shortLeg: {
    symbol: string;
    strike: string;
    ask: string;
    bid: string;
  };
  quantity: number;
  slippageBufferPerContract?: string; // default $0.02/share ($2/contract)
}

/**
 * Calculates exact standalone max loss, max gain, and limit price for defined-risk vertical spreads.
 * Uses decimal arithmetic end-to-end to prevent float rounding errors.
 */
export function calculateVerticalPayoff(params: PayoffParams): PayoffCalculation {
  const { structure, longLeg, shortLeg, quantity, slippageBufferPerContract = "0.02" } = params;

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error(`[FAIL-CLOSED] Quantity must be a positive integer, got ${quantity}`);
  }

  const longStrike = new Decimal(longLeg.strike);
  const shortStrike = new Decimal(shortLeg.strike);
  const longAsk = new Decimal(longLeg.ask);
  const shortBid = new Decimal(shortLeg.bid);
  const slippage = new Decimal(slippageBufferPerContract);
  const qtyDec = new Decimal(quantity);
  const multiplier = new Decimal(100);

  if (structure === "BULL_CALL_DEBIT") {
    // Buy lower call, sell higher call: longStrike < shortStrike
    if (!longStrike.lessThan(shortStrike)) {
      throw new Error(
        `[FAIL-CLOSED] Bull Call Debit requires long strike (${longStrike}) < short strike (${shortStrike})`
      );
    }

    const width = shortStrike.minus(longStrike);
    // Conservative entry: buy at long Ask, sell at short Bid
    const netDebit = longAsk.minus(shortBid);

    if (netDebit.lessThanOrEqualTo(0)) {
      throw new Error(`[FAIL-CLOSED] Calculated debit is non-positive: ${netDebit.toString()}`);
    }

    if (netDebit.greaterThanOrEqualTo(width)) {
      throw new Error(
        `[FAIL-CLOSED] Debit (${netDebit}) cannot exceed or equal spread width (${width})`
      );
    }

    // Limit price = net debit rounded to 2 decimals
    const limitPrice = netDebit.toFixed(2);
    
    // Standalone Max Loss = (netDebit + slippage) * 100 * qty
    const totalMaxLoss = netDebit.plus(slippage).times(multiplier).times(qtyDec);
    // Standalone Max Gain = (width - netDebit - slippage) * 100 * qty
    const totalMaxGain = width.minus(netDebit).minus(slippage).times(multiplier).times(qtyDec);
    const breakeven = longStrike.plus(netDebit);
    const riskReward = totalMaxLoss.greaterThan(0) ? totalMaxGain.dividedBy(totalMaxLoss).toFixed(2) : "0.00";

    return {
      structure,
      netDebitOrCreditPerShare: netDebit.toFixed(2),
      limitPrice,
      standaloneMaxLoss: totalMaxLoss.toFixed(2),
      standaloneMaxGain: totalMaxGain.greaterThan(0) ? totalMaxGain.toFixed(2) : "0.00",
      breakevenUnderlying: breakeven.toFixed(2),
      riskRewardRatio: riskReward,
    };
  }

  if (structure === "BEAR_PUT_DEBIT") {
    // Buy higher put, sell lower put: longStrike > shortStrike
    if (!longStrike.greaterThan(shortStrike)) {
      throw new Error(
        `[FAIL-CLOSED] Bear Put Debit requires long strike (${longStrike}) > short strike (${shortStrike})`
      );
    }

    const width = longStrike.minus(shortStrike);
    const netDebit = longAsk.minus(shortBid);

    if (netDebit.lessThanOrEqualTo(0)) {
      throw new Error(`[FAIL-CLOSED] Calculated debit is non-positive: ${netDebit.toString()}`);
    }

    if (netDebit.greaterThanOrEqualTo(width)) {
      throw new Error(
        `[FAIL-CLOSED] Debit (${netDebit}) cannot exceed or equal spread width (${width})`
      );
    }

    const limitPrice = netDebit.toFixed(2);
    const totalMaxLoss = netDebit.plus(slippage).times(multiplier).times(qtyDec);
    const totalMaxGain = width.minus(netDebit).minus(slippage).times(multiplier).times(qtyDec);
    const breakeven = longStrike.minus(netDebit);
    const riskReward = totalMaxLoss.greaterThan(0) ? totalMaxGain.dividedBy(totalMaxLoss).toFixed(2) : "0.00";

    return {
      structure,
      netDebitOrCreditPerShare: netDebit.toFixed(2),
      limitPrice,
      standaloneMaxLoss: totalMaxLoss.toFixed(2),
      standaloneMaxGain: totalMaxGain.greaterThan(0) ? totalMaxGain.toFixed(2) : "0.00",
      breakevenUnderlying: breakeven.toFixed(2),
      riskRewardRatio: riskReward,
    };
  }

  if (structure === "CREDIT_VERTICAL") {
    // Defined credit vertical: width - netCredit
    const width = longStrike.minus(shortStrike).abs();
    // Conservative: receive shortBid, pay longAsk
    const netCredit = shortBid.minus(longAsk);

    if (netCredit.lessThanOrEqualTo(0)) {
      throw new Error(`[FAIL-CLOSED] Credit spread must yield positive net credit, got ${netCredit}`);
    }

    if (netCredit.greaterThanOrEqualTo(width)) {
      throw new Error(`[FAIL-CLOSED] Net credit (${netCredit}) cannot exceed spread width (${width})`);
    }

    const limitPrice = netCredit.toFixed(2);
    const maxLossPerShare = width.minus(netCredit).plus(slippage);
    const totalMaxLoss = maxLossPerShare.times(multiplier).times(qtyDec);
    const totalMaxGain = netCredit.minus(slippage).times(multiplier).times(qtyDec);
    const riskReward = totalMaxLoss.greaterThan(0) ? totalMaxGain.dividedBy(totalMaxLoss).toFixed(2) : "0.00";

    return {
      structure,
      netDebitOrCreditPerShare: netCredit.negated().toFixed(2),
      limitPrice,
      standaloneMaxLoss: totalMaxLoss.toFixed(2),
      standaloneMaxGain: totalMaxGain.greaterThan(0) ? totalMaxGain.toFixed(2) : "0.00",
      breakevenUnderlying: "0.00",
      riskRewardRatio: riskReward,
    };
  }

  throw new Error(`[FAIL-CLOSED] Unsupported structure: ${structure}`);
}
