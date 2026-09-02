import type { Policy, TradeIntent, TradePermit, Underlying } from "@/types/domain";

export type PermitLifecycleStatus = "SIGNED" | "USED" | "EXPIRED";
export type PermitExecutionOutcome = "HELD" | "SUBMITTED" | "BROKER_ERROR" | "REJECTED" | "UNKNOWN";
export type PreparedTradeStatus = "READY" | "STALE" | "SIGNED" | "EXPIRED";

export interface PreparedTrade {
  draftId: string;
  status: PreparedTradeStatus;
  symbol: Underlying;
  intent: TradeIntent;
  policy: Pick<Policy, "id" | "version" | "policyHash" | "plainEnglishEcho">;
  createdAt: string;
  expiresAt: string;
}

export interface PermitSummary {
  permitId: string;
  symbol: Underlying;
  structure: TradeIntent["structure"];
  quantity: number;
  maxLoss: string;
  createdAt: string;
  expiresAt: string;
  lifecycle: PermitLifecycleStatus;
  execution: PermitExecutionOutcome;
  orderId: string | null;
}

export interface PermitDetail extends PermitSummary {
  permit: TradePermit;
  intent: TradeIntent;
  policy: Pick<Policy, "id" | "version" | "policyHash" | "plainEnglishEcho">;
  usedAt: string | null;
  requestId: string | null;
  rejectionCode: string | null;
  rejectionReason: string | null;
}

export type PermitApiErrorCode =
  | "TRADE_CHANGED"
  | "PERMIT_EXPIRED"
  | "PERMIT_USED"
  | "MARKET_CLOSED"
  | "EXECUTION_DISABLED"
  | "UNAUTHORIZED"
  | "STORAGE_UNAVAILABLE"
  | "NO_CANDIDATE";
