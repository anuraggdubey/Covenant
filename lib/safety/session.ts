/**
 * Session state machine — Lane B, T-B2.
 *
 * COV-04: no entry after a daily halt until a VERIFIED new session.
 *
 * The v2 concept lock explicitly corrected v1 here: this is a tested state
 * transition, not a temporal-logic operator and not a timestamp comparison.
 * "It is a new calendar day" is not good enough — the reset requires a new
 * `sessionDate` read from Alpaca's clock, because a date rollover in the
 * host's timezone is not a trading session.
 */

import { dayPnlPctOf } from "@/lib/safety/state";
import type { AccountSnapshot, MarketClock, SessionStatus } from "@/types/domain";

export function initialSession(clock: MarketClock): SessionStatus {
  return { state: "ACTIVE", sessionDate: clock.sessionDate, haltedAt: null, haltReason: null };
}

/**
 * Advance the session for a fresh clock reading.
 *
 * A HALTED session becomes ACTIVE only when the broker reports a different
 * trading date than the one the halt was recorded against.
 */
export function reconcileSession(current: SessionStatus, clock: MarketClock): SessionStatus {
  if (clock.sessionDate === current.sessionDate) return current;

  // A verified new trading session. This is the only path back to ACTIVE.
  return { state: "ACTIVE", sessionDate: clock.sessionDate, haltedAt: null, haltReason: null };
}

export function halt(current: SessionStatus, reason: string, now: Date = new Date()): SessionStatus {
  if (current.state === "HALTED") return current;
  return {
    state: "HALTED",
    sessionDate: current.sessionDate,
    haltedAt: now.toISOString(),
    haltReason: reason
  };
}

/**
 * Has the account breached the mandate's daily loss limit?
 *
 * Returns null when the snapshot carries no day P&L — the caller must abstain
 * rather than read "unknown" as "fine".
 */
export function breachesDailyLimit(
  account: AccountSnapshot,
  dailyHaltPct: number
): boolean | null {
  const pct = dayPnlPctOf(account);
  if (pct === null) return null;
  return pct <= dailyHaltPct;
}

/** Convenience for the tick loop: fold a clock reading and P&L into one state. */
export function nextSessionState(
  current: SessionStatus,
  clock: MarketClock,
  account: AccountSnapshot,
  dailyHaltPct: number,
  now: Date = new Date()
): SessionStatus {
  const reconciled = reconcileSession(current, clock);
  const breached = breachesDailyLimit(account, dailyHaltPct);
  if (breached === true) {
    const pct = dayPnlPctOf(account) ?? 0;
    return halt(
      reconciled,
      `Daily loss ${pct.toFixed(2)}% breached the mandate limit of ${dailyHaltPct}%.`,
      now
    );
  }
  return reconciled;
}
