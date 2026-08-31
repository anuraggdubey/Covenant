/**
 * Kill switch — Lane B, T-B6.
 *
 * Halts new entries immediately and, on request, cancels open orders. It
 * fails CLOSED in the strong sense: if cancelling orders throws, the halt
 * still stands. The one thing that must never happen is an error path that
 * leaves the agent trading, so the halt is applied before anything that can
 * fail is attempted.
 *
 * Requires the operator to type a confirmation phrase. Not security theatre —
 * this is reachable from a route handler, and "POST to halt everything" with
 * no confirmation is a footgun during a live demo.
 */

import { halt } from "@/lib/safety/session";
import type { SessionStatus } from "@/types/domain";

export interface OrderCanceller {
  /** Returns the ids it actually cancelled. */
  cancelAllOrders(): Promise<string[]>;
}

export interface KillSwitchRequest {
  confirmation: string;
  reason: string;
  cancelOpenOrders?: boolean;
}

export interface KillSwitchResult {
  halted: boolean;
  session: SessionStatus;
  cancelledOrderIds: string[];
  /** Populated when cancellation failed. The halt still applies. */
  cancellationError?: string;
  message: string;
}

export class KillSwitchRefused extends Error {}

function expectedConfirmation(): string {
  const raw = process.env.KILL_SWITCH_CONFIRMATION;
  return raw === undefined || raw.trim() === "" ? "COVENANT_HALT" : raw.trim();
}

export async function engageKillSwitch(
  request: KillSwitchRequest,
  session: SessionStatus,
  options: { canceller?: OrderCanceller; now?: Date } = {}
): Promise<KillSwitchResult> {
  if (request.confirmation !== expectedConfirmation()) {
    // Nothing changes. An unconfirmed kill switch must not half-apply.
    throw new KillSwitchRefused(
      "Kill switch not engaged: confirmation phrase did not match. Nothing was changed."
    );
  }

  const now = options.now ?? new Date();

  // Halt FIRST. Everything below this line is allowed to fail.
  const halted = halt(session, `Kill switch: ${request.reason}`, now);

  if (request.cancelOpenOrders !== true || options.canceller === undefined) {
    return {
      halted: true,
      session: halted,
      cancelledOrderIds: [],
      message: "New entries halted. Open orders left in place."
    };
  }

  try {
    const cancelledOrderIds = await options.canceller.cancelAllOrders();
    return {
      halted: true,
      session: halted,
      cancelledOrderIds,
      message: `New entries halted. Cancelled ${cancelledOrderIds.length} open order(s).`
    };
  } catch (error) {
    return {
      halted: true,
      session: halted,
      cancelledOrderIds: [],
      cancellationError: error instanceof Error ? error.message : "unknown cancellation error",
      message:
        "New entries halted. Order cancellation FAILED — open positions may remain. " +
        "Close them manually in Alpaca."
    };
  }
}

/** A halted session is only cleared by a verified new market session. */
export function isHalted(session: SessionStatus): boolean {
  return session.state === "HALTED";
}
