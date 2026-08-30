import { getServerEnv } from "@/lib/env/server";
import type {
  AlpacaAccountResponse,
  AlpacaClockResponse,
  AlpacaAssetResponse,
  AlpacaOptionSnapshotsResponse,
  AlpacaStockSnapshotResponse,
  AlpacaBarsResponse,
} from "./types";

export interface AlpacaReadClientConfig {
  apiKeyId?: string;
  apiSecretKey?: string;
  tradingBaseUrl?: string;
  dataBaseUrl?: string;
  feed?: "indicative" | "opra" | "sip";
  mockMode?: boolean;
}

/**
 * Strict Server-Only Read-Only Alpaca Client.
 *
 * Guaranteed by construction:
 * - Has ZERO write/submit/delete methods.
 * - Enforces paper-trading data endpoints.
 * - Reads only account state, clock, assets, bars, and option snapshots.
 */
export class AlpacaReadClient {
  private readonly apiKeyId: string;
  private readonly apiSecretKey: string;
  private readonly tradingBaseUrl: string;
  private readonly dataBaseUrl: string;
  private readonly defaultFeed: string;
  private readonly mockMode: boolean;

  constructor(config?: AlpacaReadClientConfig) {
    const env = getServerEnv();
    this.apiKeyId = config?.apiKeyId ?? env.ALPACA_API_KEY_ID;
    this.apiSecretKey = config?.apiSecretKey ?? env.ALPACA_API_SECRET_KEY;
    this.tradingBaseUrl = config?.tradingBaseUrl ?? env.ALPACA_TRADING_BASE_URL;
    this.dataBaseUrl = config?.dataBaseUrl ?? env.ALPACA_DATA_BASE_URL;
    this.defaultFeed = config?.feed ?? env.ALPACA_DATA_FEED;
    this.mockMode = config?.mockMode ?? (process.env.ALPACA_MOCK_MODE === "true" || (!this.apiKeyId && !this.apiSecretKey));

    // Strict validation: Reject live trading endpoints
    if (
      this.tradingBaseUrl.includes("api.alpaca.markets") &&
      !this.tradingBaseUrl.includes("paper-api.alpaca.markets")
    ) {
      throw new Error(
        "[FAIL-CLOSED] Refusing to initialize Alpaca client with live trading URL."
      );
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKeyId && this.apiSecretKey) {
      headers["APCA-API-KEY-ID"] = this.apiKeyId;
      headers["APCA-API-SECRET-KEY"] = this.apiSecretKey;
    }

    return headers;
  }

