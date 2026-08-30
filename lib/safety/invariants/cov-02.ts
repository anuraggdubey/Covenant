/**
 * COV-02 — Every structure has a finite standalone max loss within the
 * per-trade cap.
 *
 * This is the invariant the whole defined-risk pivot exists to make true.
 * "Finite" is not decoration: an unparseable, zero, or negative max loss is
 * an unbounded structure as far as we are concerned, and we abstain rather
 * than assume.
 *
 * A breach of the cap shrinks before it vetoes — a shrink can only ever
 * reduce quantity (IMPLEMENTATION.md §3).
 */

import * as money from "@/lib/money";
import { fail, pass, perContractMaxLoss, type InvariantEvaluator } from "@/lib/safety/types";

export const covenant02: InvariantEvaluator = {
  id: "COV-02",
  title: "Finite standalone max loss within the per-trade cap",
  enforcedAt: "kernel",
  evaluate({ policy, intent, account }) {
    if (!policy.allowedStructures.includes(intent.structure)) {
      return fail(
        "COV-02",
        "VETO",
        `Structure ${intent.structure} is not permitted by the active mandate.`
      );
    }

    let maxLoss: bigint;
    let equity: bigint;
    try {
      maxLoss = money.parse(intent.standaloneMaxLoss);
      equity = money.parse(account.equity);
    } catch {
      return fail("COV-02", "ABSTAIN", "Max loss or account equity is not a valid decimal.");
    }

    if (maxLoss <= 0n) {
      return fail(
        "COV-02",
        "VETO",
        `Standalone max loss must be finite and positive; got ${intent.standaloneMaxLoss}.`
      );
    }

    const cap = money.pctOf(equity, policy.perTradeMaxLossPct);
    if (maxLoss <= cap) return pass("COV-02");

    const perContract = perContractMaxLoss(intent, money.parse);
    if (perContract === null || perContract <= 0n) {
      return fail("COV-02", "ABSTAIN", "Cannot derive per-contract risk from this intent.");
    }

    const affordable = Number(cap / perContract);
    if (affordable >= 1 && affordable < intent.quantity) {
      return fail(
        "COV-02",
        "SHRINK",
        `Max loss ${money.format(maxLoss)} exceeds the per-trade cap ${money.format(cap)} ` +
          `(${policy.perTradeMaxLossPct}% of equity). Shrinking to ${affordable}.`,
        affordable
      );
    }

    return fail(
      "COV-02",
      "VETO",
      `A single contract risks ${money.format(perContract)}, above the per-trade cap ` +
        `${money.format(cap)}. No size clears the mandate.`
    );
  }
};
