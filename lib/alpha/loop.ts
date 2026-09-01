import type { Policy, TradeIntent, MarketSnapshot, AccountSnapshot } from "@/types/domain";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { buildAccountSnapshot, buildMarketSnapshot } from "./snapshots";
import { propose } from "./engine";
import { sha256Canonical } from "./canonical";
import { monitorPositions, type PositionMonitorResult } from "@/lib/monitor/position-monitor";
import { EventJournal } from "@/lib/audit/journal";
import { governIntent, type GovernResult } from "@/lib/execution/pipeline";
import { defaultNonceStore } from "@/lib/permits/nonce";
import { reconcileForTick } from "@/lib/safety/session-store";
import type { CovenantEvent, MarketClock, OpenPosition } from "@/types/domain";
import { computeAccountSnapshotHash, computeMarketSnapshotHash } from "@/lib/hashes";
import { profileLimits, toPolicyUnits } from "@/lib/mandates/profiles";

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
    /** Kernel verdict for this proposal. Absent when the engine abstained. */
    governance?: GovernResult;
  }>;
  positionMonitor?: PositionMonitorResult;
  /** Session state COV-04 evaluated against. */
  session?: { state: string; sessionDate: string; haltReason: string | null };
  /** Whether this tick was allowed to reach the broker at all. */
  submissionMode: "LIVE" | "HELD";
  /** Hash-chained record of the tick. Replayable with `npm run verify`. */
  events?: CovenantEvent[];
}

/**
 * Submission is opt-in, and deliberately awkward to turn on.
 *
 * A scheduled job that begins trading the moment a credential shows up in the
 * environment is not something anyone should run. Governance always executes;
 * only the broker call is gated.
 */
function liveSubmitEnabled(): boolean {
  return process.env.COVENANT_LIVE_SUBMIT === "true";
}

/** In-memory tick history for the dashboard (resets on server restart). */
const tickHistory: TickResult[] = [];
const MAX_TICK_HISTORY = 100;

/** Get recent tick history for the execution dashboard. */
export function getTickHistory(): readonly TickResult[] {
  return tickHistory;
}

/** Clear tick history (useful for tests). */
export function clearTickHistory(): void {
  tickHistory.length = 0;
}

/**
 * The default active policy.
 *
 * Derived from Lane C's calibrated profile rather than hand-written, because
 * hand-written was wrong twice: the equity ratios and the spread-width cap
 * were both left in fraction units while `Policy` expresses them as percent.
 * `toPolicyUnits` is the single conversion, so there is nothing left here to
 * get out of step. See lib/policy-units.ts.
 */
const balancedLimits = toPolicyUnits(profileLimits("BALANCED"));

const defaultPolicyFields: Omit<Policy, "policyHash"> = {
  id: "pol_covenant_active_v1",
  version: 1,
  status: "ACTIVE",
  createdAt: "2026-08-30T00:00:00.000Z",
  activatedAt: "2026-08-30T00:00:00.000Z",
  plainEnglishEcho:
    "Trade defined-risk SPY and QQQ vertical spreads with max " +
    `${balancedLimits.perTradeMaxLossPct.toFixed(2)}% risk per trade and ` +
    `${balancedLimits.portfolioHeatMaxLossPct.toFixed(2)}% portfolio heat.`,
  allowedUnderlyings: ["SPY", "QQQ"],
  allowedStructures: ["BULL_CALL_DEBIT", "BEAR_PUT_DEBIT", "CREDIT_VERTICAL"],
  riskProfile: "BALANCED",
  ...balancedLimits,
  missingStateAction: "ABSTAIN",
  modelAuthority: "VETO_OR_SHRINK",
  invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"],
};

export const defaultActivePolicy: Policy = {
  ...defaultPolicyFields,
  policyHash: sha256Canonical(defaultPolicyFields),
};

/**
 * Open positions in the shape the kernel needs.
 *
 * An empty broker position list is a fact we can assert, so it maps to [].
 * A non-empty one is not: deriving `structure` and `standaloneMaxLoss` back
 * out of raw legs is not yet implemented, and guessing would understate risk
 * in COV-03. So we return undefined, COV-03/06/07 abstain, and the dashboard
 * says why. That is the correct failure until the mapping lands.
 */
