import Decimal from "decimal.js";
import type {
  MarketSnapshot,
  AccountSnapshot,
  OptionContractSnapshot,
  Underlying,
} from "@/types/domain";
import type {
  AlpacaAccountResponse,
  AlpacaOptionSnapshotsResponse,
} from "@/lib/alpaca/types";
import { sha256Canonical } from "./canonical";
import { parseOccSymbol } from "./occ";

export { parseOccSymbol, formatOccSymbol } from "./occ";

/**
 * Builds and hashes a MarketSnapshot from Alpaca option chain data.
 */
export function buildMarketSnapshot(
  underlying: Underlying,
  underlyingPrice: string,
  rawSnapshots: AlpacaOptionSnapshotsResponse,
  feed: string = "indicative",
  timestamp?: string
): MarketSnapshot {
  const contracts: Record<string, OptionContractSnapshot> = {};
  const currentIso = timestamp ?? new Date().toISOString();

  if (!Number.isFinite(Date.parse(currentIso))) {
    throw new Error("[FAIL-CLOSED] Market snapshot timestamp is invalid.");
  }
  const parsedUnderlyingPrice = new Decimal(underlyingPrice);
  if (!parsedUnderlyingPrice.isFinite() || parsedUnderlyingPrice.lessThanOrEqualTo(0)) {
    throw new Error("[FAIL-CLOSED] Underlying price must be a positive finite decimal.");
  }
  if (rawSnapshots.next_page_token) {
    throw new Error("[FAIL-CLOSED] Option chain is incomplete; pagination remains.");
  }

  for (const [symbol, snap] of Object.entries(rawSnapshots.snapshots)) {
    const parsed = parseOccSymbol(symbol);
    if (parsed.underlying !== underlying) {
      throw new Error(
        `[FAIL-CLOSED] Option chain for ${underlying} contains contract ${symbol} for ${parsed.underlying}.`
      );
    }
    const quote = snap.latestQuote;
    contracts[symbol] = {
      symbol,
      strike: parsed.strike,
      expiration: parsed.expiration,
      type: parsed.type,
      bid: quote ? new Decimal(quote.bp).toFixed(2) : "0.00",
      ask: quote ? new Decimal(quote.ap).toFixed(2) : "0.00",
      bidSize: quote?.bs ?? 0,
      askSize: quote?.as ?? 0,
      latestTradePrice: snap.latestTrade ? new Decimal(snap.latestTrade.p).toFixed(2) : undefined,
      impliedVolatility: snap.impliedVolatility,
      delta: snap.greeks?.delta,
      gamma: snap.greeks?.gamma,
      theta: snap.greeks?.theta,
      vega: snap.greeks?.vega,
      openInterest: snap.openInterest ?? snap.open_interest ?? 0,
      volume: snap.dailyBar?.v ?? 0,
      quoteTimestamp: quote?.t ?? "",
    };
  }

  if (Object.keys(contracts).length === 0) {
    throw new Error(`[FAIL-CLOSED] Option chain for ${underlying} is empty.`);
  }

  const unsignedSnapshot: Omit<MarketSnapshot, "snapshotHash"> = {
    timestamp: currentIso,
    feed,
    underlying,
    underlyingPrice: parsedUnderlyingPrice.toFixed(2),
    contracts,
  };

  const snapshotHash = sha256Canonical(unsignedSnapshot);

  return {
    ...unsignedSnapshot,
    snapshotHash,
  };
}

/**
 * Builds and hashes an AccountSnapshot from Alpaca account data.
 */
export function buildAccountSnapshot(
  rawAccount: AlpacaAccountResponse,
  portfolioHeatPct: number = 0,
  timestamp?: string
): AccountSnapshot {
  const currentIso = timestamp ?? new Date().toISOString();
  
  // Calculate unrealized P&L: equity - last_equity
  const equityDec = new Decimal(rawAccount.equity || "0");
  const lastEquityDec = new Decimal(rawAccount.last_equity || rawAccount.equity || "0");
  const dailyUnrealizedPnlDec = equityDec.minus(lastEquityDec);

  const unsignedSnapshot: Omit<AccountSnapshot, "snapshotHash"> = {
    timestamp: currentIso,
    accountId: rawAccount.id,
    equity: equityDec.toFixed(2),
    cash: new Decimal(rawAccount.cash || "0").toFixed(2),
    buyingPower: new Decimal(rawAccount.buying_power || "0").toFixed(2),
    portfolioHeatPct,
    dailyRealizedPnl: "0.00",
    dailyUnrealizedPnl: dailyUnrealizedPnlDec.toFixed(2),
    optionsLevel: rawAccount.options_approved_level ?? 0,
    status: rawAccount.status,
  };

  const snapshotHash = sha256Canonical(unsignedSnapshot);

  return {
    ...unsignedSnapshot,
    snapshotHash,
  };
}

/**
 * Verifies that a snapshot's hash matches its canonical content.
 */
export function verifySnapshotHash(
  snapshot: MarketSnapshot | AccountSnapshot
): boolean {
  const calculatedHash = sha256Canonical(snapshot, ["snapshotHash"]);
  return calculatedHash === snapshot.snapshotHash;
}
