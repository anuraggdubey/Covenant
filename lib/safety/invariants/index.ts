/**
 * The invariant registry — the executable form of the mandate.
 *
 * Order is deliberate and is part of the behaviour:
 *   COV-08 first  — if state is unverifiable, nothing below it means anything.
 *   COV-01        — cheap self-consistency, before we reason about the intent.
 *   COV-04, 07    — session and exit gates: is the agent allowed to enter at all?
 *   COV-05, 06    — is this particular structure legal?
 *   COV-02, 03    — sizing. Last, because these are the only ones that shrink.
 *
 * The Break Me Engine (T-B8) enumerates this array, so an invariant that is
 * not registered here is not tested and cannot be claimed.
 */

import type { InvariantEvaluator } from "@/lib/safety/types";
import type { InvariantId } from "@/types/domain";

import { covenant01 } from "./cov-01";
import { covenant02 } from "./cov-02";
import { covenant03 } from "./cov-03";
import { covenant04 } from "./cov-04";
import { covenant05 } from "./cov-05";
import { covenant06 } from "./cov-06";
import { covenant07 } from "./cov-07";
import { covenant08 } from "./cov-08";

export const INVARIANT_REGISTRY: readonly InvariantEvaluator[] = [
  covenant08,
  covenant01,
  covenant04,
  covenant07,
  covenant05,
  covenant06,
  covenant02,
  covenant03
] as const;

export function evaluatorFor(id: InvariantId): InvariantEvaluator {
  const found = INVARIANT_REGISTRY.find((evaluator) => evaluator.id === id);
  if (found === undefined) throw new Error(`No evaluator registered for ${id}`);
  return found;
}

export {
  covenant01,
  covenant02,
  covenant03,
  covenant04,
  covenant05,
  covenant06,
  covenant07,
  covenant08
};
