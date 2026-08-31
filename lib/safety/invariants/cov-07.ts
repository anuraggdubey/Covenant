/**
 * COV-07 — The exit workflow starts before the configured deadline; failed
 * closes escalate and disable new entries.
 *
 * The workflow itself is the Position Monitor's job (Lane A). What is enforced
 * here is the second half of the sentence: while a position is past the point
 * where it should have been closed, the agent may not open anything new. An
 * agent that keeps entering while it cannot exit is exactly the failure mode
 * the mandate exists to prevent.
 *
 * The v2 concept lock corrected v1 here: we guarantee a close ATTEMPT and an
 * escalation, never a fill. A fill is the broker's to give.
 */

import { openPositionsOf } from "@/lib/safety/state";
import { fail, pass, type InvariantEvaluator } from "@/lib/safety/types";

export const covenant07: InvariantEvaluator = {
  id: "COV-07",
  title: "Exit workflow starts before deadline; failures disable new entries",
  enforcedAt: "position-monitor",
  evaluate({ account }) {
    const positions = openPositionsOf(account);
    if (positions === null) {
      return fail(
        "COV-07",
        "ABSTAIN",
        "Account snapshot carries no open-position list, so exit deadlines cannot be checked."
      );
    }

    const overdue = positions.filter((position) => position.dte <= 0);

    if (overdue.length > 0) {
      const names = overdue.map((p) => p.structureId).join(", ");
      return fail(
        "COV-07",
        "VETO",
        `${overdue.length} position(s) are past their close deadline (${names}). ` +
          `New entries are disabled until the exit workflow clears or escalates them.`
      );
    }

    return pass("COV-07");
  }
};
