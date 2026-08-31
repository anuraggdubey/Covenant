/**
 * Permit Executor — Lane B, T-B4.
 *
 * THIS IS THE ONLY MODULE IN THE REPOSITORY THAT MAY WRITE ORDERS TO ALPACA.
 * IMPLEMENTATION.md §1 non-negotiable 1, §3, §5.
 *
 * `grep -rn "ALPACA_API_SECRET_KEY" lib/` must return this file and
 * lib/alpaca/client.ts (read path) and nothing else. In particular nothing
 * under lib/alpha/** may appear.
 *
 * The executor does not trust the kernel. It recomputes the intent hash and
 * re-verifies the signature rather than assuming whoever called it did its
 * job. Every rejection happens before any network call — that ordering is the
 * demo, so the tests assert the transport was never touched.
 */

import { hashObject } from "@/lib/canonical";
import { getServerEnv } from "@/lib/env/server";
import { computeIntentHash } from "@/lib/hashes";
import { defaultNonceStore, type NonceStore } from "@/lib/permits/nonce";
import { isExpired, verifyPermitSignature } from "@/lib/permits/verify";
import * as money from "@/lib/money";
import type { Policy, TradeIntent, TradePermit } from "@/types/domain";

export type RejectionCode =
  | "PERMIT_MISSING"
  | "PUBLIC_KEY_MISSING"
  | "SIGNATURE_INVALID"
  | "PERMIT_EXPIRED"
  | "NONCE_UNKNOWN"
  | "NONCE_REPLAYED"
  | "INTENT_TAMPERED"
  | "INTENT_HASH_MISMATCH"
  | "POLICY_HASH_MISMATCH"
  | "ACCOUNT_SNAPSHOT_MISMATCH"
  | "MARKET_SNAPSHOT_MISMATCH"
  | "LEGS_MUTATED"
  | "QUANTITY_EXCEEDS_PERMIT"
  | "PRICE_OUTSIDE_BAND"
  | "UNSUPPORTED_ORDER_SHAPE"
  | "BROKER_ERROR";

export interface OrderLegPayload {
  symbol: string;
  ratio_qty: string;
  side: "buy" | "sell";
  position_intent: string;
}

export interface MlegOrderPayload {
  order_class: "mleg";
  qty: string;
  type: "limit";
  limit_price: string;
  time_in_force: "day";
  client_order_id: string;
  legs: OrderLegPayload[];
}

export interface OrderTransport {
  submitOrder(payload: MlegOrderPayload): Promise<{ orderId: string; requestId: string }>;
}

export interface ExecutorOptions {
  transport?: OrderTransport;
  nonceStore?: NonceStore;
  /** When supplied, the permit must also match the currently ACTIVE policy. */
  activePolicy?: Policy;
  now?: Date;
  publicKeyPem?: string;
}

export type ExecutorResult =
  | { orderId: string; requestId: string; payload: MlegOrderPayload }
  | { rejected: true; code: RejectionCode; reason: string };

function reject(code: RejectionCode, reason: string): ExecutorResult {
  return { rejected: true, code, reason };
}

/** Alpaca client_order_id charset is conservative; the nonce suffix is hex. */
function clientOrderId(permit: TradePermit): string {
  const suffix = permit.nonce.split(":").pop() ?? permit.permitId.replace(/-/g, "");
  return `cov_${suffix}`.slice(0, 48);
}

function toOrderPayload(permit: TradePermit, intent: TradeIntent): MlegOrderPayload {
  return {
    order_class: "mleg",
    qty: String(intent.quantity),
    type: "limit",
    limit_price: intent.limitPrice,
    time_in_force: "day",
    client_order_id: clientOrderId(permit),
    // Legs come from the PERMIT, not the intent. The permit is what was signed.
    legs: permit.exactLegs.map((leg) => ({
      symbol: leg.symbol,
      ratio_qty: String(leg.ratioQty),
      side: leg.side,
      position_intent: leg.positionIntent
    }))
  };
}

