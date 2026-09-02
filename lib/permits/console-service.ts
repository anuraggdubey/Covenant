import { randomUUID } from "node:crypto";

import { AlpacaReadClient } from "@/lib/alpaca/client";
import { propose } from "@/lib/alpha/engine";
import { defaultActivePolicy } from "@/lib/alpha/loop";
import { getOperatorActivePolicy } from "@/lib/alpha/runtime-policy";
import { buildAccountSnapshot, buildMarketSnapshot } from "@/lib/alpha/snapshots";
import { computeAccountSnapshotHash, computeMarketSnapshotHash } from "@/lib/hashes";
import { monitorPositions } from "@/lib/monitor/position-monitor";
import type { PermitApiErrorCode, PermitDetail, PreparedTrade } from "@/lib/permits/console-types";
import { getPermitStore } from "@/lib/storage/permit-store";
import { submit } from "@/lib/execution/executor";
import { toOpenPositions } from "@/lib/safety/position-risk";
import { reconcileForTick } from "@/lib/safety/session-store";
import { evaluate } from "@/lib/safety/kernel";
import { sha256Canonical } from "@/lib/alpha/canonical";
import type { AccountSnapshot, MarketClock, MarketSnapshot, Policy, SessionStatus, TradeIntent, Underlying } from "@/types/domain";

const DRAFT_TTL_MS = 45_000;

export class PermitConsoleError extends Error {
  constructor(public readonly code: PermitApiErrorCode, message: string, public readonly status = 409) {
    super(message);
    this.name = "PermitConsoleError";
  }
}

interface FreshTrade {
  intent: TradeIntent;
  policy: Policy;
  account: AccountSnapshot;
  market: MarketSnapshot;
  session: SessionStatus;
}

function materialHash(intent: TradeIntent): string {
  return sha256Canonical({
    underlying: intent.underlying,
    structure: intent.structure,
    legs: intent.legs,
    quantity: intent.quantity,
    limitPrice: intent.limitPrice,
    limitPriceBand: intent.limitPriceBand,
    expiry: intent.expiry,
    standaloneMaxLoss: intent.standaloneMaxLoss
  });
}

async function freshTrade(symbol: Underlying): Promise<FreshTrade> {
  const policy = getOperatorActivePolicy() ?? defaultActivePolicy;
  if (!policy.allowedUnderlyings.includes(symbol)) {
    throw new PermitConsoleError("NO_CANDIDATE", `${symbol} is not allowed by the active policy.`, 422);
  }

  const client = new AlpacaReadClient();
  const clock = await client.getClock();
  if (!clock.is_open) {
    throw new PermitConsoleError("MARKET_CLOSED", `Alpaca reports the market is closed. Next open: ${clock.next_open}.`);
  }
  const [rawAccount, asset, stock, options, barsResponse, monitored] = await Promise.all([
    client.getAccount(),
    client.getAsset(symbol),
    client.getStockSnapshot(symbol),
    client.getOptionSnapshots(symbol),
    client.getStockBars(symbol, "1Day", 60),
    monitorPositions(client, policy)
  ]);
  if (!asset.tradable || !asset.has_options) {
    throw new PermitConsoleError("NO_CANDIDATE", `${symbol} is not tradable with options.`, 422);
  }

  const observedAt = new Date().toISOString();
  const baseAccount = buildAccountSnapshot(rawAccount);
  const states = monitored.positions.map((entry) => entry.position);
  const mapped = toOpenPositions(states, observedAt);
  if ("unresolved" in mapped) {
    throw new PermitConsoleError("NO_CANDIDATE", "Open position state could not be verified. Covenant abstained.", 422);
  }
  const equity = Number(baseAccount.equity);
  const dayPnl = Number(baseAccount.dailyUnrealizedPnl);
  const unsignedAccount: AccountSnapshot = {
    ...baseAccount,
    dayPnlPct: Number.isFinite(equity) && equity > 0 && Number.isFinite(dayPnl) ? (dayPnl / equity) * 100 : undefined,
    tradingBlocked: baseAccount.status.toUpperCase() !== "ACTIVE",
    openPositions: mapped.positions,
    snapshotHash: ""
  };
  const account: AccountSnapshot = { ...unsignedAccount, snapshotHash: computeAccountSnapshotHash(unsignedAccount) };
  const marketClock: MarketClock = {
    isOpen: clock.is_open,
    sessionDate: clock.timestamp.slice(0, 10),
    nextOpen: clock.next_open,
    nextClose: clock.next_close
  };
  const price = stock.latestTrade?.p?.toFixed(2) ?? stock.latestQuote?.ap?.toFixed(2);
  if (!price) throw new PermitConsoleError("NO_CANDIDATE", `No current ${symbol} price is available.`, 422);
  const chain = buildMarketSnapshot(symbol, price, options, client.isMockMode() ? "synthetic" : client.getOptionFeed());
  const withClock: MarketSnapshot = { ...chain, clock: marketClock };
  const market: MarketSnapshot = { ...withClock, snapshotHash: computeMarketSnapshotHash(withClock) };
  const { session } = reconcileForTick(marketClock, account, policy.dailyHaltPct, new Date());
  const ivs = Object.values(market.contracts)
    .map((contract) => contract.impliedVolatility)
    .filter((value): value is number => value !== undefined && Number.isFinite(value));
  const proposal = await propose(policy, market, account, {
    bars: barsResponse.bars[symbol] ?? [],
    chainIvAverage: ivs.length ? ivs.reduce((total, value) => total + value, 0) / ivs.length : undefined
  });
  if (!("intent" in proposal)) {
    throw new PermitConsoleError("NO_CANDIDATE", proposal.reason, 422);
  }
  return { intent: proposal.intent, policy, account, market, session };
}

