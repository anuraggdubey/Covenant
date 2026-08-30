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
export function reconcileSession(
  current: SessionStatus,
  clock: MarketClock,
  now: Date = new Date()
): SessionStatus {
  if (clock.sessionDate === current.sessionDate) return current;

  // A verified new trading session. This is the only path back to ACTIVE.
  void now;
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
 * `dailyHaltPct` is negative (-1.25 means -1.25%). We compare on the account's
 * own reported day P&L percentage so the check does not depend on our
 * arithmetic agreeing with the broker's.
 */
export function breachesDailyLimit(account: AccountSnapshot, dailyHaltPct: number): boolean {
  return account.dayPnlPct <= dailyHaltPct;
}

/** Convenience for the tick loop: fold a clock reading and P&L into one state. */
export function nextSessionState(
  current: SessionStatus,
  clock: MarketClock,
  account: AccountSnapshot,
  dailyHaltPct: number,
  now: Date = new Date()
): SessionStatus {
  const reconciled = reconcileSession(current, clock, now);
  if (breachesDailyLimit(account, dailyHaltPct)) {
    return halt(
      reconciled,
      `Daily loss ${account.dayPnlPct.toFixed(2)}% breached the mandate limit of ${dailyHaltPct}%.`,
      now
    );
  }
  return reconciled;
}
