/**
 * COV-08 — Any missing, stale, inconsistent, or unverified state returns
 * ABSTAIN.
 *
 * The invariant that makes the other seven trustworthy. If the snapshots the
 * decision was computed on are not the snapshots we are holding, every other
 * check was performed against fiction.
 *
 * This evaluator runs FIRST in the registry order. One authority violation is
 * folded in — a model confidence multiplier outside [0,1] — because a model
 * that tried to widen has produced state we will not act on either.
 */

import { computeAccountSnapshotHash, computeMarketSnapshotHash } from "@/lib/hashes";
import { clockOf, isTradingBlocked } from "@/lib/safety/state";
import { fail, pass, type InvariantEvaluator } from "@/lib/safety/types";

export const covenant08: InvariantEvaluator = {
  id: "COV-08",
  title: "Missing, stale, inconsistent or unverified state returns ABSTAIN",
  enforcedAt: "kernel",
  evaluate({ policy, intent, account, market, now }) {
    if (policy.status !== "ACTIVE") {
      return fail("COV-08", "VETO", `Policy ${policy.id} is ${policy.status}, not ACTIVE.`);
    }
    if (intent.policyHash !== policy.policyHash) {
      return fail(
        "COV-08",
        "ABSTAIN",
        "Intent was generated under a different policy version than the active one."
      );
    }

    if (isTradingBlocked(account)) {
      return fail(
        "COV-08",
        "VETO",
        `The broker reports this account as unavailable for trading (status ${account.status}).`
      );
    }
    if (account.optionsLevel < 3) {
      return fail(
        "COV-08",
        "VETO",
        `Account options level is ${account.optionsLevel}; multi-leg defined-risk ` +
          `spreads need level 3.`
      );
    }

    const clock = clockOf(market);
    if (clock === null) {
      return fail("COV-08", "ABSTAIN", "Market snapshot carries no broker clock.");
    }
    if (!clock.isOpen) {
      return fail("COV-08", "ABSTAIN", "The market is closed. No entry is attempted.");
    }

    // The snapshots must be the ones the intent was computed against...
    if (intent.marketSnapshotHash !== market.snapshotHash) {
      return fail(
        "COV-08",
        "ABSTAIN",
        "Market state changed between candidate generation and permit evaluation."
      );
    }
    if (intent.accountSnapshotHash !== account.snapshotHash) {
      return fail(
        "COV-08",
        "ABSTAIN",
        "Account state changed between candidate generation and permit evaluation."
      );
    }

    // ...and each snapshot must match its own recorded hash.
    if (computeMarketSnapshotHash(market) !== market.snapshotHash) {
      return fail("COV-08", "ABSTAIN", "Market snapshot does not match its own hash.");
    }
    if (computeAccountSnapshotHash(account) !== account.snapshotHash) {
      return fail("COV-08", "ABSTAIN", "Account snapshot does not match its own hash.");
    }

    const expiresAt = Date.parse(intent.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return fail("COV-08", "ABSTAIN", "Intent has an unreadable expiry.");
    }
    if (now.getTime() >= expiresAt) {
      return fail("COV-08", "ABSTAIN", `Intent expired at ${intent.expiresAt}; it is now stale.`);
    }

    const multiplier = intent.modelConfidenceMultiplier;
    if (!Number.isFinite(multiplier) || multiplier < 0 || multiplier > 1) {
      return fail(
        "COV-08",
        "VETO",
        `Model confidence multiplier ${multiplier} is outside [0,1]. A model may only shrink.`
      );
    }

    return pass("COV-08");
  }
};
