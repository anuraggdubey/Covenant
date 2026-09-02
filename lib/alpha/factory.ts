import Decimal from "decimal.js";
import type {
  MarketSnapshot,
  Policy,
  Structure,
  Underlying,
  Leg,
  OptionContractSnapshot,
} from "@/types/domain";
import { calculateVerticalPayoff, type PayoffCalculation } from "./payoff";
import { parseOccSymbol } from "./occ";

export interface CandidateSpread {
  id: string;
  underlying: Underlying;
  structure: Structure;
  legs: Leg[];
  expiry: string;
  dte: number;
  longContract: OptionContractSnapshot;
  shortContract: OptionContractSnapshot;
  payoff: PayoffCalculation;
}

/**
 * Filters market snapshot contracts by policy criteria and generates defined-risk vertical spreads.
 *
 * Supported Structures:
 * - BULL_CALL_DEBIT: Long lower call + Short higher call
 * - BEAR_PUT_DEBIT: Long higher put + Short lower put
 * - CREDIT_VERTICAL: Bull Put Credit (Short higher put + Long lower put) or Bear Call Credit (Short lower call + Long higher call)
 *
 * Guaranteed Invariants:
 * - Emits ONLY defined-risk structures.
 * - Every contract symbol in legs is strictly present in the provided market snapshot.
 * - Stale quotes (> maxQuoteAgeMs) or excessive bid-ask widths are rejected.
 */
