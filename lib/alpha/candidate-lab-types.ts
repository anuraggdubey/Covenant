import type { OptionContractSnapshot } from "@/types/domain";
import type { SignalAnalysis } from "@/lib/alpha/signals";

export type CandidateFreshness = "LIVE" | "STALE";
export type CandidateSource = "BROKER" | "CACHE";

export interface ContractView {
  bid: string;
  ask: string;
  delta?: number;
  impliedVolatility?: number;
}

export interface LegView {
  symbol: string;
  side: "buy" | "sell";
  ratioQty: number;
  positionIntent: string;
}

export interface RankedCandidateView {
  id: string;
  structure: string;
  expiry: string;
  dte: number;
  legs: LegView[];
  quantity: number;
  limitPrice: string;
  standaloneMaxLoss: string;
  standaloneMaxGain: string;
  breakevenUnderlying: string;
  riskRewardRatio: string;
  alphaScore: number;
  expectedPnl: string;
  lowerConfidenceBoundPnl: string;
  scenarioCount: number;
  thesis: string;
}

export interface LadderRowView {
  strike: string;
  call?: Pick<OptionContractSnapshot, "bid" | "ask" | "delta" | "impliedVolatility" | "symbol">;
  put?: Pick<OptionContractSnapshot, "bid" | "ask" | "delta" | "impliedVolatility" | "symbol">;
}

export interface UnderlyingLabView {
  underlying: "SPY" | "QQQ";
  underlyingPrice: string;
  feed: string;
  marketSnapshotHash: string;
  totalContractsInChain: number;
  expirations: string[];
  ladderByExpiry: Record<string, LadderRowView[]>;
  signals: Pick<SignalAnalysis, "usable" | "trend" | "realizedVol20d">;
  candidatesCount: number;
  rankedCandidates: RankedCandidateView[];
}

export interface CandidateLabResponse {
  timestamp: string;
  dataMode: "PAPER" | "SYNTHETIC_MOCK";
  freshness: CandidateFreshness;
  source: CandidateSource;
  asOf: string;
  warning?: string;
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
  underlyings: UnderlyingLabView[];
}

export interface CandidateLabFilters {
  query: string;
  expiry: string;
  structure: string;
  strikeMin: string;
  strikeMax: string;
  maxLossMax: string;
}

export const EMPTY_CANDIDATE_FILTERS: CandidateLabFilters = {
  query: "",
  expiry: "",
  structure: "",
  strikeMin: "",
  strikeMax: "",
  maxLossMax: ""
};