/**
 * Validate a permit against an intent and, only if every check passes, submit
 * the exact matching multi-leg paper order.
 *
 * Checks run cheapest-first, but the ordering that matters is that all of them
 * run before `transport.submitOrder`.
 */
export async function submit(
  permit: TradePermit | null | undefined,
  intent: TradeIntent,
  options: ExecutorOptions = {}
): Promise<ExecutorResult> {
  const now = options.now ?? new Date();
  const nonceStore = options.nonceStore ?? defaultNonceStore;

  // 1. A permit must exist at all. "The agent tried to trade without one."
  if (permit === null || permit === undefined) {
    return reject("PERMIT_MISSING", "No permit accompanied this order. Nothing to authorise it.");
  }

  // 2. Signature. Catches any mutation of the permit itself.
  const signature = verifyPermitSignature(permit, { publicKeyPem: options.publicKeyPem });
  if (!signature.ok) {
    if (signature.failure === "PUBLIC_KEY_MISSING") {
      return reject(
        "PUBLIC_KEY_MISSING",
        "PERMIT_SIGNING_PUBLIC_KEY is not configured. The executor cannot verify, so it refuses."
      );
    }
    return reject(
      "SIGNATURE_INVALID",
      `Permit signature did not verify (${signature.failure}). The permit was altered or forged.`
    );
  }

  // 3. TTL.
  if (isExpired(permit, now)) {
    return reject(
      "PERMIT_EXPIRED",
      `Permit expired at ${permit.expiresAt}; it is now ${now.toISOString()}. Authority is not durable.`
    );
  }

  // 4. Nonce must be known and unspent. Checked before consuming so that a
  //    later validation failure cannot burn a legitimate permit.
  const nonceState = await nonceStore.state(permit.nonce);
  if (nonceState === "UNKNOWN") {
    return reject(
      "NONCE_UNKNOWN",
      "Permit nonce was never issued by this kernel. The permit did not originate here."
    );
  }
  if (nonceState === "USED") {
    return reject("NONCE_REPLAYED", "Permit nonce has already been spent. Replay rejected.");
  }

  // 5. The intent must be self-consistent: its stored hash must match its body.
  if (computeIntentHash(intent) !== intent.intentHash) {
    return reject(
      "INTENT_TAMPERED",
      "Intent body does not match its own hash. It was modified after creation."
    );
  }

  // 6. …and the permit must be bound to THIS intent.
  if (permit.intentHash !== intent.intentHash) {
    return reject(
      "INTENT_HASH_MISMATCH",
      "Permit authorises a different intent than the one submitted."
    );
  }

  // 7. Policy binding.
  if (permit.policyHash !== intent.policyHash) {
    return reject("POLICY_HASH_MISMATCH", "Permit and intent disagree about the governing policy.");
  }
  if (options.activePolicy !== undefined) {
    if (
      permit.policyHash !== options.activePolicy.policyHash ||
      permit.policyId !== options.activePolicy.id ||
      permit.policyVersion !== options.activePolicy.version
    ) {
      return reject(
        "POLICY_HASH_MISMATCH",
        "Permit was issued under a policy that is no longer the active one."
      );
    }
  }

  // 8. Snapshot binding — the state the decision was made on.
  if (permit.accountSnapshotHash !== intent.accountSnapshotHash) {
    return reject("ACCOUNT_SNAPSHOT_MISMATCH", "Permit is bound to a different account snapshot.");
  }
  if (permit.marketSnapshotHash !== intent.marketSnapshotHash) {
    return reject("MARKET_SNAPSHOT_MISMATCH", "Permit is bound to a different market snapshot.");
  }

  // 9. Exact legs, in order. Swapping a contract shows up here.
  if (hashObject(permit.exactLegs) !== hashObject(intent.legs)) {
    return reject(
      "LEGS_MUTATED",
      "Order legs do not exactly match the permitted legs. Contract substitution rejected."
    );
  }

  // 10. Quantity ceiling. A permit can only ever shrink, so > is fatal.
  if (!Number.isInteger(intent.quantity) || intent.quantity <= 0) {
    return reject("UNSUPPORTED_ORDER_SHAPE", `Quantity must be a positive integer.`);
  }
  if (intent.quantity > permit.maxQuantity) {
    return reject(
      "QUANTITY_EXCEEDS_PERMIT",
      `Order quantity ${intent.quantity} exceeds permitted maximum ${permit.maxQuantity}.`
    );
  }

  // 11. Price band.
  let withinBand: boolean;
  try {
    withinBand = money.withinBand(
      money.parse(intent.limitPrice),
      money.parse(permit.limitPriceBand.min),
      money.parse(permit.limitPriceBand.max)
    );
  } catch {
    return reject("PRICE_OUTSIDE_BAND", "Limit price or permit band is not a valid decimal.");
  }
  if (!withinBand) {
    return reject(
      "PRICE_OUTSIDE_BAND",
      `Limit price ${intent.limitPrice} is outside the permitted band ` +
        `[${permit.limitPriceBand.min}, ${permit.limitPriceBand.max}].`
    );
  }

  // 12. Order shape we are willing to send at all.
  if (intent.timeInForce !== "day") {
    return reject("UNSUPPORTED_ORDER_SHAPE", `Only day orders are permitted.`);
  }
  if (permit.exactLegs.length < 2 || permit.exactLegs.length > 4) {
    return reject(
      "UNSUPPORTED_ORDER_SHAPE",
      `A defined-risk vertical has 2 legs; got ${permit.exactLegs.length}.`
    );
  }

  // 13. Spend the nonce. Everything above passed, so this is a real attempt.
  const consumed = await nonceStore.consume(permit.nonce);
  if (consumed !== "CONSUMED") {
    return reject(
      "NONCE_REPLAYED",
      "Permit nonce was spent concurrently. Only one order may use a permit."
    );
  }

  // 14. Only now does anything leave the process.
  const payload = toOrderPayload(permit, intent);
  const transport = options.transport ?? alpacaPaperTransport();
  try {
    const { orderId, requestId } = await transport.submitOrder(payload);
    return { orderId, requestId, payload };
  } catch (error) {
    return reject("BROKER_ERROR", sanitiseBrokerError(error));
  }
}

