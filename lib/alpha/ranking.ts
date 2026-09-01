import Decimal from "decimal.js";
import type { AccountSnapshot, OptionContractSnapshot, Policy } from "@/types/domain";
import type { CandidateSpread } from "./factory";
import { calculateVerticalPayoff, type PayoffCalculation } from "./payoff";
import type { SignalAnalysis } from "./signals";
import { perTradeFraction, portfolioHeatFraction } from "@/lib/policy-units";

export interface RankedCandidate {
  candidate: CandidateSpread;
  quantity: number;
  finalPayoff: PayoffCalculation;
  alphaScore: number;
  expectedPnl: string;
  lowerConfidenceBoundPnl: string;
  scenarioCount: number;
  portfolioHeatAfterTrade: string;
  thesis: string;
}

interface ScenarioStats {
  expectedPnlPerContract: number;
  lowerConfidenceBoundPerContract: number;
  scenarioCount: number;
}

function intrinsic(contract: OptionContractSnapshot, underlyingPrice: number): number {
  const strike = Number(contract.strike);
  return contract.type === "call"
    ? Math.max(underlyingPrice - strike, 0)
    : Math.max(strike - underlyingPrice, 0);
}

function evaluateScenarios(
  candidate: CandidateSpread,
  spot: number,
  signals: SignalAnalysis
): ScenarioStats | null {
  const returns = signals.dailyLogReturns;
  if (!signals.usable || returns.length < 20 || !Number.isFinite(spot) || spot <= 0) {
    return null;
  }

  const entry = Number(candidate.payoff.netDebitOrCreditPerShare);
  if (!Number.isFinite(entry)) return null;

  const horizon = Math.max(1, Math.min(candidate.dte, 21));
  const scenarioPnls: number[] = [];
  for (let start = 0; start < returns.length; start++) {
    let horizonReturn = 0;
    for (let day = 0; day < horizon; day++) {
      horizonReturn += returns[(start + day) % returns.length];
    }
    const terminal = spot * Math.exp(horizonReturn);
    const spreadValue =
      intrinsic(candidate.longContract, terminal) -
      intrinsic(candidate.shortContract, terminal);
    const pnl = (spreadValue - entry - 0.02) * 100;
    if (Number.isFinite(pnl)) scenarioPnls.push(pnl);
  }

  if (scenarioPnls.length < 20) return null;
  const mean = scenarioPnls.reduce((sum, pnl) => sum + pnl, 0) / scenarioPnls.length;
  const variance = scenarioPnls.reduce((sum, pnl) => sum + (pnl - mean) ** 2, 0) /
    (scenarioPnls.length - 1);
  const standardError = Math.sqrt(variance) / Math.sqrt(scenarioPnls.length);

  return {
    expectedPnlPerContract: mean,
    lowerConfidenceBoundPerContract: mean - 1.645 * standardError,
    scenarioCount: scenarioPnls.length,
  };
}

export function rankAndSizeCandidates(
  candidates: CandidateSpread[],
  policy: Policy,
  account: AccountSnapshot,
  signals: SignalAnalysis,
  underlyingPrice: string,
  modelConfidenceMultiplier = 1
): RankedCandidate[] {
  const constrainedMultiplier = Math.max(0, Math.min(1, modelConfidenceMultiplier));
  const equity = new Decimal(account.equity);
  const spot = Number(underlyingPrice);
  if (!signals.usable || constrainedMultiplier === 0 || equity.lessThanOrEqualTo(0)) return [];

  // Policy limits are PERCENT; multiplying equity needs a fraction.
  const maxRisk = equity.times(perTradeFraction(policy));
  const ranked: RankedCandidate[] = [];

  for (const candidate of candidates) {
    const scenario = evaluateScenarios(candidate, spot, signals);
    if (!scenario || scenario.lowerConfidenceBoundPerContract <= 0) continue;

    const isBullish = candidate.structure === "BULL_CALL_DEBIT" ||
      (candidate.structure === "CREDIT_VERTICAL" && candidate.longContract.type === "put");
    const isBearish = candidate.structure === "BEAR_PUT_DEBIT" ||
      (candidate.structure === "CREDIT_VERTICAL" && candidate.longContract.type === "call");
    if (signals.trend === "BULLISH" && isBearish) continue;
    if (signals.trend === "BEARISH" && isBullish) continue;
    if (candidate.structure === "CREDIT_VERTICAL" && (signals.ivPremium ?? 0) <= 0) continue;

    const oneContractMaxLoss = new Decimal(candidate.payoff.standaloneMaxLoss);
    if (oneContractMaxLoss.lessThanOrEqualTo(0)) continue;
    const rawQuantity = Math.floor(maxRisk.dividedBy(oneContractMaxLoss).toNumber());
    const quantity = Math.floor(Math.min(rawQuantity, 10) * constrainedMultiplier);
    if (quantity < 1) continue;

    let finalPayoff: PayoffCalculation;
    try {
      finalPayoff = calculateVerticalPayoff({
        structure: candidate.structure,
        longLeg: candidate.longContract,
        shortLeg: candidate.shortContract,
        quantity,
      });
    } catch {
      continue;
    }

    const currentHeat = equity.times(account.portfolioHeatPct);
    const totalHeat = currentHeat.plus(finalPayoff.standaloneMaxLoss);
    const totalHeatPct = totalHeat.dividedBy(equity);
    if (totalHeatPct.greaterThan(portfolioHeatFraction(policy))) continue;

    const expectedPnl = scenario.expectedPnlPerContract * quantity;
    const lowerBound = scenario.lowerConfidenceBoundPerContract * quantity;
    const edgeToRisk = lowerBound / Number(finalPayoff.standaloneMaxLoss);
    const alphaScore = Math.max(1, Math.min(99, Math.round(50 + edgeToRisk * 100)));

    ranked.push({
      candidate,
      quantity,
      finalPayoff,
      alphaScore,
      expectedPnl: new Decimal(expectedPnl).toFixed(2),
      lowerConfidenceBoundPnl: new Decimal(lowerBound).toFixed(2),
      scenarioCount: scenario.scenarioCount,
      portfolioHeatAfterTrade: totalHeatPct.toFixed(4),
      thesis: `${candidate.underlying} ${candidate.structure} has after-cost expected P&L $${expectedPnl.toFixed(2)} and 90% lower bound $${lowerBound.toFixed(2)} across ${scenario.scenarioCount} deterministic bootstrap scenarios. ${signals.summary}`,
    });
  }

  ranked.sort((left, right) =>
    Number(right.lowerConfidenceBoundPnl) - Number(left.lowerConfidenceBoundPnl) ||
    left.candidate.id.localeCompare(right.candidate.id)
  );
  return ranked;
}
