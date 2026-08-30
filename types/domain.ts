/**
 * Covenant domain types — FROZEN.
 *
 * See IMPLEMENTATION.md §6. Changes require both leads plus a Decision Log entry.
 * Lane A builds against these; Lane B implements them. Do not edit to make a
 * local problem go away — raise it instead.
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

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export interface Policy {
  id: string;
  version: number;
  status: PolicyStatus;
  /** sha256 of canonical JSON, excluding this field. */
  policyHash: string;
  createdAt: string;
  activatedAt: string | null;
  plainEnglishEcho: string;
  allowedUnderlyings: Underlying[];
  allowedStructures: Structure[];
  riskProfile: RiskProfile;
  /** Percent of equity. 0.6 means 0.6%. */
  perTradeMaxLossPct: number;
  portfolioHeatMaxLossPct: number;
  /** Negative. -1.25 means halt at -1.25% on the day. */
  dailyHaltPct: number;
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
  /** Literal — not configurable. Fail closed is not a preference. */
  missingStateAction: "ABSTAIN";
  /** Literal — not configurable. A model may never widen. */
  modelAuthority: "VETO_OR_SHRINK";
  invariants: InvariantId[];
}

// ---------------------------------------------------------------------------
// Market and account state
// ---------------------------------------------------------------------------

export interface Leg {
  /** OCC contract symbol, e.g. SPY260116C00500000 */
  symbol: string;
  ratioQty: number;
  side: "buy" | "sell";
  positionIntent: "buy_to_open" | "sell_to_open" | "buy_to_close" | "sell_to_close";
}

export interface OptionContract {
  symbol: string;
  underlying: Underlying;
  /** ISO date (YYYY-MM-DD). */
  expiry: string;
  strike: string;
  type: "call" | "put";
  bid: string;
  ask: string;
  bidSize: number;
  askSize: number;
  delta: number | null;
  impliedVolatility: number | null;
  openInterest: number;
  volume: number;
  /** ISO timestamp of the quote itself, not of the fetch. COV-05 reads this. */
  quoteTimestamp: string;
}

export interface UnderlyingQuote {
  underlying: Underlying;
  last: string;
  quoteTimestamp: string;
}

export interface MarketClock {
  isOpen: boolean;
  /** Trading date this clock reading belongs to (YYYY-MM-DD). COV-04 reads this. */
  sessionDate: string;
  nextOpen: string;
  nextClose: string;
}

export interface MarketSnapshot {
  id: string;
  capturedAt: string;
  /** Provenance. Replay must be able to label every fact. */
  feed: "indicative" | "opra";
  clock: MarketClock;
  underlyings: UnderlyingQuote[];
  contracts: OptionContract[];
  /** sha256 of canonical JSON, excluding this field. */
  snapshotHash: string;
}

export interface OpenPosition {
  structureId: string;
  underlying: Underlying;
  structure: Structure;
  legs: Leg[];
  quantity: number;
  /** Absolute dollars. COV-03 sums these as a conservative upper bound. */
  standaloneMaxLoss: string;
  openedAt: string;
  expiry: string;
  dte: number;
}

export interface AccountSnapshot {
  id: string;
  capturedAt: string;
  accountId: string;
  equity: string;
  /** Previous session close equity. Daily P&L is derived from this. */
  lastEquity: string;
  buyingPower: string;
  optionsApprovedLevel: number;
  tradingBlocked: boolean;
  /** Negative for a loss. */
  dayPnl: string;
  dayPnlPct: number;
  openPositions: OpenPosition[];
  /** sha256 of canonical JSON, excluding this field. */
  snapshotHash: string;
}

// ---------------------------------------------------------------------------
// Intent and permit
// ---------------------------------------------------------------------------

export interface PriceBand {
  min: string;
  max: string;
}

export interface TradeIntent {
  id: string;
  policyId: string;
  policyHash: string;
  underlying: Underlying;
  structure: Structure;
  legs: Leg[];
  quantity: number;
  limitPrice: string;
  limitPriceBand: PriceBand;
  timeInForce: "day";
  /** Contract expiry (ISO date). */
  expiry: string;
  dte: number;
  standaloneMaxLoss: string;
  portfolioHeatAfterTrade: string;
  alphaScore: number;
  /** [0,1]. May only shrink. A value above 1 is a defect, not a preference. */
  modelConfidenceMultiplier: number;
  thesis: string;
  marketSnapshotHash: string;
  accountSnapshotHash: string;
  /** sha256 of canonical JSON, excluding this field. */
  intentHash: string;
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
  limitPriceBand: PriceBand;
  /** TTL. Default 60s. */
  expiresAt: string;
  nonce: string;
  createdAt: string;
  signingKeyId: string;
  /** Ed25519 over canonical JSON, excluding this field. */
  signature: string;
}

export interface KernelResult {
  decision: Decision;
  permit?: TradePermit;
  /**
   * The intent the permit is actually bound to. Identical to the submitted
   * intent on APPROVE; the smaller rebuilt intent on SHRINK. Amended into the
   * frozen set 30 Aug 2026 — see IMPLEMENTATION.md Decision Log: a SHRINK
   * decision is unusable without it, because the executor must submit the
   * intent whose hash the permit signed.
   */
  finalIntent?: TradeIntent;
  shrunkQuantity?: number;
  failedInvariants: InvariantId[];
  /** Human-readable. This string is shown to judges on the dashboard. */
  reason: string;
  evaluatedAt: string;
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
// Event journal
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
