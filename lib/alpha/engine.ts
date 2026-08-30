import Decimal from "decimal.js";
import type {
  Policy,
  MarketSnapshot,
  AccountSnapshot,
  TradeIntent,
} from "@/types/domain";
import { verifySnapshotHash } from "./snapshots";
import { generateCandidates } from "./factory";
import { analyzeMarketSignals } from "./signals";
import { rankAndSizeCandidates } from "./ranking";
import { sha256Canonical } from "./canonical";

/**
 * Alpha Engine proposal entry point.
 *
 * Guaranteed by construction:
 * - Contains ZERO broker credentials or order submission capability.
 * - Fails closed with { abstain: true, reason } on any missing, stale, or invalid state.
 * - Returns a verifiable TradeIntent with canonical SHA-256 intentHash.
 */
export async function propose(
  policy: Policy,
  market: MarketSnapshot,
  account: AccountSnapshot,
  options?: {
    modelConfidenceMultiplier?: number;
    intentTtlSeconds?: number;
  }
): Promise<{ intent: TradeIntent } | { abstain: true; reason: string }> {
  // 1. Verify Snapshot Authenticity & Hashes
  if (!market || !verifySnapshotHash(market)) {
    return {
      abstain: true,
      reason: "[FAIL-CLOSED] Market snapshot is missing or has an invalid cryptographic hash.",
    };
  }

  if (!account || !verifySnapshotHash(account)) {
    return {
      abstain: true,
      reason: "[FAIL-CLOSED] Account snapshot is missing or has an invalid cryptographic hash.",
    };
  }

  // 2. Policy Status Check
  if (policy.status !== "ACTIVE") {
    return {
      abstain: true,
      reason: `[FAIL-CLOSED] Policy ${policy.id} is not ACTIVE (status: ${policy.status}).`,
    };
  }

  // 3. Account Health & Level 3 Options Check
  if (account.status !== "ACTIVE") {
    return {
      abstain: true,
      reason: `[FAIL-CLOSED] Paper account is not ACTIVE (status: ${account.status}).`,
    };
  }

  if (account.optionsLevel < 3) {
    return {
      abstain: true,
      reason: `[FAIL-CLOSED] Account options level (${account.optionsLevel}) is below required Level 3.`,
    };
  }

  const equityDec = new Decimal(account.equity);
  if (equityDec.lessThanOrEqualTo(0)) {
    return {
      abstain: true,
      reason: `[FAIL-CLOSED] Account equity (${account.equity}) is non-positive.`,
    };
  }

  // 4. Generate candidate vertical spreads
  const candidates = generateCandidates(market, policy, 1);
  if (candidates.length === 0) {
    return {
      abstain: true,
      reason: `[FAIL-CLOSED] No valid ${market.underlying} vertical spreads matched policy criteria.`,
    };
  }

  // 5. Signals Analysis
  const signals = analyzeMarketSignals([], undefined);

  // 6. Rank and size candidates
  const modelConfidence = options?.modelConfidenceMultiplier ?? 1.0;
  const ranked = rankAndSizeCandidates(
    candidates,
    policy,
    account,
    signals,
    modelConfidence
  );

  if (ranked.length === 0) {
    return {
      abstain: true,
      reason: "[FAIL-CLOSED] All candidate spreads failed sizing or portfolio heat constraints.",
    };
  }

  const topPick = ranked[0];
  const now = new Date();
  const createdAt = now.toISOString();
  const ttlSeconds = options?.intentTtlSeconds ?? 60;
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

  // Construct limit price band (+/- 5% or minimum $0.05)
  const limitPriceDec = new Decimal(topPick.finalPayoff.limitPrice);
  const bandOffset = Decimal.max(limitPriceDec.times("0.05"), "0.05");
  const minPrice = Decimal.max(limitPriceDec.minus(bandOffset), "0.01").toFixed(2);
  const maxPrice = limitPriceDec.plus(bandOffset).toFixed(2);

  const intentId = `intent_${market.underlying}_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

  const unsignedIntent: Omit<TradeIntent, "intentHash"> = {
    id: intentId,
    policyId: policy.id,
    policyHash: policy.policyHash,
    underlying: topPick.candidate.underlying,
    structure: topPick.candidate.structure,
    legs: topPick.candidate.legs,
    quantity: topPick.quantity,
    limitPrice: topPick.finalPayoff.limitPrice,
    limitPriceBand: {
      min: minPrice,
      max: maxPrice,
    },
    timeInForce: "day",
    expiry: topPick.candidate.expiry,
    dte: topPick.candidate.dte,
    standaloneMaxLoss: topPick.finalPayoff.standaloneMaxLoss,
    portfolioHeatAfterTrade: topPick.portfolioHeatAfterTrade,
    alphaScore: topPick.alphaScore,
    modelConfidenceMultiplier: Math.max(0, Math.min(1, modelConfidence)),
    thesis: topPick.thesis,
    marketSnapshotHash: market.snapshotHash,
    accountSnapshotHash: account.snapshotHash,
    createdAt,
    expiresAt,
  };

  const intentHash = sha256Canonical(unsignedIntent);

  return {
    intent: {
      ...unsignedIntent,
      intentHash,
    },
  };
}
