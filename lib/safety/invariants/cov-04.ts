/**
 * COV-04 — No entry after a daily halt until a verified new session.
 *
 * The enforcement lives in the state machine (lib/safety/session.ts); this
 * evaluator is the pre-trade gate that reads it. Note the third branch: if
 * the session state we were handed belongs to a different trading date than
 * the clock we just read, we do not silently reset — we abstain and make the
 * caller reconcile. Fail closed beats a convenient assumption.
 */

import { breachesDailyLimit } from "@/lib/safety/session";
import { fail, pass, type InvariantEvaluator } from "@/lib/safety/types";

export const covenant04: InvariantEvaluator = {
  id: "COV-04",
  title: "No entry after daily halt until a verified new session",
  enforcedAt: "kernel",
  evaluate({ policy, account, market, session }) {
    if (session.sessionDate !== market.clock.sessionDate) {
      return fail(
        "COV-04",
        "ABSTAIN",
        `Session state is recorded against ${session.sessionDate} but the broker clock reads ` +
          `${market.clock.sessionDate}. Reconcile before trading.`
      );
    }

    if (session.state === "HALTED") {
      return fail(
        "COV-04",
        "VETO",
        `Trading halted for ${session.sessionDate}: ${session.haltReason ?? "daily limit reached"}.`
      );
    }

    if (breachesDailyLimit(account, policy.dailyHaltPct)) {
      return fail(
        "COV-04",
        "VETO",
        `Daily loss ${account.dayPnlPct.toFixed(2)}% has breached the mandate limit of ` +
          `${policy.dailyHaltPct}%. Halting entries for the session.`
      );
    }

    return pass("COV-04");
  }
};
