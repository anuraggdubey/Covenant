import Decimal from "decimal.js";
import type {
  Policy,
  AccountSnapshot,
} from "@/types/domain";
import type { CandidateSpread } from "./factory";
import { calculateVerticalPayoff, type PayoffCalculation } from "./payoff";
import type { SignalAnalysis } from "./signals";

export interface RankedCandidate {
  candidate: CandidateSpread;
  quantity: number;
  finalPayoff: PayoffCalculation;
  alphaScore: number;
  portfolioHeatAfterTrade: string;
  thesis: string;
}

/**
 * Sizes, scores, and ranks candidates against policy risk limits and market signals.
 */
export function rankAndSizeCandidates(
  candidates: CandidateSpread[],
  policy: Policy,
  account: AccountSnapshot,
  signals: SignalAnalysis,
  modelConfidenceMultiplier: number = 1.0
): RankedCandidate[] {
  // Constrain model multiplier to [0, 1] — model can only shrink or veto
  const constrainedMultiplier = Math.max(0, Math.min(1, modelConfidenceMultiplier));
  if (constrainedMultiplier === 0) {
    return [];
  }

  const equityDec = new Decimal(account.equity);
  if (equityDec.lessThanOrEqualTo(0)) {
    return [];
  }

  const maxRiskPerTradeDollars = equityDec.times(new Decimal(policy.perTradeMaxLossPct));
  const ranked: RankedCandidate[] = [];

  for (const cand of candidates) {
    const singleContractMaxLoss = new Decimal(cand.payoff.standaloneMaxLoss);
    if (singleContractMaxLoss.lessThanOrEqualTo(0)) {
      continue;
    }

    // Maximum contracts allowed under perTradeMaxLossPct
    const rawMaxQty = Math.floor(
      maxRiskPerTradeDollars.dividedBy(singleContractMaxLoss).toNumber()
    );
    if (rawMaxQty < 1) {
      continue;
    }

    // Cap at reasonable max per order (e.g. 10 contracts) and apply confidence shrink
    const baseQty = Math.min(rawMaxQty, 10);
    const finalQty = Math.floor(baseQty * constrainedMultiplier);
    if (finalQty < 1) {
      continue;
    }

    // Recalculate exact payoff for the final quantity
    let finalPayoff: PayoffCalculation;
    try {
      finalPayoff = calculateVerticalPayoff({
        structure: cand.structure,
        longLeg: cand.longContract,
        shortLeg: cand.shortContract,
        quantity: finalQty,
      });
    } catch {
      continue;
    }

    // Check portfolio heat ceiling
    const existingHeatDollars = equityDec.times(new Decimal(account.portfolioHeatPct));
    const newTradeMaxLossDollars = new Decimal(finalPayoff.standaloneMaxLoss);
    const totalHeatDollars = existingHeatDollars.plus(newTradeMaxLossDollars);
    const totalHeatPct = totalHeatDollars.dividedBy(equityDec).toNumber();

    if (totalHeatPct > policy.portfolioHeatMaxLossPct) {
      continue;
    }

    // Calculate alpha score (0 - 100)
    let score = 50;

    // 1. Trend alignment
    if (cand.structure === "BULL_CALL_DEBIT") {
      if (signals.trend === "BULLISH") score += 25;
      else if (signals.trend === "BEARISH") score -= 25;
    } else if (cand.structure === "BEAR_PUT_DEBIT") {
      if (signals.trend === "BEARISH") score += 25;
      else if (signals.trend === "BULLISH") score -= 25;
    }

    // 2. Risk/Reward ratio
    const rr = Number(finalPayoff.riskRewardRatio);
    if (rr >= 1.0) score += 15;
    else if (rr < 0.5) score -= 10;

    // 3. DTE sweet spot (14 - 35 days)
    if (cand.dte >= 14 && cand.dte <= 35) score += 10;

    const clampedScore = Math.max(1, Math.min(99, score));

    const thesis = `${cand.underlying} ${cand.structure} (${cand.longContract.strike}/${cand.shortContract.strike} exp ${cand.expiry}) sized to ${finalQty} contracts. Standalone Max Loss: $${finalPayoff.standaloneMaxLoss}, Alpha Score: ${clampedScore}. ${signals.summary}`;

    ranked.push({
      candidate: cand,
      quantity: finalQty,
      finalPayoff,
      alphaScore: clampedScore,
      portfolioHeatAfterTrade: totalHeatPct.toFixed(4),
      thesis,
    });
  }

  // Sort by alpha score descending
  ranked.sort((a, b) => b.alphaScore - a.alphaScore);

  return ranked;
}
