/**
 * Risk profiles — Lane C's calibrated numbers, loaded as data.
 *
 * UNIT BOUNDARY, and it is a real footgun: `docs/mandates/risk-profiles-v1.json`
 * expresses limits as FRACTIONS (0.006 = 0.6% of equity), while `Policy`
 * expresses them as PERCENT (0.6 = 0.6%). Everything on the compiler side of
 * this file speaks fractions; `toPolicyUnits` is the one place the conversion
 * happens, so a mistake has exactly one home.
 */

import profilesJson from "@/docs/mandates/risk-profiles-v1.json";
import type { RiskProfile } from "@/types/domain";

export interface ProfileLimits {
  perTradeMaxLossPct: number;
  portfolioHeatMaxLossPct: number;
  dailyHaltPct: number;
  minDte: number;
  maxDte: number;
  minDelta: number;
  maxDelta: number;
  maxQuoteAgeMs: number;
  maxBidAskWidthPct: number;
  minOpenInterest: number;
  minVolume: number;
  duplicateExposureCooldownMinutes: number;
  exitAttemptDeadlineMinutes: number;
}

interface ProfilesFile {
  schemaVersion: number;
  accountEquityUsd: number;
  profiles: Record<string, ProfileLimits>;
}

const FILE = profilesJson as unknown as ProfilesFile;

export const ACCOUNT_EQUITY_USD = FILE.accountEquityUsd;

/** Limits in FRACTION units, exactly as Lane C calibrated them. */
export function profileLimits(profile: RiskProfile): ProfileLimits {
  const limits = FILE.profiles[profile];
  if (limits === undefined) throw new Error(`Unknown risk profile: ${profile}`);
  return { ...limits };
}

/** The three fields that are ratios of equity, in fraction units. */
export const EQUITY_RATIO_FIELDS = [
  "perTradeMaxLossPct",
  "portfolioHeatMaxLossPct",
  "dailyHaltPct"
] as const;

export type EquityRatioField = (typeof EQUITY_RATIO_FIELDS)[number];

/** Fractions -> percent, for the fields Policy expresses as percent. */
export function toPolicyUnits(limits: ProfileLimits): ProfileLimits {
  return {
    ...limits,
    perTradeMaxLossPct: limits.perTradeMaxLossPct * 100,
    portfolioHeatMaxLossPct: limits.portfolioHeatMaxLossPct * 100,
    dailyHaltPct: limits.dailyHaltPct * 100,
    maxBidAskWidthPct: limits.maxBidAskWidthPct * 100
  };
}
