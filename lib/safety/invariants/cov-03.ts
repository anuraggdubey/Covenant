/**
 * COV-03 — The conservative sum of standalone max losses stays under the
 * portfolio heat cap.
 *
 * Deliberately a conservative upper bound, per the v2 concept lock: true
 * portfolio risk across overlapping option positions is hard, and a number
 * we cannot verify is worse than a number that overstates risk. Summing
 * standalone defined-risk envelopes is easy to check and never understates.
 *
 * Note we sum the envelopes ourselves rather than trusting the snapshot's
 * precomputed `portfolioHeatPct`. The invariant has to be checkable from the
 * facts, not from someone else's arithmetic.
 */

import * as money from "@/lib/money";
import { openPositionsOf } from "@/lib/safety/state";
import { fail, pass, perContractMaxLoss, type InvariantEvaluator } from "@/lib/safety/types";

export const covenant03: InvariantEvaluator = {
  id: "COV-03",
  title: "Portfolio heat stays under the mandate cap",
  enforcedAt: "kernel",
  evaluate({ policy, intent, account }) {
    const positions = openPositionsOf(account);
    if (positions === null) {
      return fail(
        "COV-03",
        "ABSTAIN",
        "Account snapshot carries no open-position list, so portfolio heat cannot be summed."
      );
    }

    let equity: bigint;
    let incoming: bigint;
    let openRisk: bigint;
    try {
      equity = money.parse(account.equity);
      incoming = money.parse(intent.standaloneMaxLoss);
      openRisk = money.sum(positions.map((p) => money.parse(p.standaloneMaxLoss)));
    } catch {
      return fail("COV-03", "ABSTAIN", "Open position risk could not be summed from the snapshot.");
    }

    const cap = money.pctOf(equity, policy.portfolioHeatMaxLossPct);
    const headroom = cap - openRisk;

    if (headroom <= 0n) {
      return fail(
        "COV-03",
        "VETO",
        `Portfolio heat is already at ${money.format(openRisk)} against a cap of ` +
          `${money.format(cap)}. No new risk may be added.`
      );
    }

    if (incoming <= headroom) return pass("COV-03");

    const perContract = perContractMaxLoss(intent, money.parse);
    if (perContract === null || perContract <= 0n) {
      return fail("COV-03", "ABSTAIN", "Cannot derive per-contract risk from this intent.");
    }

    const affordable = Number(headroom / perContract);
    if (affordable >= 1 && affordable < intent.quantity) {
      return fail(
        "COV-03",
        "SHRINK",
        `Adding ${money.format(incoming)} would exceed portfolio heat headroom of ` +
          `${money.format(headroom)}. Shrinking to ${affordable}.`,
        affordable
      );
    }

    return fail(
      "COV-03",
      "VETO",
      `Portfolio heat headroom is ${money.format(headroom)}; one contract risks ` +
        `${money.format(perContract)}. No size fits.`
    );
  }
};
