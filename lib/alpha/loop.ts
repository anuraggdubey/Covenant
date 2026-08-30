import type { Policy, TradeIntent, MarketSnapshot, AccountSnapshot } from "@/types/domain";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { buildAccountSnapshot, buildMarketSnapshot } from "./snapshots";
import { propose } from "./engine";

export interface TickResult {
  timestamp: string;
  clock: {
    isOpen: boolean;
    timestamp: string;
    nextOpen: string;
    nextClose: string;
  };
  account: {
    id: string;
    equity: string;
    buyingPower: string;
    optionsLevel: number;
    snapshotHash: string;
  };
  underlyings: Array<{
    symbol: "SPY" | "QQQ";
    marketSnapshotHash?: string;
    proposal: { intent: TradeIntent } | { abstain: true; reason: string };
  }>;
}

export const defaultActivePolicy: Policy = {
  id: "pol_covenant_active_v1",
  version: 1,
  status: "ACTIVE",
  policyHash: "8f7a9d3e5b1c4e6a7d8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
  createdAt: "2026-08-30T00:00:00.000Z",
  activatedAt: "2026-08-30T00:00:00.000Z",
  plainEnglishEcho: "Trade defined-risk SPY and QQQ vertical spreads with max 2% risk per trade and 6% portfolio heat.",
  allowedUnderlyings: ["SPY", "QQQ"],
  allowedStructures: ["BULL_CALL_DEBIT", "BEAR_PUT_DEBIT"],
  riskProfile: "BALANCED",
  perTradeMaxLossPct: 0.02,
  portfolioHeatMaxLossPct: 0.06,
  dailyHaltPct: -0.03,
  minDte: 7,
  maxDte: 45,
  minDelta: 0.20,
  maxDelta: 0.80,
  maxQuoteAgeMs: 120000,
  maxBidAskWidthPct: 0.30,
  minOpenInterest: 0,
  minVolume: 0,
  duplicateExposureCooldownMinutes: 30,
  exitAttemptDeadlineMinutes: 15,
  missingStateAction: "ABSTAIN",
  modelAuthority: "VETO_OR_SHRINK",
  invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"],
};

/**
 * Single unified tick execution path for both cron and CLI.
 */
export async function executeTick(
  customPolicy?: Policy,
  client?: AlpacaReadClient
): Promise<TickResult> {
  const readClient = client ?? new AlpacaReadClient();
  const policy = customPolicy ?? defaultActivePolicy;

  // 1. Fetch Market Clock
  const clock = await readClient.getClock();

  // 2. Fetch Account State & Build Account Snapshot
  const rawAccount = await readClient.getAccount();
  const accountSnapshot: AccountSnapshot = buildAccountSnapshot(rawAccount);

  const underlyingsResult: TickResult["underlyings"] = [];

  // 3. Process each allowed underlying
  for (const sym of policy.allowedUnderlyings) {
    try {
      // Fetch stock snapshot & option chain
      const stockSnap = await readClient.getStockSnapshot(sym);
      const rawOptions = await readClient.getOptionSnapshots(sym);

      const underlyingPrice =
        stockSnap.latestTrade?.p?.toFixed(2) ??
        stockSnap.latestQuote?.ap?.toFixed(2) ??
        "500.00";

      const marketSnapshot: MarketSnapshot = buildMarketSnapshot(
        sym,
        underlyingPrice,
        rawOptions
      );

      const proposal = await propose(policy, marketSnapshot, accountSnapshot);

      underlyingsResult.push({
        symbol: sym,
        marketSnapshotHash: marketSnapshot.snapshotHash,
        proposal,
      });
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      underlyingsResult.push({
        symbol: sym,
        proposal: {
          abstain: true,
          reason: `[FAIL-CLOSED] Failed to fetch market data for ${sym}: ${reason}`,
        },
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    clock: {
      isOpen: clock.is_open,
      timestamp: clock.timestamp,
      nextOpen: clock.next_open,
      nextClose: clock.next_close,
    },
    account: {
      id: accountSnapshot.accountId,
      equity: accountSnapshot.equity,
      buyingPower: accountSnapshot.buyingPower,
      optionsLevel: accountSnapshot.optionsLevel,
      snapshotHash: accountSnapshot.snapshotHash,
    },
    underlyings: underlyingsResult,
  };
}
