/**
 * The committed demo run — Lane B.
 *
 * Drives the REAL kernel and the REAL executor through four scenarios and
 * records every step into a hash-chained journal. Nothing here is staged: the
 * approvals, the shrink and the rejections all come from the same code paths
 * that run against Alpaca. The only substitution is the transport, which is a
 * recorder instead of a network call — and the manifest says so.
 *
 * The output is `demo/run_manifest.json`, which `npm run verify` re-checks
 * with no credentials and no network.
 */

import { EventJournal } from "@/lib/audit/journal";
import { submit, type MlegOrderPayload, type OrderTransport } from "@/lib/execution/executor";
import { computeAccountSnapshotHash, computeIntentHash, computeMarketSnapshotHash, computePolicyHash } from "@/lib/hashes";
import { InMemoryNonceStore } from "@/lib/permits/nonce";
import { publicKeyPemFromPrivate } from "@/lib/permits/sign";
import { evaluate } from "@/lib/safety/kernel";
import type {
  AccountSnapshot,
  Leg,
  MarketSnapshot,
  OptionContractSnapshot,
  Policy,
  RunManifest,
  SessionStatus,
  TradeIntent
} from "@/types/domain";

const RUN_TIME = new Date("2026-08-31T14:30:00.000Z");
const SESSION_DATE = "2026-08-31";
const LONG_LEG = "SPY260918C00560000";
const SHORT_LEG = "SPY260918C00565000";

const LEGS: Leg[] = [
  { symbol: LONG_LEG, ratioQty: 1, side: "buy", positionIntent: "buy_to_open" },
  { symbol: SHORT_LEG, ratioQty: 1, side: "sell", positionIntent: "sell_to_open" }
];

class RecordingTransport implements OrderTransport {
  readonly calls: MlegOrderPayload[] = [];
  async submitOrder(payload: MlegOrderPayload) {
    this.calls.push(payload);
    return { orderId: `demo-order-${this.calls.length}`, requestId: `demo-req-${this.calls.length}` };
  }
}

function contracts(): Record<string, OptionContractSnapshot> {
  return {
    [LONG_LEG]: {
      symbol: LONG_LEG,
      strike: "560.00",
      expiration: "2026-09-18",
      type: "call",
      bid: "5.00",
      ask: "5.20",
      bidSize: 40,
      askSize: 55,
      impliedVolatility: 0.17,
      delta: 0.42,
      openInterest: 1200,
      volume: 300,
      quoteTimestamp: RUN_TIME.toISOString()
    },
    [SHORT_LEG]: {
      symbol: SHORT_LEG,
      strike: "565.00",
      expiration: "2026-09-18",
      type: "call",
      bid: "2.60",
      ask: "2.80",
      bidSize: 30,
      askSize: 35,
      impliedVolatility: 0.166,
      delta: 0.3,
      openInterest: 900,
      volume: 210,
      quoteTimestamp: RUN_TIME.toISOString()
    }
  };
}

function buildPolicy(): Policy {
  const base: Policy = {
    id: "demo-policy",
    version: 1,
    status: "ACTIVE",
    policyHash: "",
    createdAt: "2026-08-30T09:00:00.000Z",
    activatedAt: "2026-08-30T09:05:00.000Z",
    plainEnglishEcho:
      "Grow steadily. Never risk more than 0.6% on a trade or 2.5% of the book. " +
      "Defined-risk options only. Stop for the day at -1.25%.",
    allowedUnderlyings: ["SPY", "QQQ"],
    allowedStructures: ["BULL_CALL_DEBIT", "BEAR_PUT_DEBIT", "CREDIT_VERTICAL"],
    riskProfile: "BALANCED",
    perTradeMaxLossPct: 0.6,
    portfolioHeatMaxLossPct: 2.5,
    dailyHaltPct: -1.25,
    minDte: 7,
    maxDte: 21,
    minDelta: 0.15,
    maxDelta: 0.45,
    maxQuoteAgeMs: 5000,
    maxBidAskWidthPct: 8,
    minOpenInterest: 250,
    minVolume: 50,
    duplicateExposureCooldownMinutes: 120,
    exitAttemptDeadlineMinutes: 60,
    missingStateAction: "ABSTAIN",
    modelAuthority: "VETO_OR_SHRINK",
    invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"]
  };
  return { ...base, policyHash: computePolicyHash(base) };
}

