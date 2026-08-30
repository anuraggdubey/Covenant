/**
 * COV-01 — Every order exactly matches one unexpired, unused permit.
 *
 * Enforced at the EXECUTOR, not here. lib/execution/executor.ts checks
 * signature, TTL, nonce, and exact-intent binding before any network call,
 * and tests/execution/executor.attacks.test.ts is the proof.
 *
 * What the kernel can contribute pre-trade is the precondition that makes
 * that binding meaningful: the intent must match its own hash, because the
 * permit is about to be bound to that hash. An intent that is already
 * internally inconsistent must never reach signing.
 */

import { computeIntentHash } from "@/lib/hashes";
import { fail, pass, type InvariantEvaluator } from "@/lib/safety/types";

export const covenant01: InvariantEvaluator = {
  id: "COV-01",
  title: "Every order exactly matches one unexpired, unused permit",
  enforcedAt: "executor",
  evaluate({ intent }) {
    if (computeIntentHash(intent) !== intent.intentHash) {
      return fail(
        "COV-01",
        "ABSTAIN",
        "Intent does not match its own hash, so no permit can be bound to it."
      );
    }
    return pass("COV-01");
  }
};
