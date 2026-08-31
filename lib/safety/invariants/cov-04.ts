/**
 * COV-04 — No entry after a daily halt until a verified new session.
 *
 * The enforcement lives in the state machine (lib/safety/session.ts); this
 * evaluator is the pre-trade gate that reads it. Note the branches that
 * abstain rather than reset: if the session state we hold belongs to a
 * different trading date than the clock we just read, we make the caller
 * reconcile instead of silently deciding a new session began. Fail closed
 * beats a convenient assumption.
 */

import { breachesDailyLimit } from "@/lib/safety/session";
import { clockOf, dayPnlPctOf } from "@/lib/safety/state";
import { fail, pass, type InvariantEvaluator } from "@/lib/safety/types";

export const covenant04: InvariantEvaluator = {
  id: "COV-04",
  title: "No entry after daily halt until a verified new session",
  enforcedAt: "kernel",
  evaluate({ policy, account, market, session }) {
    const clock = clockOf(market);
    if (clock === null) {
      return fail(
        "COV-04",
        "ABSTAIN",
        "Market snapshot carries no broker clock, so the trading session cannot be verified."
      );
    }

    if (session.sessionDate !== clock.sessionDate) {
      return fail(
        "COV-04",
        "ABSTAIN",
        `Session state is recorded against ${session.sessionDate} but the broker clock reads ` +
          `${clock.sessionDate}. Reconcile before trading.`
      );
    }

    if (session.state === "HALTED") {
      return fail(
        "COV-04",
        "VETO",
        `Trading halted for ${session.sessionDate}: ${session.haltReason ?? "daily limit reached"}.`
      );
    }

    const breached = breachesDailyLimit(account, policy.dailyHaltPct);
    if (breached === null) {
      return fail(
        "COV-04",
        "ABSTAIN",
        "Account snapshot carries no day P&L, so the daily halt cannot be evaluated."
      );
    }
    if (breached) {
      const pct = dayPnlPctOf(account) ?? 0;
      return fail(
        "COV-04",
        "VETO",
        `Daily loss ${pct.toFixed(2)}% has breached the mandate limit of ` +
          `${policy.dailyHaltPct}%. Halting entries for the session.`
      );
    }

    return pass("COV-04");
  }
};
