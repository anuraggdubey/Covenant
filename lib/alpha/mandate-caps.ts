/**
 * Dollar loss caps for Mandate Studio.
 *
 * Policy stores equity ratios as PERCENT (0.6 = 0.6%). This is the one place
 * the studio turns those into dollars for a given equity.
 */

import Decimal from "decimal.js";

import {
  ACCOUNT_EQUITY_USD,
  profileLimits,
  toPolicyUnits,
  type ProfileLimits
} from "@/lib/mandates/profiles";
import type { RiskProfile } from "@/types/domain";

export interface DollarCaps {
  equityUsd: string;
  equitySource: "CALIBRATED" | "ACCOUNT";
  perTradeMaxLoss: string;
  portfolioHeatMaxLoss: string;
  dailyHalt: string;
  perTradeMaxLossPct: number;
  portfolioHeatMaxLossPct: number;
  dailyHaltPct: number;
  minDte: number;
  maxDte: number;
}

function usd(value: Decimal): string {
  return value.toFixed(2);
}

export function dollarCapsFromPolicyUnits(
  limits: ProfileLimits,
  equityUsd: number,
  equitySource: DollarCaps["equitySource"]
): DollarCaps {
  if (!Number.isFinite(equityUsd) || equityUsd <= 0) {
    throw new Error("[FAIL-CLOSED] Equity must be a positive finite number to size dollar caps.");
  }
  const equity = new Decimal(equityUsd);
  const perTrade = equity.times(limits.perTradeMaxLossPct).dividedBy(100);
  const heat = equity.times(limits.portfolioHeatMaxLossPct).dividedBy(100);
  const halt = equity.times(limits.dailyHaltPct).dividedBy(100);
  return {
    equityUsd: usd(equity),
    equitySource,
    perTradeMaxLoss: usd(perTrade),
    portfolioHeatMaxLoss: usd(heat),
    dailyHalt: usd(halt),
    perTradeMaxLossPct: limits.perTradeMaxLossPct,
    portfolioHeatMaxLossPct: limits.portfolioHeatMaxLossPct,
    dailyHaltPct: limits.dailyHaltPct,
    minDte: limits.minDte,
    maxDte: limits.maxDte
  };
}

export function dollarCapsForDraft(
  riskProfile: RiskProfile,
  riskOverrides: Partial<ProfileLimits>,
  equityUsd: number = ACCOUNT_EQUITY_USD,
  equitySource: DollarCaps["equitySource"] = "CALIBRATED"
): DollarCaps {
  const limits = toPolicyUnits({
    ...profileLimits(riskProfile),
    ...riskOverrides
  });
  return dollarCapsFromPolicyUnits(limits, equityUsd, equitySource);
}

export function calibratedEquityUsd(): number {
  return ACCOUNT_EQUITY_USD;
}

export interface StudioLimitInput {
  riskProfile?: RiskProfile;
  perTradeMaxLossUsd?: number;
  portfolioHeatMaxLossUsd?: number;
  /** Positive dollars; stored as a negative daily halt. */
  dailyHaltUsd?: number;
  minDte?: number;
  maxDte?: number;
}

function finitePositive(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function finiteInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value;
}

/** Convert studio dollar sliders into compiler fraction overrides. */
export function studioLimitsToOverrides(
  input: StudioLimitInput,
  equityUsd: number
): { riskProfile?: RiskProfile; riskOverrides: Partial<ProfileLimits> } {
  if (!Number.isFinite(equityUsd) || equityUsd <= 0) {
    throw new Error("[FAIL-CLOSED] Equity must be positive to convert dollar limits.");
  }
  const riskOverrides: Partial<ProfileLimits> = {};
  const perTrade = finitePositive(input.perTradeMaxLossUsd);
  const heat = finitePositive(input.portfolioHeatMaxLossUsd);
  const halt = finitePositive(input.dailyHaltUsd);
  const minDte = finiteInt(input.minDte);
  const maxDte = finiteInt(input.maxDte);
  if (perTrade !== null) riskOverrides.perTradeMaxLossPct = perTrade / equityUsd;
  if (heat !== null) riskOverrides.portfolioHeatMaxLossPct = heat / equityUsd;
  if (halt !== null) riskOverrides.dailyHaltPct = -(halt / equityUsd);
  if (minDte !== null) riskOverrides.minDte = minDte;
  if (maxDte !== null) riskOverrides.maxDte = maxDte;
  return { riskProfile: input.riskProfile, riskOverrides };
}
