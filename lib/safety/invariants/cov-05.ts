/**
 * COV-05 — Quote age, bid/ask width, DTE, delta, and liquidity stay inside
 * the mandate bands.
 *
 * Every leg is checked against the contract as it appeared in the market
 * snapshot the decision was made on. A leg we cannot find in that snapshot is
 * not a warning — it means we are about to trade something we never observed,
 * so we abstain.
 *
 * Stale quotes abstain; out-of-band parameters veto. The difference matters:
 * stale data might be fine in a second, an out-of-band strike never will be.
 */

import * as money from "@/lib/money";
import { fail, pass, type InvariantEvaluator } from "@/lib/safety/types";
import type { OptionContractSnapshot } from "@/types/domain";

function widthPct(contract: OptionContractSnapshot): number | null {
  try {
    const bid = money.parse(contract.bid);
    const ask = money.parse(contract.ask);
    if (ask <= 0n || bid < 0n || ask < bid) return null;
    const mid = (ask + bid) / 2n;
    if (mid <= 0n) return null;
    return Number(((ask - bid) * 10_000n) / mid) / 100;
  } catch {
    return null;
  }
}

export const covenant05: InvariantEvaluator = {
  id: "COV-05",
  title: "Quote age, spread width, DTE, delta and liquidity inside mandate bands",
  enforcedAt: "kernel",
  evaluate({ policy, intent, market, now }) {
    if (!policy.allowedUnderlyings.includes(intent.underlying)) {
      return fail(
        "COV-05",
        "VETO",
        `${intent.underlying} is outside the mandate universe ` +
          `(${policy.allowedUnderlyings.join(", ")}).`
      );
    }

    if (intent.dte < policy.minDte || intent.dte > policy.maxDte) {
      return fail(
        "COV-05",
        "VETO",
        `DTE ${intent.dte} is outside the mandate band ${policy.minDte}-${policy.maxDte}.`
      );
    }

    for (const leg of intent.legs) {
      const contract = market.contracts[leg.symbol];
      if (contract === undefined) {
        return fail(
          "COV-05",
          "ABSTAIN",
          `Contract ${leg.symbol} is absent from the market snapshot this decision was made on.`
        );
      }

      const quoteAgeMs = now.getTime() - Date.parse(contract.quoteTimestamp);
      if (!Number.isFinite(quoteAgeMs) || quoteAgeMs > policy.maxQuoteAgeMs) {
        const age = Number.isFinite(quoteAgeMs) ? `${quoteAgeMs}ms` : "of unknown age";
        return fail(
          "COV-05",
          "ABSTAIN",
          `Quote for ${leg.symbol} is ${age}, beyond the ${policy.maxQuoteAgeMs}ms freshness band.`
        );
      }

      const width = widthPct(contract);
      if (width === null) {
        return fail("COV-05", "ABSTAIN", `Quote for ${leg.symbol} is unusable (crossed or empty).`);
      }
      if (width > policy.maxBidAskWidthPct) {
        return fail(
          "COV-05",
          "VETO",
          `${leg.symbol} spread is ${width.toFixed(2)}% wide, above the ` +
            `${policy.maxBidAskWidthPct}% band. Fills would leak the edge.`
        );
      }

      const requiresOi = market.feed !== "indicative" || contract.openInterest > 0;
      if (requiresOi && contract.openInterest < policy.minOpenInterest) {
        return fail(
          "COV-05",
          "VETO",
          `${leg.symbol} open interest ${contract.openInterest} is below the minimum ` +
            `${policy.minOpenInterest}.`
        );
      }
      if (contract.volume < policy.minVolume) {
        return fail(
          "COV-05",
          "VETO",
          `${leg.symbol} volume ${contract.volume} is below the minimum ${policy.minVolume}.`
        );
      }

      if (contract.delta === undefined || !Number.isFinite(contract.delta)) {
        return fail("COV-05", "ABSTAIN", `No delta available for ${leg.symbol}.`);
      }
      const absDelta = Math.abs(contract.delta);
      if (absDelta < policy.minDelta || absDelta > policy.maxDelta) {
        return fail(
          "COV-05",
          "VETO",
          `${leg.symbol} delta ${absDelta.toFixed(3)} is outside the mandate band ` +
            `${policy.minDelta}-${policy.maxDelta}.`
        );
      }
    }

    return pass("COV-05");
  }
};