export function generateCandidates(
  market: MarketSnapshot,
  policy: Policy,
  quantity: number = 1
): CandidateSpread[] {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return [];
  }
  if (!policy.allowedUnderlyings.includes(market.underlying)) {
    return [];
  }

  const snapshotTimeMs = new Date(market.timestamp).getTime();
  if (!Number.isFinite(snapshotTimeMs)) {
    return [];
  }
  const validContracts: OptionContractSnapshot[] = [];

  for (const [snapshotSymbol, contract] of Object.entries(market.contracts)) {
    let parsedUnderlying: Underlying;
    try {
      parsedUnderlying = parseOccSymbol(contract.symbol).underlying;
    } catch {
      continue;
    }
    if (
      snapshotSymbol !== contract.symbol ||
      parsedUnderlying !== market.underlying
    ) {
      continue;
    }

    // 1. DTE check
    const expiryTimeMs = new Date(contract.expiration).getTime();
    if (!Number.isFinite(expiryTimeMs)) {
      continue;
    }
    const dte = Math.max(
      0,
      Math.floor((expiryTimeMs - snapshotTimeMs) / (1000 * 60 * 60 * 24))
    );
    if (dte < policy.minDte || dte > policy.maxDte) {
      continue;
    }

    // 2. Quote freshness check
    const quoteTimeMs = new Date(contract.quoteTimestamp).getTime();
    const quoteAgeMs = snapshotTimeMs - quoteTimeMs;
    if (!Number.isFinite(quoteTimeMs) || quoteAgeMs < 0 || quoteAgeMs > policy.maxQuoteAgeMs) {
      continue;
    }

    // 3. Positive bid and ask
    const bidDec = new Decimal(contract.bid);
    const askDec = new Decimal(contract.ask);
    if (bidDec.lessThanOrEqualTo(0) || askDec.lessThanOrEqualTo(bidDec)) {
      continue;
    }

    // 4. Bid-Ask spread width check
    const midDec = bidDec.plus(askDec).dividedBy(2);
    // PERCENT, to match policy.maxBidAskWidthPct and COV-05. As a bare ratio
    // this comparison was always false, which silently disabled the filter and
    // let the kernel veto candidates the factory should never have proposed.
    const widthPct = askDec.minus(bidDec).dividedBy(midDec).times(100).toNumber();
    if (widthPct > policy.maxBidAskWidthPct) {
      continue;
    }

    // 5. Delta range check
    if (contract.delta === undefined || !Number.isFinite(contract.delta)) {
      continue;
    }
    const absDelta = Math.abs(contract.delta);
    if (absDelta < policy.minDelta || absDelta > policy.maxDelta) {
      continue;
    }

    // 6. Liquidity checks
    const requiresOi = market.feed !== "indicative" || contract.openInterest > 0;
    if (
      !Number.isInteger(contract.openInterest) ||
      !Number.isFinite(contract.volume) ||
      (requiresOi && contract.openInterest < policy.minOpenInterest) ||
      contract.volume < policy.minVolume ||
      contract.bidSize <= 0 ||
      contract.askSize <= 0
    ) {
      continue;
    }

    validContracts.push(contract);
  }

  // Group by (expiration, type)
  const grouped: Record<string, OptionContractSnapshot[]> = {};
  for (const contract of validContracts) {
    const key = `${contract.expiration}_${contract.type}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(contract);
  }

  const candidates: CandidateSpread[] = [];

  for (const [key, contracts] of Object.entries(grouped)) {
    const [, type] = key.split("_") as [string, "call" | "put"];

    // Sort by strike ascending
    contracts.sort((a, b) => new Decimal(a.strike).comparedTo(new Decimal(b.strike)));

    // ==========================================
    // 1. CALL STRUCTURES
    // ==========================================
    if (type === "call") {
      // Bull Call Debit: Buy lower call, Sell higher call
      if (policy.allowedStructures.includes("BULL_CALL_DEBIT")) {
        for (let i = 0; i < contracts.length; i++) {
          for (let j = i + 1; j < Math.min(contracts.length, i + 4); j++) {
            const longCall = contracts[i];
            const shortCall = contracts[j];

            const strikeDiff = new Decimal(shortCall.strike).minus(new Decimal(longCall.strike));
            if (strikeDiff.lessThan(1) || strikeDiff.greaterThan(10)) {
              continue;
            }

            try {
              const payoff = calculateVerticalPayoff({
                structure: "BULL_CALL_DEBIT",
                longLeg: longCall,
                shortLeg: shortCall,
                quantity,
              });

              const expiryTimeMs = new Date(longCall.expiration).getTime();
              const dte = Math.max(
                0,
                Math.floor((expiryTimeMs - snapshotTimeMs) / (1000 * 60 * 60 * 24))
              );

              candidates.push({
                id: `cand_${market.underlying}_BULL_CALL_${longCall.strike}_${shortCall.strike}_${longCall.expiration}`,
                underlying: market.underlying,
                structure: "BULL_CALL_DEBIT",
                legs: [
                  {
                    symbol: longCall.symbol,
                    ratioQty: 1,
                    side: "buy",
                    positionIntent: "buy_to_open",
                  },
                  {
                    symbol: shortCall.symbol,
                    ratioQty: 1,
                    side: "sell",
                    positionIntent: "sell_to_open",
                  },
                ],
                expiry: longCall.expiration,
                dte,
                longContract: longCall,
                shortContract: shortCall,
                payoff,
              });
            } catch {
              continue;
            }
          }
        }
      }

      // Bear Call Credit: Sell lower call, Buy higher call
      if (policy.allowedStructures.includes("CREDIT_VERTICAL")) {
        for (let i = 0; i < contracts.length; i++) {
          for (let j = i + 1; j < Math.min(contracts.length, i + 4); j++) {
            const shortCall = contracts[i]; // lower strike, sold
            const longCall = contracts[j];  // higher strike, bought

            const strikeDiff = new Decimal(longCall.strike).minus(new Decimal(shortCall.strike));
            if (strikeDiff.lessThan(1) || strikeDiff.greaterThan(10)) {
              continue;
            }

            try {
              const payoff = calculateVerticalPayoff({
                structure: "CREDIT_VERTICAL",
                longLeg: longCall,
                shortLeg: shortCall,
                quantity,
              });

              const expiryTimeMs = new Date(longCall.expiration).getTime();
              const dte = Math.max(
                0,
                Math.floor((expiryTimeMs - snapshotTimeMs) / (1000 * 60 * 60 * 24))
              );

              candidates.push({
                id: `cand_${market.underlying}_BEAR_CALL_CR_${shortCall.strike}_${longCall.strike}_${longCall.expiration}`,
                underlying: market.underlying,
                structure: "CREDIT_VERTICAL",
                legs: [
                  {
                    symbol: shortCall.symbol,
                    ratioQty: 1,
                    side: "sell",
                    positionIntent: "sell_to_open",
                  },
                  {
                    symbol: longCall.symbol,
                    ratioQty: 1,
                    side: "buy",
                    positionIntent: "buy_to_open",
                  },
                ],
                expiry: longCall.expiration,
                dte,
                longContract: longCall,
                shortContract: shortCall,
                payoff,
              });
            } catch {
              continue;
            }
          }
        }
      }
    }

    // ==========================================
    // 2. PUT STRUCTURES
    // ==========================================
    if (type === "put") {
      // Bear Put Debit: Buy higher put, Sell lower put
      if (policy.allowedStructures.includes("BEAR_PUT_DEBIT")) {
        for (let i = contracts.length - 1; i >= 0; i--) {
          for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
            const longPut = contracts[i];  // higher strike, bought
            const shortPut = contracts[j]; // lower strike, sold

            const strikeDiff = new Decimal(longPut.strike).minus(new Decimal(shortPut.strike));
            if (strikeDiff.lessThan(1) || strikeDiff.greaterThan(10)) {
              continue;
            }

            try {
              const payoff = calculateVerticalPayoff({
                structure: "BEAR_PUT_DEBIT",
                longLeg: longPut,
                shortLeg: shortPut,
                quantity,
              });

              const expiryTimeMs = new Date(longPut.expiration).getTime();
              const dte = Math.max(
                0,
                Math.floor((expiryTimeMs - snapshotTimeMs) / (1000 * 60 * 60 * 24))
              );

              candidates.push({
                id: `cand_${market.underlying}_BEAR_PUT_${longPut.strike}_${shortPut.strike}_${longPut.expiration}`,
                underlying: market.underlying,
                structure: "BEAR_PUT_DEBIT",
                legs: [
                  {
                    symbol: longPut.symbol,
                    ratioQty: 1,
                    side: "buy",
                    positionIntent: "buy_to_open",
                  },
                  {
                    symbol: shortPut.symbol,
                    ratioQty: 1,
                    side: "sell",
                    positionIntent: "sell_to_open",
                  },
                ],
                expiry: longPut.expiration,
                dte,
                longContract: longPut,
                shortContract: shortPut,
                payoff,
              });
            } catch {
              continue;
            }
          }
        }
      }

      // Bull Put Credit: Sell higher put, Buy lower put
      if (policy.allowedStructures.includes("CREDIT_VERTICAL")) {
        for (let i = contracts.length - 1; i >= 0; i--) {
          for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
            const shortPut = contracts[i]; // higher strike, sold
            const longPut = contracts[j];  // lower strike, bought

            const strikeDiff = new Decimal(shortPut.strike).minus(new Decimal(longPut.strike));
            if (strikeDiff.lessThan(1) || strikeDiff.greaterThan(10)) {
              continue;
            }

            try {
              const payoff = calculateVerticalPayoff({
                structure: "CREDIT_VERTICAL",
                longLeg: longPut,
                shortLeg: shortPut,
                quantity,
              });

              const expiryTimeMs = new Date(longPut.expiration).getTime();
              const dte = Math.max(
                0,
                Math.floor((expiryTimeMs - snapshotTimeMs) / (1000 * 60 * 60 * 24))
              );

              candidates.push({
                id: `cand_${market.underlying}_BULL_PUT_CR_${shortPut.strike}_${longPut.strike}_${longPut.expiration}`,
                underlying: market.underlying,
                structure: "CREDIT_VERTICAL",
                legs: [
                  {
                    symbol: shortPut.symbol,
                    ratioQty: 1,
                    side: "sell",
                    positionIntent: "sell_to_open",
                  },
                  {
                    symbol: longPut.symbol,
                    ratioQty: 1,
                    side: "buy",
                    positionIntent: "buy_to_open",
                  },
                ],
                expiry: longPut.expiration,
                dte,
                longContract: longPut,
                shortContract: shortPut,
                payoff,
              });
            } catch {
              continue;
            }
          }
        }
      }
    }
  }

  return candidates;
}
