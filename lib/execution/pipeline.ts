/**
 * The join: proposal -> kernel -> permit -> executor, with the journal
 * recording every step.
 *
 * Until this file existed the two halves of Covenant were both finished and
 * not connected: the alpha engine proposed, and the kernel and executor were
 * exercised only by tests. This is the seam, and it is deliberately thin —
 * it makes no decisions of its own. It moves a decision between the two
 * modules that are allowed to make one, and writes down what happened.
 *
 * Submission is opt-in. `submit: false` runs the full governance path,
 * issues a real signed permit, and stops before the broker call. That is the
 * right default for a scheduled job: a cron that silently starts trading
 * because a credential appeared in the environment is not an agent anyone
 * should trust.
 */

import { EventJournal } from "@/lib/audit/journal";
import { submit as submitOrder, type ExecutorResult, type OrderTransport } from "@/lib/execution/executor";
import { assertPercentUnits } from "@/lib/policy-units";
import type { NonceStore } from "@/lib/permits/nonce";
import { evaluate } from "@/lib/safety/kernel";
import type {
  AccountSnapshot,
  Decision,
  MarketSnapshot,
  Policy,
  SessionStatus,
  TradeIntent,
  TradePermit
} from "@/types/domain";

export interface GovernOptions {
  account: AccountSnapshot;
  market: MarketSnapshot;
  session: SessionStatus;
  journal: EventJournal;
  nonceStore: NonceStore;
  /** Opt-in. When false the permit is issued but no order is sent. */
  submit: boolean;
  transport?: OrderTransport;
  now?: Date;
  privateKeyPem?: string;
  publicKeyPem?: string;
  ttlSeconds?: number;
}

export interface GovernResult {
  decision: Decision;
  reason: string;
  failedInvariants: string[];
  /** Present whenever the kernel authorised something. */
  permit?: TradePermit;
  /** The intent the permit is bound to — smaller than the request on a SHRINK. */
  finalIntent?: TradeIntent;
  shrunkQuantity?: number;
  /** Present only when submission was attempted. */
  execution?:
    | { submitted: true; orderId: string; requestId: string }
    | { submitted: false; code: string; reason: string };
  /** True when a permit exists but submission was deliberately not attempted. */
  heldForOperator: boolean;
}

function isRejection(result: ExecutorResult): result is Extract<ExecutorResult, { rejected: true }> {
  return "rejected" in result;
}

export async function governIntent(
  intent: TradeIntent,
  policy: Policy,
  options: GovernOptions
): Promise<GovernResult> {
  // Catches a policy handed over in fraction units before it silently sizes
  // a hundred times wrong in either direction.
  assertPercentUnits(policy, "governIntent");

  const now = options.now ?? new Date();
  const { journal } = options;

  journal.append("TRADE_INTENT_CREATED", { intent }, "alpha");

  // A kernel that cannot sign must ABSTAIN, not throw. Losing the signing key
  // is exactly the "unverifiable state" COV-08 exists for, and a crash here
  // would take down the whole tick instead of declining one trade.
  let decision;
  try {
    decision = await evaluate(intent, policy, {
      account: options.account,
      market: options.market,
      session: options.session,
      now,
      nonceStore: options.nonceStore,
      privateKeyPem: options.privateKeyPem,
      ttlSeconds: options.ttlSeconds
    });
  } catch (error) {
    const reason = `[FAIL-CLOSED] Safety Kernel could not complete: ${
      error instanceof Error ? error.message : String(error)
    }`;
    journal.append(
      "KERNEL_ABSTAINED",
      { intent, reason, now: now.toISOString(), decision: "ABSTAIN", failedInvariants: ["COV-08"] },
      "safety-kernel"
    );
    return {
      decision: "ABSTAIN",
      reason,
      failedInvariants: ["COV-08"],
      heldForOperator: false
    };
  }

  const decisionPayload = {
    policy,
    // The intent the kernel evaluated — the verifier re-runs the registry on
    // this one, so failedInvariants reproduces exactly.
    intent,
    finalIntent: decision.finalIntent ?? intent,
    account: options.account,
    market: options.market,
    session: options.session,
    now: now.toISOString(),
    decision: decision.decision,
    failedInvariants: decision.failedInvariants,
    reason: decision.reason,
    permit: decision.permit
  };

  const base: GovernResult = {
    decision: decision.decision,
    reason: decision.reason,
    failedInvariants: decision.failedInvariants,
    permit: decision.permit,
    finalIntent: decision.finalIntent,
    shrunkQuantity: decision.shrunkQuantity,
    heldForOperator: false
  };

  // --- Refusals stop here, and are recorded as loudly as approvals --------
  if (decision.permit === undefined || decision.finalIntent === undefined) {
    journal.append(
      decision.decision === "ABSTAIN" ? "KERNEL_ABSTAINED" : "KERNEL_REJECTED",
      decisionPayload,
      "safety-kernel"
    );
    return base;
  }

  journal.append("PERMIT_SIGNED", decisionPayload, "safety-kernel");
  if (decision.decision === "SHRINK") {
    journal.append(
      "MODEL_SHRANK",
      {
        requestedQuantity: intent.quantity,
        grantedQuantity: decision.finalIntent.quantity,
        reason: decision.reason
      },
      "safety-kernel"
    );
  }

  // --- Submission is opt-in ----------------------------------------------
  if (!options.submit) {
    return {
      ...base,
      heldForOperator: true,
      reason:
        `${decision.reason} Permit issued and held: submission is opt-in ` +
        `(set COVENANT_LIVE_SUBMIT=true).`
    };
  }

  const result = await submitOrder(decision.permit, decision.finalIntent, {
    transport: options.transport,
    nonceStore: options.nonceStore,
    activePolicy: policy,
    publicKeyPem: options.publicKeyPem,
    now
  });

  if (isRejection(result)) {
    journal.append(
      "PERMIT_VALIDATED",
      { permitId: decision.permit.permitId, accepted: false, code: result.code, reason: result.reason },
      "permit-executor"
    );
    return {
      ...base,
      execution: { submitted: false, code: result.code, reason: result.reason }
    };
  }

  journal.append(
    "ORDER_SUBMITTED",
    {
      permit: decision.permit,
      intent: decision.finalIntent,
      order: result.payload,
      orderId: result.orderId,
      requestId: result.requestId
    },
    "permit-executor"
  );
  journal.append(
    "ORDER_ACCEPTED",
    { orderId: result.orderId, requestId: result.requestId },
    "permit-executor"
  );

  return {
    ...base,
    execution: { submitted: true, orderId: result.orderId, requestId: result.requestId }
  };
}