/** Provider errors never reach the browser raw. */
function sanitiseBrokerError(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown broker error";
  return message.replace(/[A-Za-z0-9/+]{24,}/g, "[redacted]").slice(0, 300);
}

/**
 * Default transport: Alpaca paper Trading API.
 *
 * The credential read lives here, inside the executor module, so the
 * capability boundary is a grep away from being audited.
 */
export function alpacaPaperTransport(): OrderTransport {
  return {
    async submitOrder(payload: MlegOrderPayload) {
      const keyId = process.env.ALPACA_API_KEY_ID;
      const secret = process.env.ALPACA_API_SECRET_KEY;
      if (!keyId || !secret) {
        throw new Error("Alpaca paper credentials are not configured; refusing to submit.");
      }

      const response = await fetch(`${getServerEnv().ALPACA_TRADING_BASE_URL}/v2/orders`, {
        method: "POST",
        headers: {
          "APCA-API-KEY-ID": keyId,
          "APCA-API-SECRET-KEY": secret,
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const requestId = response.headers.get("x-request-id") ?? "";
      const body: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail =
          typeof body === "object" && body !== null && "message" in body
            ? String((body as { message: unknown }).message)
            : response.statusText;
        throw new Error(`Alpaca rejected the order (${response.status}): ${detail}`);
      }

      const orderId =
        typeof body === "object" && body !== null && "id" in body
          ? String((body as { id: unknown }).id)
          : "";
      if (orderId === "") throw new Error("Alpaca accepted the order but returned no order id.");

      return { orderId, requestId };
    }
  };
}
