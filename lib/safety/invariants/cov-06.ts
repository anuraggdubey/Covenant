/**
 * COV-06 — No duplicate or economically equivalent exposure inside the
 * cooldown window.
 *
 * Two ways to stack the same bet, both blocked: an identical leg set (exactly
 * the same structure re-entered), and the same underlying/structure/expiry
 * family opened within the cooldown. The second is the one that actually
 * bites — an agent that re-reads the same signal every tick will otherwise
 * quietly build a position four times the size the mandate authorised.
 */

import { hashObject } from "@/lib/canonical";
import { fail, pass, type InvariantEvaluator } from "@/lib/safety/types";

export const covenant06: InvariantEvaluator = {
  id: "COV-06",
  title: "No duplicate or equivalent exposure inside the cooldown window",
  enforcedAt: "kernel",
  evaluate({ policy, intent, account, now }) {
    const incomingLegs = hashObject(
      [...intent.legs].map((l) => `${l.symbol}:${l.side}:${l.ratioQty}`).sort()
    );
    const cooldownMs = policy.duplicateExposureCooldownMinutes * 60_000;

    for (const position of account.openPositions) {
      const positionLegs = hashObject(
        [...position.legs].map((l) => `${l.symbol}:${l.side}:${l.ratioQty}`).sort()
      );

      if (positionLegs === incomingLegs) {
        return fail(
          "COV-06",
          "VETO",
          `An identical structure is already open (${position.structureId}). ` +
            `Re-entering would double the authorised exposure.`
        );
      }

      const sameFamily =
        position.underlying === intent.underlying &&
        position.structure === intent.structure &&
        position.expiry === intent.expiry;

      if (!sameFamily) continue;

      const openedAt = Date.parse(position.openedAt);
      if (!Number.isFinite(openedAt)) {
        return fail(
          "COV-06",
          "ABSTAIN",
          `Open position ${position.structureId} has an unreadable open timestamp.`
        );
      }

      const elapsed = now.getTime() - openedAt;
      if (elapsed < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - elapsed) / 60_000);
        return fail(
          "COV-06",
          "VETO",
          `Economically equivalent exposure in ${intent.underlying} ${intent.expiry} was opened ` +
            `${Math.floor(elapsed / 60_000)} minutes ago. ${remaining} minutes of cooldown remain.`
        );
      }
    }

    return pass("COV-06");
  }
};
