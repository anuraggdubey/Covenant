/**
 * Reconstructing the open book in the shape the invariants need.
 *
 * COV-03 sums `standaloneMaxLoss` across open positions, COV-06 reads legs
 * and `openedAt`, COV-07 reads `dte`. Alpaca returns none of that directly —
 * it returns individual option legs — so this is where a held structure is
 * turned back into a defined-risk envelope.
 *
 * The rule throughout: when a value cannot be derived, return null and let
 * the caller abstain. A position we cannot price is not a position we are
 * entitled to trade around.
 */

import Decimal from "decimal.js";

import { parseOccSymbol } from "@/lib/alpha/occ";
import type { OpenPositionState } from "@/lib/monitor/position-monitor";
import type { Leg, OpenPosition, Structure, Underlying } from "@/types/domain";

const CONTRACT_MULTIPLIER = 100;

interface LegWithStrike {
  leg: Leg;
  strike: Decimal;
  type: "call" | "put";
}

function withStrikes(legs: Leg[]): LegWithStrike[] | null {
  const out: LegWithStrike[] = [];
  for (const leg of legs) {
    try {
      const parsed = parseOccSymbol(leg.symbol);
      const strike = new Decimal(parsed.strike);
      if (!strike.isFinite() || strike.lessThanOrEqualTo(0)) return null;
      out.push({ leg, strike, type: parsed.type });
    } catch {
      return null;
    }
  }
  return out;
}

/**
 * Classify a two-leg vertical.
 *
 * A long call below a short call is a bull call debit; a long put above a
 * short put is a bear put debit. Anything else that is still a legal vertical
 * collects premium, so it is a credit spread — and credit spreads are where
 * the max-loss arithmetic actually matters.
 */
export function classifyVertical(legs: LegWithStrike[]): Structure | null {
  if (legs.length !== 2) return null;

  const [a, b] = legs as [LegWithStrike, LegWithStrike];
  if (a.type !== b.type) return null; // a diagonal or straddle is not ours

  const long = a.leg.side === "buy" ? a : b.leg.side === "buy" ? b : null;
  const short = a.leg.side === "sell" ? a : b.leg.side === "sell" ? b : null;
  if (long === null || short === null) return null; // both same side: not a vertical
  if (long.strike.equals(short.strike)) return null;

  if (long.type === "call") {
    return long.strike.lessThan(short.strike) ? "BULL_CALL_DEBIT" : "CREDIT_VERTICAL";
  }
  return long.strike.greaterThan(short.strike) ? "BEAR_PUT_DEBIT" : "CREDIT_VERTICAL";
}

/**
 * Maximum loss for one contract of a vertical, in dollars.
 *
 *   debit  — the premium paid is the whole risk.
 *   credit — the spread width less the credit received.
 *
 * `netPricePerContract` is the absolute net entry price per contract, which
 * is what the position monitor reports. Returns null rather than guessing.
 */
export function verticalMaxLossPerContract(
  structure: Structure,
  legs: LegWithStrike[],
  netPricePerContract: Decimal
): Decimal | null {
  if (!netPricePerContract.isFinite() || netPricePerContract.isNegative()) return null;
  const [a, b] = legs as [LegWithStrike, LegWithStrike];
  const width = a.strike.minus(b.strike).abs();
  if (!width.isFinite() || width.lessThanOrEqualTo(0)) return null;

  if (structure === "CREDIT_VERTICAL") {
    const risk = width.minus(netPricePerContract);
    // A credit larger than the width means we have mispriced something.
    // Fall back to the full width, which can only overstate the risk.
    const bounded = risk.greaterThan(0) ? risk : width;
    return bounded.times(CONTRACT_MULTIPLIER);
  }

  // Debit: the most that can be lost is what was paid, and it can never
  // exceed the width, so clamp for safety against a bad entry price.
  const paid = netPricePerContract.greaterThan(width) ? width : netPricePerContract;
  return paid.times(CONTRACT_MULTIPLIER);
}

/**
 * Convert one monitored position into the kernel's view of it.
 * Returns null when any required value cannot be derived.
 */
export function toOpenPosition(state: OpenPositionState, now: string): OpenPosition | null {
  const legs = withStrikes(state.legs);
  if (legs === null || legs.length !== 2) return null;

  const structure = classifyVertical(legs);
  if (structure === null) return null;

  if (!Number.isInteger(state.qty) || state.qty <= 0) return null;
  if (!Number.isInteger(state.dte)) return null;

  const entry = new Decimal(state.entryPrice);
  const perContract = verticalMaxLossPerContract(structure, legs, entry);
  if (perContract === null) return null;

  const underlying = state.underlying as Underlying;
  if (underlying !== "SPY" && underlying !== "QQQ") return null;

  return {
    structureId: state.symbol,
    underlying,
    structure,
    legs: state.legs,
    quantity: state.qty,
    standaloneMaxLoss: perContract.times(state.qty).toFixed(2),
    /**
     * Alpaca's positions endpoint carries no open timestamp, so we record the
     * observation time. That is deliberately conservative for COV-06: the
     * cooldown treats an old position as freshly opened, which over-blocks
     * re-entry rather than under-blocking it. Deriving a true open time needs
     * /v2/account/activities and is the honest next improvement.
     */
    openedAt: now,
    expiry: state.expiry,
    dte: state.dte
  };
}

/**
 * The whole book, or nothing.
 *
 * One unpriceable position invalidates the portfolio-heat sum, so a partial
 * list would let COV-03 authorise risk it could not see. All or abstain.
 */
export function toOpenPositions(
  states: OpenPositionState[],
  now: string
): { positions: OpenPosition[] } | { unresolved: string[] } {
  const positions: OpenPosition[] = [];
  const unresolved: string[] = [];

  for (const state of states) {
    const mapped = toOpenPosition(state, now);
    if (mapped === null) unresolved.push(state.symbol);
    else positions.push(mapped);
  }

  return unresolved.length > 0 ? { unresolved } : { positions };
}
