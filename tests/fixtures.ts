/**
 * Deterministic fixtures for Lane B tests.
 *
 * Every value here is fake but structurally exact — the point is that the
 * kernel and executor cannot tell the difference, so a test that passes here
 * is a claim about the real code path, not about a mock.
 *
 * `buildWorld()` returns a mutually consistent policy + snapshots + intent
 * that APPROVES cleanly. Every attack test starts from that and breaks one
 * thing, which keeps each test's failure attributable to one cause.
 */

import { generateKeyPairSync } from "node:crypto";

import type { MlegOrderPayload, OrderTransport } from "@/lib/execution/executor";
import {
  computeAccountSnapshotHash,
  computeIntentHash,
  computeMarketSnapshotHash,
  computePolicyHash
} from "@/lib/hashes";
import { InMemoryNonceStore } from "@/lib/permits/nonce";
import { signPermit, type PermitClaims } from "@/lib/permits/sign";
import type {
  AccountSnapshot,
  Leg,
  MarketSnapshot,
  OptionContract,
  Policy,
  SessionStatus,
  TradeIntent,
  TradePermit
} from "@/types/domain";

export const FIXED_NOW = new Date("2026-08-31T14:30:00.000Z");
export const SESSION_DATE = "2026-08-31";

export function testKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString()
  };
}

/** Records every call so a test can assert the broker was never reached. */
export class SpyTransport implements OrderTransport {
  readonly calls: MlegOrderPayload[] = [];

  async submitOrder(payload: MlegOrderPayload): Promise<{ orderId: string; requestId: string }> {
    this.calls.push(payload);
    return { orderId: "paper-order-1", requestId: "req-1" };
  }
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export function buildPolicy(overrides: Partial<Policy> = {}): Policy {
  const base: Policy = {
    id: "policy-1",
    version: 1,
    status: "ACTIVE",
    policyHash: "",
    createdAt: "2026-08-30T09:00:00.000Z",
    activatedAt: "2026-08-30T09:05:00.000Z",
    plainEnglishEcho: "Balanced growth, defined-risk only, stop for the day at -1.25%.",
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
    invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"],
    ...overrides
  };
  return { ...base, policyHash: computePolicyHash(base) };
}

// ---------------------------------------------------------------------------
// Contracts and legs — a SPY 560/565 call debit vertical, 18 DTE
// ---------------------------------------------------------------------------

export const LONG_LEG = "SPY260918C00560000";
export const SHORT_LEG = "SPY260918C00565000";

export const SPY_LEGS: Leg[] = [
  { symbol: LONG_LEG, ratioQty: 1, side: "buy", positionIntent: "buy_to_open" },
  { symbol: SHORT_LEG, ratioQty: 1, side: "sell", positionIntent: "sell_to_open" }
];

export function buildContracts(overrides: Partial<OptionContract>[] = []): OptionContract[] {
  const base: OptionContract[] = [
    {
      symbol: LONG_LEG,
      underlying: "SPY",
      expiry: "2026-09-18",
      strike: "560.00",
      type: "call",
      bid: "5.00",
      ask: "5.20",
      bidSize: 40,
      askSize: 55,
      delta: 0.42,
      impliedVolatility: 0.17,
      openInterest: 1200,
      volume: 300,
      quoteTimestamp: FIXED_NOW.toISOString()
    },
    {
      symbol: SHORT_LEG,
      underlying: "SPY",
      expiry: "2026-09-18",
      strike: "565.00",
      type: "call",
      bid: "2.60",
      ask: "2.80",
      bidSize: 30,
      askSize: 35,
      delta: 0.3,
      impliedVolatility: 0.166,
      openInterest: 900,
      volume: 210,
      quoteTimestamp: FIXED_NOW.toISOString()
    }
  ];
  return base.map((contract, index) => ({ ...contract, ...(overrides[index] ?? {}) }));
}

// ---------------------------------------------------------------------------
// Snapshots — hashes are computed, not invented, so COV-08 can verify them
// ---------------------------------------------------------------------------

export function buildAccountSnapshot(overrides: Partial<AccountSnapshot> = {}): AccountSnapshot {
  const base: AccountSnapshot = {
    id: "acct-snap-1",
    capturedAt: FIXED_NOW.toISOString(),
    accountId: "PA-TEST-0001",
    equity: "100000.00",
    lastEquity: "100000.00",
    buyingPower: "100000.00",
    optionsApprovedLevel: 3,
    tradingBlocked: false,
    dayPnl: "0.00",
    dayPnlPct: 0,
    openPositions: [],
    snapshotHash: "",
    ...overrides
  };
  return { ...base, snapshotHash: computeAccountSnapshotHash(base) };
}

export function buildMarketSnapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  const base: MarketSnapshot = {
    id: "mkt-snap-1",
    capturedAt: FIXED_NOW.toISOString(),
    feed: "indicative",
    clock: {
      isOpen: true,
      sessionDate: SESSION_DATE,
      nextOpen: "2026-09-01T13:30:00.000Z",
      nextClose: "2026-08-31T20:00:00.000Z"
    },
    underlyings: [{ underlying: "SPY", last: "561.20", quoteTimestamp: FIXED_NOW.toISOString() }],
    contracts: buildContracts(),
    snapshotHash: "",
    ...overrides
  };
  return { ...base, snapshotHash: computeMarketSnapshotHash(base) };
}

