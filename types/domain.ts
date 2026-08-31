/**
 * types/domain.ts — FROZEN. Changes require both leads + Decision Log entry.
 *
 * MERGE NOTE (31 Aug 2026): Lane A's snapshot shapes are the base — the alpha
 * engine, the read client and the position monitor all compile against them,
 * and they are the ones fed by real Alpaca data. Lane B's additions are
 * layered on as OPTIONAL fields so nothing in Lane A breaks, and every
 * invariant that needs one ABSTAINS when it is absent. Fail closed rather
 * than assume.
 *
 * Money is always a decimal string, never a number. Float drift in a max-loss
 * calculation would falsify COV-02.
 */

export type PolicyStatus = "DRAFT" | "TESTING" | "READY" | "ACTIVE" | "BLOCKED" | "ARCHIVED";
export type Decision = "APPROVE" | "SHRINK" | "VETO" | "ABSTAIN" | "EXECUTE" | "ESCALATE";
export type Structure = "BULL_CALL_DEBIT" | "BEAR_PUT_DEBIT" | "CREDIT_VERTICAL";
export type Underlying = "SPY" | "QQQ";
export type SessionState = "ACTIVE" | "HALTED";
export type RiskProfile = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";

export type InvariantId =
  | "COV-01"
  | "COV-02"
  | "COV-03"
  | "COV-04"
  | "COV-05"
  | "COV-06"
  | "COV-07"
  | "COV-08";

export const ALL_INVARIANTS: readonly InvariantId[] = [
  "COV-01",
  "COV-02",
  "COV-03",
  "COV-04",
  "COV-05",
  "COV-06",
  "COV-07",
  "COV-08"
] as const;

export interface PriceBand {
  min: string;
  max: string;
}

export interface Policy {
  id: string;
  version: number;
  status: PolicyStatus;
  policyHash: string;                // sha256 of canonical JSON, excluding this field
  createdAt: string;
  activatedAt: string | null;
  plainEnglishEcho: string;
  allowedUnderlyings: Underlying[];  // default ["SPY","QQQ"]
  allowedStructures: Structure[];
  riskProfile: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  perTradeMaxLossPct: number;        // of equity
  portfolioHeatMaxLossPct: number;
  dailyHaltPct: number;              // negative
  minDte: number;
  maxDte: number;
  minDelta: number;
  maxDelta: number;
  maxQuoteAgeMs: number;
  maxBidAskWidthPct: number;
  minOpenInterest: number;
  minVolume: number;
  duplicateExposureCooldownMinutes: number;
  exitAttemptDeadlineMinutes: number;
  missingStateAction: "ABSTAIN";     // literal — not configurable
  modelAuthority: "VETO_OR_SHRINK";  // literal — not configurable
  invariants: string[];              // ["COV-01", ..., "COV-08"]
}

export interface Leg {
  symbol: string;                    // OCC contract symbol, e.g. SPY260116C00500000
  ratioQty: number;
  side: "buy" | "sell";
  positionIntent: "buy_to_open" | "sell_to_open" | "buy_to_close" | "sell_to_close";
}

export interface TradeIntent {
  id: string;
  policyId: string;
  policyHash: string;
  underlying: Underlying;
  structure: Structure;
  legs: Leg[];
  quantity: number;
  limitPrice: string;                // decimal string, never a float
  limitPriceBand: { min: string; max: string };
  timeInForce: "day";
  expiry: string;                    // contract expiry (ISO date)
  dte: number;
  standaloneMaxLoss: string;         // absolute dollars, decimal string
  portfolioHeatAfterTrade: string;
  alphaScore: number;
  modelConfidenceMultiplier: number; // [0,1] — may only shrink
  thesis: string;
  marketSnapshotHash: string;
  accountSnapshotHash: string;
  intentHash: string;                // sha256 of canonical JSON, excluding this field
  createdAt: string;
  expiresAt: string;
}

export interface TradePermit {
  permitId: string;
  policyId: string;
  policyVersion: number;
  policyHash: string;
  intentHash: string;
  accountSnapshotHash: string;
  marketSnapshotHash: string;
  exactLegs: Leg[];
  maxQuantity: number;
  limitPriceBand: { min: string; max: string };
  expiresAt: string;                 // TTL, default 60s
  nonce: string;
  createdAt: string;
  signingKeyId: string;
  signature: string;                 // Ed25519 over canonical JSON, excluding this field
}