export async function preparePermit(symbol: Underlying): Promise<PreparedTrade> {
  const fresh = await freshTrade(symbol);
  const now = new Date();
  const draft: PreparedTrade = {
    draftId: randomUUID(),
    status: "READY",
    symbol,
    intent: fresh.intent,
    policy: {
      id: fresh.policy.id,
      version: fresh.policy.version,
      policyHash: fresh.policy.policyHash,
      plainEnglishEcho: fresh.policy.plainEnglishEcho
    },
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + DRAFT_TTL_MS).toISOString()
  };
  await getPermitStore().saveDraft(draft, materialHash(fresh.intent));
  return draft;
}

export async function signPreparedPermit(draftId: string) {
  const store = getPermitStore();
  const stored = await store.getDraft(draftId);
  if (!stored) throw new PermitConsoleError("NO_CANDIDATE", "Prepared trade was not found.", 404);
  if (Date.parse(stored.draft.expiresAt) <= Date.now()) {
    await store.markDraft(draftId, "EXPIRED");
    throw new PermitConsoleError("TRADE_CHANGED", "The reviewed trade expired. Prepare it again.");
  }
  const fresh = await freshTrade(stored.draft.symbol);
  if (materialHash(fresh.intent) !== stored.materialHash) {
    await store.markDraft(draftId, "STALE");
    throw new PermitConsoleError("TRADE_CHANGED", "Market conditions changed. Review a newly prepared trade.");
  }
  const evaluated = await evaluate(fresh.intent, fresh.policy, {
    account: fresh.account,
    market: fresh.market,
    session: fresh.session,
    nonceStore: store,
    ttlSeconds: 60
  });
  if (!evaluated.permit || !evaluated.finalIntent || (evaluated.decision !== "APPROVE" && evaluated.decision !== "SHRINK")) {
    throw new PermitConsoleError("NO_CANDIDATE", evaluated.reason, 422);
  }
  if (materialHash(evaluated.finalIntent) !== stored.materialHash) {
    await store.markDraft(draftId, "STALE");
    throw new PermitConsoleError("TRADE_CHANGED", "Safety checks changed the reviewed order. Prepare and review it again.");
  }
  await store.savePermit(evaluated.permit, evaluated.finalIntent, fresh.policy);
  await store.markDraft(draftId, "SIGNED");
  return { permit: evaluated.permit, intent: evaluated.finalIntent, serverTime: new Date().toISOString() };
}

export async function executePermit(permitId: string): Promise<PermitDetail> {
  if (process.env.COVENANT_LIVE_SUBMIT !== "true") {
    throw new PermitConsoleError("EXECUTION_DISABLED", "Paper submission is disabled. Set COVENANT_LIVE_SUBMIT=true to enable it.", 403);
  }
  const store = getPermitStore();
  const record = await store.getPermit(permitId);
  if (!record) throw new PermitConsoleError("NO_CANDIDATE", "Permit was not found.", 404);
  if (record.lifecycle === "EXPIRED") throw new PermitConsoleError("PERMIT_EXPIRED", "This permit expired before execution.");
  if (record.lifecycle === "USED") throw new PermitConsoleError("PERMIT_USED", "This permit has already been used.");
  const policy = getOperatorActivePolicy() ?? defaultActivePolicy;
  const outcome = await submit(record.permit, record.intent, { nonceStore: store, activePolicy: policy });
  if ("orderId" in outcome) {
    await store.recordExecution(permitId, "SUBMITTED", { orderId: outcome.orderId, requestId: outcome.requestId });
  } else {
    await store.recordExecution(permitId, outcome.code === "BROKER_ERROR" ? "BROKER_ERROR" : "REJECTED", {
      code: outcome.code,
      reason: outcome.reason
    });
  }
  return (await store.getPermit(permitId))!;
}
