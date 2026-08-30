import Decimal from "decimal.js";
import type { Policy, Leg } from "@/types/domain";

export interface OpenPositionState {
  symbol: string;
  underlying: string;
  qty: number;
  entryPrice: string;
  currentPrice: string;
  unrealizedPnl: string;
  expiry: string;
  dte: number;
  legs: Leg[];
  exitWorkflow?: {
    initiatedAt: string;
    attempts: number;
    lastStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "FAILED";
  };
}

export interface PositionExitEvaluation {
  shouldExit: boolean;
  action: "HOLD" | "EXIT_PROFIT_TARGET" | "EXIT_STOP_LOSS" | "EXIT_EXPIRATION_DEADLINE" | "ESCALATE";
  reason: string;
  suggestedExitLegs?: Leg[];
}

/**
 * Evaluates open multi-leg positions against policy exit rules.
 */
export function evaluatePositionExit(
  position: OpenPositionState,
  policy: Policy,
  evaluatedAt: string = new Date().toISOString()
): PositionExitEvaluation {
  const entryDec = new Decimal(position.entryPrice);
  const currentDec = new Decimal(position.currentPrice);
  const pnlDec = new Decimal(position.unrealizedPnl);
  if (
    !Number.isInteger(position.qty) || position.qty === 0 ||
    !Number.isInteger(position.dte) ||
    !entryDec.isFinite() || entryDec.lessThanOrEqualTo(0) ||
    !currentDec.isFinite() || currentDec.isNegative() ||
    !pnlDec.isFinite() ||
    position.legs.length < 2
  ) {
    return {
      shouldExit: true,
      action: "ESCALATE",
      reason: "[FAIL-CLOSED] Position state is missing or inconsistent; disable new entries and escalate.",
    };
  }

  const suggestedExitLegs = position.legs.map((leg): Leg => ({
    ...leg,
    side: leg.side === "buy" ? "sell" : "buy",
    positionIntent: leg.positionIntent === "buy_to_open"
      ? "sell_to_close"
      : leg.positionIntent === "sell_to_open"
        ? "buy_to_close"
        : leg.positionIntent,
  }));

  if (position.exitWorkflow) {
    const initiatedAt = Date.parse(position.exitWorkflow.initiatedAt);
    const now = Date.parse(evaluatedAt);
    const deadlineMs = policy.exitAttemptDeadlineMinutes * 60_000;
    if (
      !Number.isFinite(initiatedAt) ||
      !Number.isFinite(now) ||
      (now - initiatedAt >= deadlineMs && position.exitWorkflow.lastStatus !== "ACCEPTED")
    ) {
      return {
        shouldExit: true,
        action: "ESCALATE",
        reason: `[FAIL-CLOSED] Exit workflow missed its ${policy.exitAttemptDeadlineMinutes}-minute acceptance deadline after ${position.exitWorkflow.attempts} attempt(s).`,
        suggestedExitLegs,
      };
    }
  }

  // Start no later than one calendar day before expiration to avoid assignment-day dependence.
  if (position.dte <= 1) {
    return {
      shouldExit: true,
      action: "EXIT_EXPIRATION_DEADLINE",
      reason: `Position reached the pre-expiration exit boundary (DTE: ${position.dte}).`,
      suggestedExitLegs,
    };
  }

  const entryValue = entryDec.times(Math.abs(position.qty)).times(100);

  if (entryValue.greaterThan(0)) {
    const returnPct = pnlDec.dividedBy(entryValue).toNumber();

    // 50% profit target
    if (returnPct >= 0.50) {
      return {
        shouldExit: true,
        action: "EXIT_PROFIT_TARGET",
        reason: `Target profit reached (+${(returnPct * 100).toFixed(1)}%). Closing position to harvest gain.`,
        suggestedExitLegs,
      };
    }

    // 100% stop loss
    if (returnPct <= -1.00) {
      return {
        shouldExit: true,
        action: "EXIT_STOP_LOSS",
        reason: `Stop loss threshold triggered (${(returnPct * 100).toFixed(1)}%). Closing position.`,
        suggestedExitLegs,
      };
    }
  }

  return {
    shouldExit: false,
    action: "HOLD",
    reason: `Position within acceptable risk bounds (DTE: ${position.dte}, Unrealized P&L: $${position.unrealizedPnl}).`,
  };
}
