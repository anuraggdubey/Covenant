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
  policy: Policy
): PositionExitEvaluation {
  // 1. Expiration Deadline Rule: if DTE is at or below deadline
  if (position.dte <= 0) {
    return {
      shouldExit: true,
      action: "EXIT_EXPIRATION_DEADLINE",
      reason: `Position at expiration (DTE: ${position.dte}). Mandatory exit before assignment.`,
    };
  }

  // 2. Profit target (e.g. 50% of credit/max gain) & Stop loss
  const pnlDec = new Decimal(position.unrealizedPnl);
  const entryDec = new Decimal(position.entryPrice).times(Math.abs(position.qty)).times(100);

  if (entryDec.greaterThan(0)) {
    const returnPct = pnlDec.dividedBy(entryDec).toNumber();

    // 50% profit target
    if (returnPct >= 0.50) {
      return {
        shouldExit: true,
        action: "EXIT_PROFIT_TARGET",
        reason: `Target profit reached (+${(returnPct * 100).toFixed(1)}%). Closing position to harvest gain.`,
      };
    }

    // 100% stop loss
    if (returnPct <= -1.00) {
      return {
        shouldExit: true,
        action: "EXIT_STOP_LOSS",
        reason: `Stop loss threshold triggered (${(returnPct * 100).toFixed(1)}%). Closing position.`,
      };
    }
  }

  return {
    shouldExit: false,
    action: "HOLD",
    reason: `Position within acceptable risk bounds (DTE: ${position.dte}, Unrealized P&L: $${position.unrealizedPnl}).`,
  };
}