function buildAccount(overrides: Partial<AccountSnapshot> = {}): AccountSnapshot {
  const base: AccountSnapshot = {
    timestamp: RUN_TIME.toISOString(),
    accountId: "DEMO-PAPER-ACCOUNT",
    equity: "100000.00",
    cash: "100000.00",
    buyingPower: "100000.00",
    portfolioHeatPct: 0,
    dailyRealizedPnl: "0.00",
    dailyUnrealizedPnl: "0.00",
    optionsLevel: 3,
    status: "ACTIVE",
    dayPnlPct: 0,
    openPositions: [],
    tradingBlocked: false,
    snapshotHash: "",
    ...overrides
  };
  return { ...base, snapshotHash: computeAccountSnapshotHash(base) };
}

function buildMarket(): MarketSnapshot {
  const base: MarketSnapshot = {
    timestamp: RUN_TIME.toISOString(),
    feed: "indicative",
    underlying: "SPY",
    underlyingPrice: "561.20",
    contracts: contracts(),
    clock: {
      isOpen: true,
      sessionDate: SESSION_DATE,
      nextOpen: "2026-09-01T13:30:00.000Z",
      nextClose: "2026-08-31T20:00:00.000Z"
    },
    snapshotHash: ""
  };
  return { ...base, snapshotHash: computeMarketSnapshotHash(base) };
}

function buildIntent(
  policy: Policy,
  account: AccountSnapshot,
  market: MarketSnapshot,
  overrides: Partial<TradeIntent> = {}
): TradeIntent {
  const base: TradeIntent = {
    id: "demo-intent",
    policyId: policy.id,
    policyHash: policy.policyHash,
    underlying: "SPY",
    structure: "BULL_CALL_DEBIT",
    legs: LEGS,
    quantity: 1,
    limitPrice: "2.40",
    limitPriceBand: { min: "2.30", max: "2.50" },
    timeInForce: "day",
    expiry: "2026-09-18",
    dte: 18,
    standaloneMaxLoss: "240.00",
    portfolioHeatAfterTrade: "240.00",
    alphaScore: 0.62,
    modelConfidenceMultiplier: 1,
    thesis: "SPY 560/565 call debit vertical: IV not rich, 5/20 trend up.",
    marketSnapshotHash: market.snapshotHash,
    accountSnapshotHash: account.snapshotHash,
    intentHash: "",
    createdAt: RUN_TIME.toISOString(),
    expiresAt: new Date(RUN_TIME.getTime() + 60_000).toISOString(),
    ...overrides
  };
  return { ...base, intentHash: computeIntentHash(base) };
}

const ACTIVE_SESSION: SessionStatus = {
  state: "ACTIVE",
  sessionDate: SESSION_DATE,
  haltedAt: null,
  haltReason: null
};

/**
 * Execute the demo and return a manifest.
 *
 * `privateKeyPem` is used only to sign; it is never written to the manifest.
 * The public half is, so anyone can verify without holding a secret.
 */