export interface KernelResult {
  decision: Decision;
  permit?: TradePermit;
  /**
   * The intent the permit is bound to: identical to the submitted intent on
   * APPROVE, the smaller rebuilt intent on SHRINK. Without it a SHRINK is
   * unusable, because the executor must submit the intent whose hash the
   * permit signed. See IMPLEMENTATION.md Decision Log, 30 Aug 2026.
   */
  finalIntent?: TradeIntent;
  shrunkQuantity?: number;
  failedInvariants: string[];        // e.g. ["COV-03"]
  reason: string;                    // human-readable, shown on the dashboard
  evaluatedAt: string;
}

/**
 * Broker clock reading. COV-04's halt reset and COV-08's market-open check
 * both read this, and both abstain when it is absent — a session boundary we
 * cannot verify is not a session boundary.
 */
export interface MarketClock {
  isOpen: boolean;
  sessionDate: string;               // trading date (YYYY-MM-DD) per the broker
  nextOpen: string;
  nextClose: string;
}

export interface MarketSnapshot {
  timestamp: string;
  feed: string;
  underlying: Underlying;
  underlyingPrice: string;
  contracts: Record<string, OptionContractSnapshot>;
  /** Lane B addition. Absent => COV-04 and COV-08 abstain. */
  clock?: MarketClock;
  snapshotHash: string;
}

export interface OptionContractSnapshot {
  symbol: string;
  strike: string;
  expiration: string;
  type: "call" | "put";
  bid: string;
  ask: string;
  bidSize: number;
  askSize: number;
  latestTradePrice?: string;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  openInterest: number;
  volume: number;
  quoteTimestamp: string;
}

/**
 * An open defined-risk structure, as the kernel needs to see it.
 *
 * COV-03 sums `standaloneMaxLoss` across these as a conservative upper bound
 * on portfolio risk; COV-06 reads the legs and `openedAt` for duplicate
 * detection; COV-07 reads `dte` for the exit deadline.
 */
export interface OpenPosition {
  structureId: string;
  underlying: Underlying;
  structure: Structure;
  legs: Leg[];
  quantity: number;
  standaloneMaxLoss: string;
  openedAt: string;
  expiry: string;
  dte: number;
}

export interface AccountSnapshot {
  timestamp: string;
  accountId: string;
  equity: string;
  cash: string;
  buyingPower: string;
  portfolioHeatPct: number;
  dailyRealizedPnl: string;
  dailyUnrealizedPnl: string;
  optionsLevel: number;
  status: string;
  /** Lane B additions. Absent => the invariant that needs one abstains. */
  dayPnlPct?: number;                // negative for a loss. COV-04.
  openPositions?: OpenPosition[];    // COV-03, COV-06, COV-07.
  tradingBlocked?: boolean;          // COV-08. Derived from `status` when absent.
  snapshotHash: string;
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

export interface SessionStatus {
  state: SessionState;
  /** The trading date this state belongs to. Reset requires a NEW verified date. */
  sessionDate: string;
  haltedAt: string | null;
  haltReason: string | null;
}

// ---------------------------------------------------------------------------
// Event journal and proof
// ---------------------------------------------------------------------------

export type EventType =
  | "MANDATE_DRAFTED"
  | "POLICY_VALIDATED"
  | "CONTRADICTION_FOUND"
  | "BREAK_ME_STARTED"
  | "COUNTEREXAMPLE_FOUND"
  | "POLICY_ACTIVATED"
  | "MARKET_SNAPSHOT_RECORDED"
  | "ACCOUNT_SNAPSHOT_RECORDED"
  | "TRADE_INTENT_CREATED"
  | "MODEL_VETOED"
  | "MODEL_SHRANK"
  | "KERNEL_REJECTED"
  | "KERNEL_ABSTAINED"
  | "PERMIT_SIGNED"
  | "PERMIT_VALIDATED"
  | "PERMIT_REPLAY_REJECTED"
  | "ORDER_SUBMITTED"
  | "ORDER_ACCEPTED"
  | "ORDER_FILLED"
  | "EXIT_ATTEMPTED"
  | "HALT_TRIGGERED"
  | "SHADOW_MARK_CREATED"
  | "REPLAY_VERIFIED";

export interface CovenantEvent {
  eventId: string;
  eventType: EventType;
  payload: unknown;
  payloadHash: string;
  previousEventHash: string | null;
  eventHash: string;
  timestamp: string;
  codeRevision: string;
  actor: string;
}

export interface RunManifest {
  runId: string;
  createdAt: string;
  codeRevision: string;
  policyHash: string;
  signingKeyId: string;
  /** Public half only. A manifest must be verifiable without any secret. */
  publicKeyPem: string;
  events: CovenantEvent[];
  headEventHash: string | null;
}
