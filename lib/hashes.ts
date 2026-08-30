/**
 * Canonical hashes for the four things Covenant binds a permit to.
 *
 * Shared foundation — Lane A produces intents and snapshots, Lane B verifies
 * them, and both must compute an identical digest or every binding check
 * becomes a false negative. Import these; never hand-roll a hash.
 */

import { hashExcluding } from "@/lib/canonical";
import type { AccountSnapshot, MarketSnapshot, Policy, TradeIntent } from "@/types/domain";

export function computePolicyHash(policy: Policy): string {
  return hashExcluding(policy, "policyHash");
}

export function computeIntentHash(intent: TradeIntent): string {
  return hashExcluding(intent, "intentHash");
}

export function computeMarketSnapshotHash(snapshot: MarketSnapshot): string {
  return hashExcluding(snapshot, "snapshotHash");
}

export function computeAccountSnapshotHash(snapshot: AccountSnapshot): string {
  return hashExcluding(snapshot, "snapshotHash");
}
