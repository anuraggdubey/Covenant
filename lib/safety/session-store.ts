/**
 * Session state that survives between ticks.
 *
 * COV-04 is the one invariant that cannot be decided from a single snapshot:
 * "no entry after a daily halt until a verified new session" needs to know
 * what happened earlier today. So the halt lives here, reconciled against the
 * broker clock on every read.
 *
 * HONEST LIMITATION: this is process memory. A restart forgets a halt, which
 * fails OPEN — the one place in Covenant that does. It is acceptable only
 * because the scheduled tick is a single long-lived process and the daily
 * P&L check in COV-04 re-derives the breach from the account snapshot
 * independently, so a forgotten halt is re-triggered on the next tick rather
 * than lost. Moving this to the database is the correct fix and is tracked;
 * until then the limitation is written down rather than glossed.
 */

import { halt, initialSession, reconcileSession } from "@/lib/safety/session";
import type { AccountSnapshot, MarketClock, SessionStatus } from "@/types/domain";
import { breachesDailyLimit } from "@/lib/safety/session";

let current: SessionStatus | null = null;

/**
 * The session for this clock reading, reconciled.
 *
 * A HALTED session only becomes ACTIVE again when the broker reports a
 * different trading date — never on a wall-clock rollover.
 */
export function currentSession(clock: MarketClock): SessionStatus {
  current = current === null ? initialSession(clock) : reconcileSession(current, clock);
  return current;
}

/**
 * Fold the account's day P&L in, halting if the mandate limit is breached.
 *
 * Returns the session the kernel should evaluate against. Callers pass the
 * result straight into `governIntent`.
 */
export function reconcileForTick(
  clock: MarketClock,
  account: AccountSnapshot,
  dailyHaltPct: number,
  now: Date = new Date()
): { session: SessionStatus; justHalted: boolean } {
  const session = currentSession(clock);
  const breached = breachesDailyLimit(account, dailyHaltPct);

  if (breached === true && session.state === "ACTIVE") {
    const pct = account.dayPnlPct ?? 0;
    current = halt(
      session,
      `Daily loss ${pct.toFixed(2)}% breached the mandate limit of ${dailyHaltPct}%.`,
      now
    );
    return { session: current, justHalted: true };
  }

  return { session, justHalted: false };
}

/** Operator kill switch entry point. */
export function haltSession(reason: string, now: Date = new Date()): SessionStatus | null {
  if (current === null) return null;
  current = halt(current, reason, now);
  return current;
}

export function peekSession(): SessionStatus | null {
  return current;
}

/** Tests only. */
export function resetSessionForTests(): void {
  current = null;
}
