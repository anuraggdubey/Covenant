/**
 * Snapshot accessors for fields the kernel needs but the Lane A snapshot
 * builders do not always populate yet.
 *
 * Each returns `null` when the fact is genuinely unavailable, and the calling
 * invariant abstains. That is COV-08's rule applied at the field level: we do
 * not default a missing position list to "empty" or a missing clock to "open",
 * because both defaults would silently authorise a trade we cannot justify.
 */

import type { AccountSnapshot, MarketClock, MarketSnapshot, OpenPosition } from "@/types/domain";

/** Broker clock, or null when the snapshot carries none. */
export function clockOf(market: MarketSnapshot): MarketClock | null {
  return market.clock ?? null;
}

/** Day P&L percentage (negative for a loss), or null when unavailable. */
export function dayPnlPctOf(account: AccountSnapshot): number | null {
  const value = account.dayPnlPct;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Open structures, or null when the snapshot does not carry them.
 *
 * Note the deliberate absence of a `?? []` fallback: an empty list is a claim
 * that the book is flat, and we are not entitled to make that claim from
 * missing data.
 */
export function openPositionsOf(account: AccountSnapshot): OpenPosition[] | null {
  return account.openPositions ?? null;
}

/**
 * Whether the broker considers this account blocked from trading.
 *
 * Falls back to the raw Alpaca `status` string when the explicit flag is
 * absent: anything other than ACTIVE is treated as blocked.
 */
export function isTradingBlocked(account: AccountSnapshot): boolean {
  if (typeof account.tradingBlocked === "boolean") return account.tradingBlocked;
  return account.status.toUpperCase() !== "ACTIVE";
}
