// types/domain.ts — FROZEN. Changes require both leads + Decision Log entry.

export type PolicyStatus = "DRAFT" | "TESTING" | "READY" | "ACTIVE" | "BLOCKED" | "ARCHIVED";
export type Decision = "APPROVE" | "SHRINK" | "VETO" | "ABSTAIN" | "EXECUTE" | "ESCALATE";
export type Structure = "BULL_CALL_DEBIT" | "BEAR_PUT_DEBIT" | "CREDIT_VERTICAL";
export type Underlying = "SPY" | "QQQ";
export type SessionState = "ACTIVE" | "HALTED";

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
  shrunkQuantity?: number;
  failedInvariants: string[];        // e.g. ["COV-03"]
  reason: string;                    // human-readable, shown on the dashboard
  evaluatedAt: string;
}

export interface MarketSnapshot {
  timestamp: string;
  feed: string;
  underlying: Underlying;
  underlyingPrice: string;
  contracts: Record<string, OptionContractSnapshot>;
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
  snapshotHash: string;
}