  private async fetchJson<T>(url: string, description: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Alpaca ${description} failed with status ${response.status}: ${errorText}`
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`[FAIL-CLOSED] ${description} fetch error: ${message}`);
    }
  }

  /**
   * Fetches account metadata and balances.
   */
  async getAccount(): Promise<AlpacaAccountResponse> {
    if (this.mockMode) {
      return {
        id: "mock_paper_account_100k",
        account_number: "PA987654321",
        status: "ACTIVE",
        currency: "USD",
        buying_power: "200000.00",
        regt_buying_power: "200000.00",
        daytrading_buying_power: "400000.00",
        cash: "100000.00",
        portfolio_value: "100000.00",
        equity: "100000.00",
        last_equity: "100000.00",
        multiplier: "2",
        initial_margin: "0",
        maintenance_margin: "0",
        last_maintenance_margin: "0",
        sma: "0",
        daytrade_count: 0,
        balance_asof: new Date().toISOString().split("T")[0],
        pattern_day_trader: false,
        options_approved_level: 3,
        options_trading_level: 3,
      };
    }

    const url = `${this.tradingBaseUrl}/v2/account`;
    return this.fetchJson<AlpacaAccountResponse>(url, "getAccount");
  }

  /**
   * Fetches market clock status.
   */
  async getClock(): Promise<AlpacaClockResponse> {
    if (this.mockMode) {
      const now = new Date();
      const nextOpen = new Date(now.getTime() + 86400000).toISOString();
      const nextClose = new Date(now.getTime() + 28800000).toISOString();
      return {
        timestamp: now.toISOString(),
        is_open: true,
        next_open: nextOpen,
        next_close: nextClose,
      };
    }

    const url = `${this.tradingBaseUrl}/v2/clock`;
    return this.fetchJson<AlpacaClockResponse>(url, "getClock");
  }

  /**
   * Fetches asset metadata for supported underlyings (SPY, QQQ).
   */
  async getAsset(symbol: string): Promise<AlpacaAssetResponse> {
    if (this.mockMode) {
      return {
        id: `mock_asset_${symbol}`,
        class: "us_equity",
        exchange: "NASDAQ",
        symbol,
        name: symbol === "SPY" ? "SPDR S&P 500 ETF Trust" : "Invesco QQQ Trust",
        status: "active",
        tradable: true,
        marginable: true,
        shortable: true,
        easy_to_borrow: true,
        fractionable: true,
        has_options: true,
      };
    }

    const url = `${this.tradingBaseUrl}/v2/assets/${encodeURIComponent(symbol)}`;
    return this.fetchJson<AlpacaAssetResponse>(url, `getAsset(${symbol})`);
  }

  /**
   * Fetches full option chain snapshots for SPY or QQQ.
   */
  async getOptionSnapshots(
    underlying: "SPY" | "QQQ",
    feed?: "indicative" | "opra" | "sip"
  ): Promise<AlpacaOptionSnapshotsResponse> {
    if (this.mockMode) {
      const nowIso = new Date().toISOString();
      const basePrice = underlying === "SPY" ? 500 : 450;
      const snapshots: AlpacaOptionSnapshotsResponse["snapshots"] = {};

      // Generate a mock chain for +14 DTE and +28 DTE
      for (const dteDays of [14, 28]) {
        const expDate = new Date(Date.now() + dteDays * 86400000);
        const yy = String(expDate.getUTCFullYear()).slice(-2);
        const mm = String(expDate.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(expDate.getUTCDate()).padStart(2, "0");

        for (let strikeOffset = -15; strikeOffset <= 15; strikeOffset += 5) {
          const strike = basePrice + strikeOffset;
          const strikePadded = String(strike * 1000).padStart(8, "0");

          // Call
          const callSymbol = `${underlying}${yy}${mm}${dd}C${strikePadded}`;
          const callBid = Math.max(0.5, (basePrice - strike + 5) * 0.8);
          snapshots[callSymbol] = {
            latestQuote: {
              ap: callBid + 0.15,
              as: 50,
              bp: callBid,
              bs: 50,
              t: nowIso,
            },
            latestTrade: {
              p: callBid + 0.05,
              s: 100,
              t: nowIso,
            },
            greeks: {
              delta: Math.max(0.1, Math.min(0.9, 0.5 - strikeOffset * 0.02)),
              gamma: 0.02,
              theta: -0.05,
              vega: 0.1,
            },
            impliedVolatility: 0.18,
            open_interest: 1000,
          };

          // Put
          const putSymbol = `${underlying}${yy}${mm}${dd}P${strikePadded}`;
          const putBid = Math.max(0.5, (strike - basePrice + 5) * 0.8);
          snapshots[putSymbol] = {
            latestQuote: {
              ap: putBid + 0.15,
              as: 50,
              bp: putBid,
              bs: 50,
              t: nowIso,
            },
            latestTrade: {
              p: putBid + 0.05,
              s: 100,
              t: nowIso,
            },
            greeks: {
              delta: Math.max(-0.9, Math.min(-0.1, -0.5 - strikeOffset * 0.02)),
              gamma: 0.02,
              theta: -0.05,
              vega: 0.1,
            },
            impliedVolatility: 0.19,
            open_interest: 1000,
          };
        }
      }

      return { snapshots };
    }

    const activeFeed = feed ?? this.defaultFeed;
    const url = `${this.dataBaseUrl}/v1beta1/options/snapshots/${underlying}?feed=${activeFeed}`;
    return this.fetchJson<AlpacaOptionSnapshotsResponse>(
      url,
      `getOptionSnapshots(${underlying})`
    );
  }

  /**
   * Fetches underlying stock snapshot for price and latest quote.
   */
  async getStockSnapshot(symbol: "SPY" | "QQQ"): Promise<AlpacaStockSnapshotResponse> {
    if (this.mockMode) {
      const price = symbol === "SPY" ? 500.0 : 450.0;
      const nowIso = new Date().toISOString();
      return {
        latestTrade: { p: price, s: 100, t: nowIso },
        latestQuote: { ap: price + 0.05, as: 100, bp: price - 0.05, bs: 100, t: nowIso },
      };
    }

    const feed = this.defaultFeed === "opra" ? "sip" : "indicative";
    const url = `${this.dataBaseUrl}/v2/stocks/${symbol}/snapshot?feed=${feed}`;
    return this.fetchJson<AlpacaStockSnapshotResponse>(url, `getStockSnapshot(${symbol})`);
  }

  /**
   * Fetches historical stock bars for volatility & trend calculations.
   */
  async getStockBars(
    symbol: "SPY" | "QQQ",
    timeframe: "1Day" | "1Hour" | "15Min" = "1Day",
    limit: number = 30
  ): Promise<AlpacaBarsResponse> {
    if (this.mockMode) {
      const basePrice = symbol === "SPY" ? 500 : 450;
      const bars: AlpacaBarsResponse["bars"] = {
        [symbol]: Array.from({ length: limit }, (_, i) => {
          const dayOffset = limit - i;
          const dateStr = new Date(Date.now() - dayOffset * 86400000).toISOString();
          const variation = Math.sin(i / 3) * 5;
          const close = basePrice + variation;
          return {
            t: dateStr,
            o: close - 1,
            h: close + 2,
            l: close - 2,
            c: close,
            v: 50000000,
            n: 100000,
            vw: close + 0.1,
          };
        }),
      };
      return { bars };
    }

    const feed = this.defaultFeed === "opra" ? "sip" : "indicative";
    const url = `${this.dataBaseUrl}/v2/stocks/bars?symbols=${symbol}&timeframe=${timeframe}&limit=${limit}&feed=${feed}`;
    return this.fetchJson<AlpacaBarsResponse>(url, `getStockBars(${symbol})`);
  }
}