export async function buildDemoRun(privateKeyPem: string): Promise<RunManifest> {
  const publicKeyPem = publicKeyPemFromPrivate(privateKeyPem);
  const journal = new EventJournal({
    codeRevision: process.env.COVENANT_CODE_REVISION ?? "demo",
    clock: () => RUN_TIME
  });

  const policy = buildPolicy();
  const market = buildMarket();
  const nonceStore = new InMemoryNonceStore();
  const transport = new RecordingTransport();

  journal.append("POLICY_ACTIVATED", { policy }, "operator");
  journal.append("MARKET_SNAPSHOT_RECORDED", { market }, "alpha");

  const kernelBase = {
    market,
    now: RUN_TIME,
    nonceStore,
    privateKeyPem,
    ttlSeconds: 60
  };

  // --- Scenario 1: a legal trade is approved and submitted ----------------
  {
    const account = buildAccount();
    const intent = buildIntent(policy, account, market);
    journal.append("ACCOUNT_SNAPSHOT_RECORDED", { account }, "alpha");
    journal.append("TRADE_INTENT_CREATED", { intent }, "alpha");

    const decision = await evaluate(intent, policy, {
      ...kernelBase,
      account,
      session: ACTIVE_SESSION
    });

    journal.append(
      "PERMIT_SIGNED",
      {
        policy,
        // The intent the kernel EVALUATED. The verifier re-runs the registry
        // on this one, so failedInvariants reproduces exactly.
        intent,
        // The intent the permit is bound to. Same as above on APPROVE.
        finalIntent: decision.finalIntent ?? intent,
        account,
        market,
        session: ACTIVE_SESSION,
        now: RUN_TIME.toISOString(),
        decision: decision.decision,
        failedInvariants: decision.failedInvariants,
        reason: decision.reason,
        permit: decision.permit
      },
      "safety-kernel"
    );

    const submitted = await submit(decision.permit, decision.finalIntent ?? intent, {
      transport,
      nonceStore,
      activePolicy: policy,
      publicKeyPem,
      now: RUN_TIME
    });

    if ("orderId" in submitted) {
      journal.append(
        "ORDER_SUBMITTED",
        {
          permit: decision.permit,
          intent: decision.finalIntent ?? intent,
          order: submitted.payload,
          orderId: submitted.orderId,
          requestId: submitted.requestId,
          transport: "RECORDING — no live broker call in this manifest"
        },
        "permit-executor"
      );
      journal.append("ORDER_ACCEPTED", { orderId: submitted.orderId }, "permit-executor");
    }

    // --- Scenario 2: replaying that permit is rejected --------------------
    const replay = await submit(decision.permit, decision.finalIntent ?? intent, {
      transport,
      nonceStore,
      activePolicy: policy,
      publicKeyPem,
      now: RUN_TIME
    });
    if ("rejected" in replay) {
      journal.append(
        "PERMIT_REPLAY_REJECTED",
        { permitId: decision.permit?.permitId, code: replay.code, reason: replay.reason },
        "permit-executor"
      );
    }
  }

  // --- Scenario 3: an oversized request is shrunk, never widened ----------
  {
    const account = buildAccount();
    const oversized = buildIntent(policy, account, market, {
      id: "demo-intent-oversized",
      quantity: 3,
      standaloneMaxLoss: "720.00",
      portfolioHeatAfterTrade: "720.00"
    });

    const decision = await evaluate(oversized, policy, {
      ...kernelBase,
      account,
      session: ACTIVE_SESSION
    });

    journal.append(
      "PERMIT_SIGNED",
      {
        policy,
        intent: oversized,
        finalIntent: decision.finalIntent ?? oversized,
        account,
        market,
        session: ACTIVE_SESSION,
        now: RUN_TIME.toISOString(),
        decision: decision.decision,
        failedInvariants: decision.failedInvariants,
        reason: decision.reason,
        permit: decision.permit,
        requestedQuantity: oversized.quantity,
        grantedQuantity: decision.finalIntent?.quantity
      },
      "safety-kernel"
    );
  }

  // --- Scenario 4: a halted session vetoes every entry --------------------
  {
    const account = buildAccount({ dayPnlPct: -1.4, dailyUnrealizedPnl: "-1400.00" });
    const intent = buildIntent(policy, account, market, { id: "demo-intent-halted" });

    const decision = await evaluate(intent, policy, {
      ...kernelBase,
      account,
      session: ACTIVE_SESSION
    });

    journal.append(
      "KERNEL_REJECTED",
      {
        policy,
        intent,
        account,
        market,
        session: ACTIVE_SESSION,
        now: RUN_TIME.toISOString(),
        decision: decision.decision,
        failedInvariants: decision.failedInvariants,
        reason: decision.reason
      },
      "safety-kernel"
    );
    journal.append("HALT_TRIGGERED", { reason: decision.reason }, "safety-kernel");
  }

  return journal.toManifest({
    runId: "covenant-demo-run-1",
    createdAt: RUN_TIME.toISOString(),
    policyHash: policy.policyHash,
    signingKeyId:
      (journal.find("PERMIT_SIGNED")?.payload as { permit?: { signingKeyId?: string } })?.permit
        ?.signingKeyId ?? "",
    publicKeyPem
  });
}