export function buildSession(overrides: Partial<SessionStatus> = {}): SessionStatus {
  return {
    state: "ACTIVE",
    sessionDate: SESSION_DATE,
    haltedAt: null,
    haltReason: null,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Intent
// ---------------------------------------------------------------------------

export function buildIntent(
  policy: Policy,
  account: AccountSnapshot,
  market: MarketSnapshot,
  overrides: Partial<TradeIntent> = {}
): TradeIntent {
  const base: TradeIntent = {
    id: "intent-1",
    policyId: policy.id,
    policyHash: policy.policyHash,
    underlying: "SPY",
    structure: "BULL_CALL_DEBIT",
    legs: SPY_LEGS,
    quantity: 1,
    limitPrice: "2.40",
    limitPriceBand: { min: "2.30", max: "2.50" },
    timeInForce: "day",
    expiry: "2026-09-18",
    dte: 18,
    // 1 contract x $2.40 debit x 100 multiplier
    standaloneMaxLoss: "240.00",
    portfolioHeatAfterTrade: "240.00",
    alphaScore: 0.62,
    modelConfidenceMultiplier: 1,
    thesis: "Debit vertical; IV not rich, 5/20 trend up.",
    marketSnapshotHash: market.snapshotHash,
    accountSnapshotHash: account.snapshotHash,
    intentHash: "",
    createdAt: FIXED_NOW.toISOString(),
    expiresAt: new Date(FIXED_NOW.getTime() + 60_000).toISOString(),
    ...overrides
  };
  return { ...base, intentHash: computeIntentHash(base) };
}

export interface World {
  policy: Policy;
  account: AccountSnapshot;
  market: MarketSnapshot;
  session: SessionStatus;
  intent: TradeIntent;
}

/** A mutually consistent world that clears every invariant. */
export function buildWorld(
  overrides: {
    policy?: Partial<Policy>;
    account?: Partial<AccountSnapshot>;
    market?: Partial<MarketSnapshot>;
    session?: Partial<SessionStatus>;
    intent?: Partial<TradeIntent>;
  } = {}
): World {
  const policy = buildPolicy(overrides.policy);
  const account = buildAccountSnapshot(overrides.account);
  const market = buildMarketSnapshot(overrides.market);
  const session = buildSession(overrides.session);
  const intent = buildIntent(policy, account, market, overrides.intent);
  return { policy, account, market, session, intent };
}

// ---------------------------------------------------------------------------
// Permits
// ---------------------------------------------------------------------------

export function permitClaimsFor(
  intent: TradeIntent,
  policy: Policy,
  overrides: Partial<PermitClaims> = {}
): PermitClaims {
  return {
    policyId: policy.id,
    policyVersion: policy.version,
    policyHash: policy.policyHash,
    intentHash: intent.intentHash,
    accountSnapshotHash: intent.accountSnapshotHash,
    marketSnapshotHash: intent.marketSnapshotHash,
    exactLegs: intent.legs,
    maxQuantity: intent.quantity,
    limitPriceBand: intent.limitPriceBand,
    ...overrides
  };
}

export interface Harness extends World {
  permit: TradePermit;
  transport: SpyTransport;
  nonceStore: InMemoryNonceStore;
  publicKeyPem: string;
  privateKeyPem: string;
}

/** A fully valid, signed, registered permit — the baseline every attack mutates. */
export async function buildHarness(
  options: {
    intentOverrides?: Partial<TradeIntent>;
    permitOverrides?: Partial<PermitClaims>;
    ttlSeconds?: number;
  } = {}
): Promise<Harness> {
  const { privateKeyPem, publicKeyPem } = testKeyPair();
  const world = buildWorld({ intent: options.intentOverrides });

  const permit = signPermit(permitClaimsFor(world.intent, world.policy, options.permitOverrides), {
    privateKeyPem,
    now: FIXED_NOW,
    ttlSeconds: options.ttlSeconds ?? 60
  });

  const nonceStore = new InMemoryNonceStore();
  await nonceStore.register(permit.nonce);

  return {
    ...world,
    permit,
    transport: new SpyTransport(),
    nonceStore,
    publicKeyPem,
    privateKeyPem
  };
}
