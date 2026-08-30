import type { Policy, TradeIntent, MarketSnapshot, AccountSnapshot } from "@/types/domain";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { buildAccountSnapshot, buildMarketSnapshot } from "./snapshots";
import { propose } from "./engine";
import { sha256Canonical } from "./canonical";

export interface TickResult {
  timestamp: string;
  dataMode: "PAPER" | "SYNTHETIC_MOCK";
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

const defaultPolicyFields: Omit<Policy, "policyHash"> = {
  id: "pol_covenant_active_v1",
  version: 1,
  status: "ACTIVE",
  createdAt: "2026-08-30T00:00:00.000Z",
  activatedAt: "2026-08-30T00:00:00.000Z",
  plainEnglishEcho: "Trade defined-risk SPY and QQQ vertical spreads with max 0.60% risk per trade and 2.50% portfolio heat.",
  allowedUnderlyings: ["SPY", "QQQ"],
  allowedStructures: ["BULL_CALL_DEBIT", "BEAR_PUT_DEBIT", "CREDIT_VERTICAL"],
  riskProfile: "BALANCED",
  perTradeMaxLossPct: 0.006,
  portfolioHeatMaxLossPct: 0.025,
  dailyHaltPct: -0.0125,
  minDte: 7,
  maxDte: 21,
  minDelta: 0.20,
  maxDelta: 0.80,
  maxQuoteAgeMs: 60000,
  maxBidAskWidthPct: 0.25,
  minOpenInterest: 100,
  minVolume: 10,
  duplicateExposureCooldownMinutes: 30,
  exitAttemptDeadlineMinutes: 15,
  missingStateAction: "ABSTAIN",
  modelAuthority: "VETO_OR_SHRINK",
  invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"],
};

export const defaultActivePolicy: Policy = {
  ...defaultPolicyFields,
  policyHash: sha256Canonical(defaultPolicyFields),
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

  if (!clock.is_open) {
    for (const symbol of policy.allowedUnderlyings) {
      underlyingsResult.push({
        symbol,
        proposal: {
          abstain: true,
          reason: "[FAIL-CLOSED] Alpaca market clock reports that the regular session is closed.",
        },
      });
    }
    return {
      timestamp: new Date().toISOString(),
      dataMode: readClient.isMockMode() ? "SYNTHETIC_MOCK" : "PAPER",
      clock: { isOpen: false, timestamp: clock.timestamp, nextOpen: clock.next_open, nextClose: clock.next_close },
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

  // 3. Process each allowed underlying
  for (const sym of policy.allowedUnderlyings) {
    try {
      const asset = await readClient.getAsset(sym);
      if (!asset.tradable || !asset.has_options) {
        throw new Error(`${sym} is not currently tradable with options.`);
      }
      const stockSnap = await readClient.getStockSnapshot(sym);
      const rawOptions = await readClient.getOptionSnapshots(sym);
      const barsResponse = await readClient.getStockBars(sym, "1Day", 60);
      const bars = barsResponse.bars[sym] ?? [];

      const underlyingPrice =
        stockSnap.latestTrade?.p?.toFixed(2) ??
        stockSnap.latestQuote?.ap?.toFixed(2);
      if (!underlyingPrice) {
        throw new Error(`Missing underlying trade and quote price for ${sym}.`);
      }

      const marketSnapshot: MarketSnapshot = buildMarketSnapshot(
        sym,
        underlyingPrice,
        rawOptions,
        readClient.isMockMode() ? "synthetic" : readClient.getOptionFeed()
      );

      const impliedVolatilities = Object.values(marketSnapshot.contracts)
        .map((contract) => contract.impliedVolatility)
        .filter((value): value is number => value !== undefined && Number.isFinite(value));
      const chainIvAverage = impliedVolatilities.length > 0
        ? impliedVolatilities.reduce((sum, value) => sum + value, 0) / impliedVolatilities.length
        : undefined;
      const proposal = await propose(policy, marketSnapshot, accountSnapshot, { bars, chainIvAverage });

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
    dataMode: readClient.isMockMode() ? "SYNTHETIC_MOCK" : "PAPER",
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
