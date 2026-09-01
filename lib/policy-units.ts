/**
 * Policy unit convention — read this before touching a risk limit.
 *
 * `Policy` expresses the three equity-ratio limits as PERCENT:
 *
 *     perTradeMaxLossPct: 0.6   means 0.6% of equity
 *     portfolioHeatMaxLossPct: 2.5
 *     dailyHaltPct: -1.25
 *
 * That is what `types/domain.ts` documents, what the mandate compiler emits
 * (`lib/mandates/profiles.ts` converts Lane C's fractions once, on the way
 * in), and what the Safety Kernel's `money.pctOf` expects.
 *
 * Any code that wants to multiply equity directly needs a FRACTION, so it
 * goes through this file. The alternative — each call site dividing by 100
 * from memory — is how the lanes drifted apart in the first place: the alpha
 * engine sized on 0.006 as a fraction while the kernel read 0.006 as a
 * percent, which is a 100x disagreement about how much money to risk. It
 * showed up as "the kernel vetoes everything", which is the lucky failure.
 * The unlucky one is the same bug in the other direction.
 */

import type { Policy } from "@/types/domain";

const PERCENT = 100;

/** Fraction of equity at risk on one trade. 0.6% -> 0.006 */
export function perTradeFraction(policy: Policy): number {
  return policy.perTradeMaxLossPct / PERCENT;
}

/** Fraction of equity allowed as total open defined-risk. 2.5% -> 0.025 */
export function portfolioHeatFraction(policy: Policy): number {
  return policy.portfolioHeatMaxLossPct / PERCENT;
}

/** Negative fraction at which the session halts. -1.25% -> -0.0125 */
export function dailyHaltFraction(policy: Policy): number {
  return policy.dailyHaltPct / PERCENT;
}

/**
 * Sanity check for a policy arriving from anywhere.
 *
 * These are guard rails, not validation: a mandate is free to set 0.35% or
 * 4%. What they catch is a value that has obviously been handed over in the
 * wrong unit — 0.006 meaning "0.6%" would size a hundred times too small,
 * and 60 meaning "0.6" would size a hundred times too large.
 */
export function looksLikeFractionUnits(policy: Policy): boolean {
  return (
    policy.perTradeMaxLossPct > 0 &&
    policy.perTradeMaxLossPct < 0.05 &&
    policy.portfolioHeatMaxLossPct > 0 &&
    policy.portfolioHeatMaxLossPct < 0.2
  );
}

export function assertPercentUnits(policy: Policy, where: string): void {
  if (looksLikeFractionUnits(policy)) {
    throw new Error(
      `${where}: policy risk limits look like fractions ` +
        `(perTrade=${policy.perTradeMaxLossPct}, heat=${policy.portfolioHeatMaxLossPct}). ` +
        `Policy expresses these as PERCENT — 0.6 means 0.6%. See lib/policy-units.ts.`
    );
  }
}
