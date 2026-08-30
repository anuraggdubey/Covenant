/**
 * Invariant evaluation contract — Lane B, T-B1.
 *
 * Every one of COV-01…COV-08 is one evaluator in one file under
 * lib/safety/invariants/. That mapping is a submission requirement ("each
 * invariant maps to one enforced check"), so keep it one-to-one even when two
 * checks look similar enough to merge.
 *
 * An evaluator is a pure function of a snapshot context. No I/O, no clock
 * reads, no randomness — which is what makes the replay verifier able to
 * reproduce a decision months later and get the same answer.
 */

import type {
  AccountSnapshot,
  InvariantId,
  MarketSnapshot,
  Policy,
  SessionStatus,
  TradeIntent
} from "@/types/domain";

export interface InvariantContext {
  policy: Policy;
  intent: TradeIntent;
  account: AccountSnapshot;
  market: MarketSnapshot;
  session: SessionStatus;
  now: Date;
}

/** A failing evaluator says how the kernel must fail, never whether to proceed. */
export type FailureAction = "VETO" | "ABSTAIN" | "SHRINK";

export type InvariantVerdict =
  | { id: InvariantId; ok: true }
  | {
      id: InvariantId;
      ok: false;
      action: FailureAction;
      reason: string;
      /** Only meaningful when action is SHRINK. Never larger than intent.quantity. */
      shrinkTo?: number;
    };

export interface InvariantEvaluator {
  id: InvariantId;
  title: string;
  /** Where the rule is actually enforced. Shown on the Permit Console. */
  enforcedAt: "kernel" | "executor" | "position-monitor" | "candidate-factory";
  evaluate(context: InvariantContext): InvariantVerdict;
}

export function pass(id: InvariantId): InvariantVerdict {
  return { id, ok: true };
}

export function fail(
  id: InvariantId,
  action: FailureAction,
  reason: string,
  shrinkTo?: number
): InvariantVerdict {
  return { id, ok: false, action, reason, shrinkTo };
}

/**
 * Max loss for a single contract of this intent.
 *
 * `TradeIntent.standaloneMaxLoss` is the total for the intent as sized, so a
 * shrink needs the per-contract figure. Returns null when quantity is not a
 * positive integer — the caller must then abstain rather than divide.
 */
export function perContractMaxLoss(intent: TradeIntent, parse: (s: string) => bigint): bigint | null {
  if (!Number.isInteger(intent.quantity) || intent.quantity <= 0) return null;
  return parse(intent.standaloneMaxLoss) / BigInt(intent.quantity);
}
