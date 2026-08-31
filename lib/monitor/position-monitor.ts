import Decimal from "decimal.js";
import type { Policy, Leg } from "@/types/domain";
import type { AlpacaReadClient } from "@/lib/alpaca/client";
import { parseOccSymbol } from "@/lib/alpha/occ";

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

/** Raw Alpaca position from /v2/positions. */
export interface AlpacaPositionResponse {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  asset_marginable: boolean;
  qty: string;
  avg_entry_price: string;
  side: "long" | "short";
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
  qty_available: string;
}

export interface PositionMonitorResult {
  timestamp: string;
  positions: Array<{
    position: OpenPositionState;
    evaluation: PositionExitEvaluation;
  }>;
  summary: {
    total: number;
    holdCount: number;
    exitCount: number;
    escalateCount: number;
    errorCount: number;
  };
}

export interface PositionExitEvaluation {
  shouldExit: boolean;
  action: "HOLD" | "EXIT_PROFIT_TARGET" | "EXIT_STOP_LOSS" | "EXIT_EXPIRATION_DEADLINE" | "ESCALATE";
  reason: string;
  suggestedExitLegs?: Leg[];
}

interface ParsedOptionPosition {
  raw: AlpacaPositionResponse;
  parsed: ReturnType<typeof parseOccSymbol>;
  qty: number;
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
    !Number.isInteger(position.qty) ||
    position.qty === 0 ||
    !Number.isInteger(position.dte) ||
    !entryDec.isFinite() ||
    entryDec.lessThanOrEqualTo(0) ||
    !currentDec.isFinite() ||
    currentDec.isNegative() ||
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

    if (returnPct >= 0.50) {
      return {
        shouldExit: true,
        action: "EXIT_PROFIT_TARGET",
        reason: `Target profit reached (+${(returnPct * 100).toFixed(1)}%). Closing position to harvest gain.`,
        suggestedExitLegs,
      };
    }

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

function buildEscalatedMonitorResult(timestamp: string, reason: string): PositionMonitorResult {
  return {
    timestamp,
    positions: [
      {
        position: {
          symbol: "POSITION_STATE_UNAVAILABLE",
          underlying: "UNKNOWN",
          qty: 1,
          entryPrice: "1.00",
          currentPrice: "0.00",
          unrealizedPnl: "0.00",
          expiry: timestamp.slice(0, 10),
          dte: 0,
          legs: [],
        },
        evaluation: {
          shouldExit: true,
          action: "ESCALATE",
          reason,
        },
      },
    ],
    summary: { total: 1, holdCount: 0, exitCount: 0, escalateCount: 1, errorCount: 1 },
  };
}

function groupOptionPositions(optionPositions: AlpacaPositionResponse[], now: string): OpenPositionState[] {
  const parsedPositions: ParsedOptionPosition[] = [];

  for (const raw of optionPositions) {
    try {
      const qty = Number.parseInt(raw.qty, 10);
      if (!Number.isInteger(qty) || qty === 0) {
        continue;
      }
      parsedPositions.push({
        raw,
        parsed: parseOccSymbol(raw.symbol),
        qty,
      });
    } catch {
      continue;
    }
  }

  const groups = new Map<string, ParsedOptionPosition[]>();
  for (const position of parsedPositions) {
    const key = `${position.parsed.underlying}_${position.parsed.expiration}_${position.parsed.type}`;
    const group = groups.get(key) ?? [];
    group.push(position);
    groups.set(key, group);
  }

  const openPositions: OpenPositionState[] = [];
  for (const [key, group] of groups) {
    const first = group[0];
    const legs = group
      .sort((left, right) => new Decimal(left.parsed.strike).comparedTo(right.parsed.strike))
      .map(({ raw, qty }): Leg => ({
        symbol: raw.symbol,
        ratioQty: Math.abs(qty),
        side: raw.side === "long" ? "buy" : "sell",
        positionIntent: raw.side === "long" ? "buy_to_open" : "sell_to_open",
      }));

    const expiryDate = new Date(first.parsed.expiration);
    const nowDate = new Date(now);
    const dte = Math.max(0, Math.ceil((expiryDate.getTime() - nowDate.getTime()) / 86_400_000));
    const totalCostBasis = group.reduce((sum, item) => sum.plus(item.raw.cost_basis), new Decimal(0));
    const totalMarketValue = group.reduce((sum, item) => sum.plus(item.raw.market_value), new Decimal(0));
    const totalPnl = group.reduce((sum, item) => sum.plus(item.raw.unrealized_pl), new Decimal(0));
    const totalContracts = group.reduce((sum, item) => sum + Math.abs(item.qty), 0);
    const effectiveQty = Math.max(1, Math.min(...group.map((item) => Math.abs(item.qty))));
    const entryPrice = totalContracts > 0
      ? totalCostBasis.abs().dividedBy(totalContracts).dividedBy(100)
      : new Decimal(0);
    const currentPrice = totalContracts > 0
      ? totalMarketValue.abs().dividedBy(totalContracts).dividedBy(100)
      : new Decimal(0);

    openPositions.push({
      symbol: key,
      underlying: first.parsed.underlying,
      qty: effectiveQty,
      entryPrice: entryPrice.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      unrealizedPnl: totalPnl.toFixed(2),
      expiry: first.parsed.expiration,
      dte,
      legs,
    });
  }

  return openPositions;
}

/**
 * Fetches open positions from Alpaca and evaluates each for exit actions.
 * This is Lane A's read-only position monitoring: it observes and evaluates
 * but never submits orders. Exits still require Lane B's Permit Executor.
 */
export async function monitorPositions(
  client: AlpacaReadClient,
  policy: Policy,
  evaluatedAt?: string
): Promise<PositionMonitorResult> {
  const now = evaluatedAt ?? new Date().toISOString();

  if (client.isMockMode()) {
    return {
      timestamp: now,
      positions: [],
      summary: { total: 0, holdCount: 0, exitCount: 0, escalateCount: 0, errorCount: 0 },
    };
  }

  try {
    const positions = await client.getPositions();
    const optionPositions = positions.filter(
      (position) => position.asset_class === "us_option" || position.symbol.length > 10
    );
    const openPositions = groupOptionPositions(optionPositions, now);
    const results: PositionMonitorResult["positions"] = [];
    let holdCount = 0;
    let exitCount = 0;
    let escalateCount = 0;

    for (const openPosition of openPositions) {
      const evaluation = evaluatePositionExit(openPosition, policy, now);
      results.push({ position: openPosition, evaluation });

      if (evaluation.action === "ESCALATE") escalateCount++;
      else if (evaluation.shouldExit) exitCount++;
      else holdCount++;
    }

    return {
      timestamp: now,
      positions: results,
      summary: {
        total: results.length,
        holdCount,
        exitCount,
        escalateCount,
        errorCount: 0,
      },
    };
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return buildEscalatedMonitorResult(
      now,
      `[FAIL-CLOSED] Position state could not be fetched or verified; disable new entries and escalate. ${detail}`
    );
  }
}