function toOpenPositions(monitor: PositionMonitorResult | undefined): OpenPosition[] | undefined {
  if (monitor === undefined) return undefined;
  if (monitor.summary.total === 0) return [];
  return undefined;
}

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
  const baseAccount: AccountSnapshot = buildAccountSnapshot(rawAccount);

  const marketClock: MarketClock = {
    isOpen: clock.is_open,
    // The broker's own trading date. COV-04 resets a halt on this, never on a
    // wall-clock rollover in whatever timezone the host happens to run in.
    sessionDate: clock.timestamp.slice(0, 10),
    nextOpen: clock.next_open,
    nextClose: clock.next_close
  };

  const journal = new EventJournal({ actor: "tick" });
  const submitLive = liveSubmitEnabled();

  // Positions are monitored BEFORE proposing, because COV-03, COV-06 and
  // COV-07 all read the open book and the account snapshot has to carry it
  // before it is hashed.
  let positionMonitor: PositionMonitorResult | undefined;
  try {
    positionMonitor = await monitorPositions(readClient, policy);
  } catch {
    // Monitoring failure is not fail-open here: leaving openPositions
    // undefined makes COV-03/06/07 abstain, which is the correct outcome.
  }

  const equityNumber = Number(baseAccount.equity);
  const dayPnlNumber = Number(baseAccount.dailyUnrealizedPnl);
  const enrichedAccount: AccountSnapshot = {
    ...baseAccount,
    dayPnlPct:
      Number.isFinite(equityNumber) && equityNumber > 0 && Number.isFinite(dayPnlNumber)
        ? (dayPnlNumber / equityNumber) * 100
        : undefined,
    tradingBlocked: baseAccount.status.toUpperCase() !== "ACTIVE",
    openPositions: toOpenPositions(positionMonitor),
    snapshotHash: ""
  };
  const accountSnapshot: AccountSnapshot = {
    ...enrichedAccount,
    snapshotHash: computeAccountSnapshotHash(enrichedAccount)
  };

  const { session, justHalted } = reconcileForTick(
    marketClock,
    accountSnapshot,
    policy.dailyHaltPct,
    new Date()
  );
  if (justHalted) {
    journal.append("HALT_TRIGGERED", { reason: session.haltReason }, "safety-kernel");
  }

  journal.append("ACCOUNT_SNAPSHOT_RECORDED", { account: accountSnapshot }, "alpha");

  const sessionSummary = {
    state: session.state,
    sessionDate: session.sessionDate,
    haltReason: session.haltReason
  };

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
    const result: TickResult = {
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
      session: sessionSummary,
      submissionMode: submitLive ? "LIVE" : "HELD",
      events: [...journal.all()],
    };
    recordTickResult(result);
    return result;
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

      const chainSnapshot = buildMarketSnapshot(
        sym,
        underlyingPrice,
        rawOptions,
        readClient.isMockMode() ? "synthetic" : readClient.getOptionFeed()
      );

      // The clock has to be inside the snapshot BEFORE it is hashed: COV-08
      // re-derives the hash, and COV-04 reads the session date out of it.
      // Attaching it afterwards would invalidate the hash the intent binds to.
      const withClock: MarketSnapshot = { ...chainSnapshot, clock: marketClock };
      const marketSnapshot: MarketSnapshot = {
        ...withClock,
        snapshotHash: computeMarketSnapshotHash(withClock)
      };
      journal.append("MARKET_SNAPSHOT_RECORDED", { market: marketSnapshot }, "alpha");

      const impliedVolatilities = Object.values(marketSnapshot.contracts)
        .map((contract) => contract.impliedVolatility)
        .filter((value): value is number => value !== undefined && Number.isFinite(value));
      const chainIvAverage = impliedVolatilities.length > 0
        ? impliedVolatilities.reduce((sum, value) => sum + value, 0) / impliedVolatilities.length
        : undefined;
      const proposal = await propose(policy, marketSnapshot, accountSnapshot, { bars, chainIvAverage });

      // The seam. A proposal is not a trade until the kernel says so, and the
      // engine that produced it has no way to reach the broker itself.
      let governance: GovernResult | undefined;
      if ("intent" in proposal) {
        governance = await governIntent(proposal.intent, policy, {
          account: accountSnapshot,
          market: marketSnapshot,
          session,
          journal,
          nonceStore: defaultNonceStore,
          submit: submitLive,
        });
      }

      underlyingsResult.push({
        symbol: sym,
        marketSnapshotHash: marketSnapshot.snapshotHash,
        proposal,
        governance,
      });
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      underlyingsResult.push({
        symbol: sym,
        proposal: {
          abstain: true,
          reason: `[FAIL-CLOSED] Market data or governance failed for ${sym}: ${reason}`,
        },
      });
    }
  }

  const result: TickResult = {
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
    positionMonitor,
    session: sessionSummary,
    submissionMode: submitLive ? "LIVE" : "HELD",
    events: [...journal.all()],
  };

  recordTickResult(result);
  return result;
}

/** Store a tick result in history (capped at MAX_TICK_HISTORY entries). */
function recordTickResult(result: TickResult): void {
  tickHistory.push(result);
  if (tickHistory.length > MAX_TICK_HISTORY) {
    tickHistory.splice(0, tickHistory.length - MAX_TICK_HISTORY);
  }
}
