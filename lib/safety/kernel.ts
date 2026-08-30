/**
 * Safety Kernel — Lane B.
 *
 * Runs every invariant against re-fetched state and returns one of:
 * APPROVE (with a signed permit), SHRINK (with a smaller permit), VETO, or
 * ABSTAIN. It is the only caller of lib/permits/sign.ts.
 *
 * Two properties the review checks (IMPLEMENTATION.md §6):
 *   - the kernel re-fetches state rather than trusting the caller's snapshots;
 *   - a SHRINK only ever reduces quantity.
 *
 * NOTE (Lane A dependency): the default StateProvider lands with T-A1's
 * read-only Alpaca client. Until then, callers pass snapshots explicitly and
 * the kernel abstains rather than pretending it verified anything.
 */

import { computeIntentHash } from "@/lib/hashes";
import * as money from "@/lib/money";
import { defaultNonceStore, type NonceStore } from "@/lib/permits/nonce";
import { signPermit, type PermitClaims } from "@/lib/permits/sign";
import { INVARIANT_REGISTRY } from "@/lib/safety/invariants";
import type { InvariantContext, InvariantVerdict } from "@/lib/safety/types";
import type {
  AccountSnapshot,
  InvariantId,
  KernelResult,
  MarketSnapshot,
  Policy,
  SessionStatus,
  TradeIntent
} from "@/types/domain";

export interface StateProvider {
  fetchAccount(): Promise<AccountSnapshot>;
  fetchMarket(): Promise<MarketSnapshot>;
}

export interface KernelOptions {
  /** Preferred: the kernel re-fetches state through this. */
  stateProvider?: StateProvider;
  /** Test and replay path: supply the exact snapshots to evaluate against. */
  account?: AccountSnapshot;
  market?: MarketSnapshot;
  session: SessionStatus;
  now?: Date;
  nonceStore?: NonceStore;
  privateKeyPem?: string;
  ttlSeconds?: number;
}

function result(
  decision: KernelResult["decision"],
  reason: string,
  failedInvariants: InvariantId[],
  now: Date,
  extra: Partial<KernelResult> = {}
): KernelResult {
  return { decision, reason, failedInvariants, evaluatedAt: now.toISOString(), ...extra };
}

/**
 * Rebuild an intent at a smaller size.
 *
 * Max loss and portfolio contribution scale with quantity, and the hash is
 * recomputed — so a shrunk intent is a genuinely different intent, and the
 * permit issued for it cannot be replayed against the original.
 */
export function shrinkIntent(intent: TradeIntent, quantity: number): TradeIntent {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity >= intent.quantity) {
    throw new Error(
      `shrinkIntent: ${quantity} is not a strict reduction of ${intent.quantity}. ` +
        `A shrink may only ever reduce.`
    );
  }

  const perContract = money.parse(intent.standaloneMaxLoss) / BigInt(intent.quantity);
  const shrunk: TradeIntent = {
    ...intent,
    quantity,
    standaloneMaxLoss: money.format(perContract * BigInt(quantity)),
    portfolioHeatAfterTrade: money.format(perContract * BigInt(quantity)),
    intentHash: ""
  };
  return { ...shrunk, intentHash: computeIntentHash(shrunk) };
}

function runRegistry(context: InvariantContext): InvariantVerdict[] {
  return INVARIANT_REGISTRY.map((evaluator) => evaluator.evaluate(context));
}

function failures(verdicts: InvariantVerdict[]) {
  return verdicts.filter((v): v is Extract<InvariantVerdict, { ok: false }> => !v.ok);
}

export async function evaluate(
  intent: TradeIntent,
  policy: Policy,
  options: KernelOptions
): Promise<KernelResult> {
  const now = options.now ?? new Date();
  const nonceStore = options.nonceStore ?? defaultNonceStore;

  // Re-fetch rather than trust. The caller's snapshots are only used when no
  // provider exists, and COV-08 still checks them against the intent's hashes.
  let account: AccountSnapshot | undefined = options.account;
  let market: MarketSnapshot | undefined = options.market;
  if (options.stateProvider !== undefined) {
    try {
      [account, market] = await Promise.all([
        options.stateProvider.fetchAccount(),
        options.stateProvider.fetchMarket()
      ]);
    } catch {
      return result("ABSTAIN", "Could not re-fetch account or market state.", ["COV-08"], now);
    }
  }
  if (account === undefined || market === undefined) {
    return result("ABSTAIN", "No account or market state available to evaluate.", ["COV-08"], now);
  }

  const context: InvariantContext = {
    policy,
    intent,
    account,
    market,
    session: options.session,
    now
  };

  const verdicts = runRegistry(context);
  const failed = failures(verdicts);

  // Hard refusals win, in registry order, so the reason names the first rule
  // that actually stopped the trade.
  const hard = failed.find((f) => f.action === "ABSTAIN" || f.action === "VETO");
  if (hard !== undefined) {
    return result(hard.action, hard.reason, failed.map((f) => f.id), now);
  }

  const shrinks = failed.filter((f) => f.action === "SHRINK");
  let finalIntent = intent;
  let decision: KernelResult["decision"] = "APPROVE";
  let reason = "All invariants satisfied.";
  let shrunkQuantity: number | undefined;

  if (shrinks.length > 0) {
    const target = Math.min(...shrinks.map((s) => s.shrinkTo ?? 0));
    if (!Number.isInteger(target) || target < 1) {
      return result(
        "VETO",
        "Required shrink leaves no tradeable size.",
        shrinks.map((s) => s.id),
        now
      );
    }

    finalIntent = shrinkIntent(intent, target);
    // Confirm the smaller intent actually clears. One pass only — a second
    // required shrink means the sizing math disagrees with itself, and we
    // refuse rather than iterate toward a number we cannot explain.
    const recheck = failures(runRegistry({ ...context, intent: finalIntent }));
    if (recheck.length > 0) {
      return result(
        "VETO",
        `Shrinking to ${target} did not clear ${recheck.map((r) => r.id).join(", ")}.`,
        recheck.map((r) => r.id),
        now
      );
    }

    decision = "SHRINK";
    shrunkQuantity = target;
    reason = shrinks.map((s) => s.reason).join(" ");
  }

  const claims: PermitClaims = {
    policyId: policy.id,
    policyVersion: policy.version,
    policyHash: policy.policyHash,
    intentHash: finalIntent.intentHash,
    accountSnapshotHash: finalIntent.accountSnapshotHash,
    marketSnapshotHash: finalIntent.marketSnapshotHash,
    exactLegs: finalIntent.legs,
    maxQuantity: finalIntent.quantity,
    limitPriceBand: finalIntent.limitPriceBand
  };

  const permit = signPermit(claims, {
    privateKeyPem: options.privateKeyPem,
    now,
    ttlSeconds: options.ttlSeconds
  });
  await nonceStore.register(permit.nonce);

  return result(decision, reason, failed.map((f) => f.id), now, {
    permit,
    finalIntent,
    shrunkQuantity
  });
}
