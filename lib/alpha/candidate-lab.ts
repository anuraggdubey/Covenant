/**
 * Candidate Lab loader — ranked SPY/QQQ verticals plus the option ladder.
 *
 * Closed cash session is not a 409. Last quotes are labelled STALE. A failed
 * fetch may return the last successful payload, also labelled STALE. The
 * autonomous tick still fail-closes; this path is observation for the lab.
 */

import { AlpacaReadClient } from "@/lib/alpaca/client";
import type { AlpacaClockResponse } from "@/lib/alpaca/types";
import { buildAccountSnapshot, buildMarketSnapshot } from "@/lib/alpha/snapshots";
import { generateCandidates, type CandidateSpread } from "@/lib/alpha/factory";
import { analyzeMarketSignals } from "@/lib/alpha/signals";
import { rankAndSizeCandidates, type RankedCandidate } from "@/lib/alpha/ranking";
import { defaultActivePolicy } from "@/lib/alpha/loop";
import { getOperatorActivePolicy } from "@/lib/alpha/runtime-policy";
import type { AccountSnapshot, OptionContractSnapshot, Policy } from "@/types/domain";
import type {
  CandidateLabResponse,
  LadderRowView,
  RankedCandidateView,
  UnderlyingLabView
} from "@/lib/alpha/candidate-lab-types";
import {
  getFreshCandidateLab,
  lastCandidateLab,
  rememberCandidateLab,
  staleFromCache
} from "@/lib/alpha/candidate-snapshot-cache";

/** Last-session quotes are hours old; the kernel still uses the live cap. */
export const STALE_LAB_QUOTE_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_SPREAD_CARDS = 50;

export function candidateLabPolicy(isOpen: boolean, feed?: string): Policy {
  const base = getOperatorActivePolicy() ?? defaultActivePolicy;
  const policy = isOpen ? base : { ...base, maxQuoteAgeMs: STALE_LAB_QUOTE_AGE_MS };
  if (feed === "indicative") {
    return { ...policy, minOpenInterest: 0 };
  }
  return policy;
}

function toContractView(contract: OptionContractSnapshot | undefined): LadderRowView["call"] {
  if (!contract) return undefined;
  return {
    symbol: contract.symbol,
    bid: contract.bid,
    ask: contract.ask,
    delta: contract.delta,
    impliedVolatility: contract.impliedVolatility
  };
}

function rankedToView(ranked: RankedCandidate): RankedCandidateView {
  return {
    id: ranked.candidate.id,
    structure: ranked.candidate.structure,
    expiry: ranked.candidate.expiry,
    dte: ranked.candidate.dte,
    legs: ranked.candidate.legs,
    quantity: ranked.quantity,
    limitPrice: ranked.finalPayoff.limitPrice,
    standaloneMaxLoss: ranked.finalPayoff.standaloneMaxLoss,
    standaloneMaxGain: ranked.finalPayoff.standaloneMaxGain,
    breakevenUnderlying: ranked.finalPayoff.breakevenUnderlying,
    riskRewardRatio: ranked.finalPayoff.riskRewardRatio,
    alphaScore: ranked.alphaScore,
    expectedPnl: ranked.expectedPnl,
    lowerConfidenceBoundPnl: ranked.lowerConfidenceBoundPnl,
    scenarioCount: ranked.scenarioCount,
    thesis: ranked.thesis
  };
}

function factoryToView(candidate: CandidateSpread): RankedCandidateView {
  return {
    id: candidate.id,
    structure: candidate.structure,
    expiry: candidate.expiry,
    dte: candidate.dte,
    legs: candidate.legs,
    quantity: 1,
    limitPrice: candidate.payoff.limitPrice,
    standaloneMaxLoss: candidate.payoff.standaloneMaxLoss,
    standaloneMaxGain: candidate.payoff.standaloneMaxGain,
    breakevenUnderlying: candidate.payoff.breakevenUnderlying,
    riskRewardRatio: candidate.payoff.riskRewardRatio,
    alphaScore: 0,
    expectedPnl: "0.00",
    lowerConfidenceBoundPnl: "0.00",
    scenarioCount: 0,
    thesis:
      `${candidate.underlying} ${candidate.structure} defined-risk envelope from last available quotes. ` +
      "Ranking did not size this spread (observation only)."
  };
}

function displaySpreads(ranked: RankedCandidate[], factory: CandidateSpread[]): RankedCandidateView[] {
  if (ranked.length > 0) return ranked.slice(0, MAX_SPREAD_CARDS).map(rankedToView);
  return factory.slice(0, MAX_SPREAD_CARDS).map(factoryToView);
}

async function buildUnderlyingLab(
  readClient: AlpacaReadClient,
  sym: "SPY" | "QQQ",
  accountSnapshot: AccountSnapshot,
  clock: AlpacaClockResponse
): Promise<UnderlyingLabView> {
  const [stockSnap, rawOptions, asset, barsResp] = await Promise.all([
    readClient.getStockSnapshot(sym),
    readClient.getOptionSnapshots(sym),
    readClient.getAsset(sym),
    readClient.getStockBars(sym, "1Day", 60),
  ]);
  if (!asset.tradable) {
    throw new Error(`${sym} is not tradable.`);
  }
  // Alpaca omits has_options on some paper asset payloads. Only an explicit
  // false is a hard no — missing must not blank the lab.
  if (asset.has_options === false) {
    throw new Error(`${sym} is not enabled for options.`);
  }
  const bars = barsResp.bars[sym] ?? [];

  const price =
    stockSnap.latestTrade?.p?.toFixed(2) ??
    stockSnap.latestQuote?.ap?.toFixed(2);
  if (!price) throw new Error(`Missing underlying price for ${sym}.`);

  const feed = readClient.isMockMode() ? "synthetic" : readClient.getOptionFeed();
  const labPolicy = candidateLabPolicy(clock.is_open, feed);
  const marketSnapshot = buildMarketSnapshot(
    sym,
    price,
    rawOptions,
    feed,
    clock.timestamp
  );
  const candidates = generateCandidates(marketSnapshot, labPolicy, 1);
  const impliedVolatilities = Object.values(marketSnapshot.contracts)
    .map((contract) => contract.impliedVolatility)
    .filter((value): value is number => value !== undefined && Number.isFinite(value));
  const chainIvAverage = impliedVolatilities.length > 0
    ? impliedVolatilities.reduce((sum, value) => sum + value, 0) / impliedVolatilities.length
    : undefined;
  const signals = analyzeMarketSignals(bars, chainIvAverage);
  const ranked = rankAndSizeCandidates(
    candidates,
    labPolicy,
    accountSnapshot,
    signals,
    price,
    1.0
  );

  const expirationsSet = new Set<string>();
  const ladderByExpiry: Record<string, Record<string, { call?: OptionContractSnapshot; put?: OptionContractSnapshot }>> = {};

  for (const contract of Object.values(marketSnapshot.contracts)) {
    expirationsSet.add(contract.expiration);
    if (!ladderByExpiry[contract.expiration]) {
      ladderByExpiry[contract.expiration] = {};
    }
    if (!ladderByExpiry[contract.expiration][contract.strike]) {
      ladderByExpiry[contract.expiration][contract.strike] = {};
    }

    if (contract.type === "call") {
      ladderByExpiry[contract.expiration][contract.strike].call = contract;
    } else {
      ladderByExpiry[contract.expiration][contract.strike].put = contract;
    }
  }

  const formattedLadders: UnderlyingLabView["ladderByExpiry"] = {};
  for (const [exp, strikesMap] of Object.entries(ladderByExpiry)) {
    const sortedStrikes = Object.keys(strikesMap).sort((a, b) => Number(a) - Number(b));
    formattedLadders[exp] = sortedStrikes.map((strike) => ({
      strike,
      call: toContractView(strikesMap[strike].call),
      put: toContractView(strikesMap[strike].put)
    }));
  }

  return {
    underlying: sym,
    underlyingPrice: price,
    feed: marketSnapshot.feed,
    marketSnapshotHash: marketSnapshot.snapshotHash,
    totalContractsInChain: Object.keys(marketSnapshot.contracts).length,
    expirations: Array.from(expirationsSet).sort(),
    ladderByExpiry: formattedLadders,
    signals: {
      usable: signals.usable,
      trend: signals.trend,
      realizedVol20d: signals.realizedVol20d
    },
    candidatesCount: candidates.length,
    rankedCandidates: displaySpreads(ranked, candidates)
  };
}

export async function fetchCandidateLabFromBroker(
  readClient: AlpacaReadClient
): Promise<CandidateLabResponse> {
  const clock = await readClient.getClock();
  const rawAccount = await readClient.getAccount();
  const accountSnapshot = buildAccountSnapshot(rawAccount);

  const symbols = ["SPY", "QQQ"] as const;
  const results = await Promise.all(
    symbols.map((sym) => buildUnderlyingLab(readClient, sym, accountSnapshot, clock))
  );

  const freshness = clock.is_open ? "LIVE" : "STALE";
  const warning = clock.is_open
    ? undefined
    : "Market is closed. Showing the latest Alpaca quotes from the previous session. These marks are not live.";

  return {
    timestamp: new Date().toISOString(),
    dataMode: readClient.isMockMode() ? "SYNTHETIC_MOCK" : "PAPER",
    freshness,
    source: "BROKER",
    asOf: clock.timestamp,
    warning,
    clock: {
      isOpen: clock.is_open,
      timestamp: clock.timestamp,
      nextOpen: clock.next_open,
      nextClose: clock.next_close
    },
    account: {
      id: `...${accountSnapshot.accountId.slice(-4)}`,
      equity: accountSnapshot.equity,
      buyingPower: accountSnapshot.buyingPower,
      optionsLevel: accountSnapshot.optionsLevel,
      snapshotHash: accountSnapshot.snapshotHash
    },
    underlyings: results
  };
}

export async function loadCandidateLab(
  readClient?: AlpacaReadClient,
  options?: { force?: boolean }
): Promise<CandidateLabResponse> {
  const client = readClient ?? new AlpacaReadClient();
  if (!options?.force && !client.isMockMode()) {
    const fresh = getFreshCandidateLab();
    if (fresh !== null) {
      return fresh;
    }
  }
  try {
    const payload = await fetchCandidateLabFromBroker(client);
    rememberCandidateLab(payload);
    return payload;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Candidate fetch failed.";
    const cached = staleFromCache(
      new Date().toISOString(),
      `Live fetch failed (${message}). Showing the last successful snapshot, labelled STALE.`
    );
    if (cached !== null) return cached;
    throw error;
  }
}

export { lastCandidateLab };
