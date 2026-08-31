import type { ZodType } from "zod";
import { getServerEnv } from "@/lib/env/server";
import {
  alpacaAccountSchema,
  alpacaAssetSchema,
  alpacaBarsSchema,
  alpacaClockSchema,
  alpacaOptionSnapshotsSchema,
  alpacaStockSnapshotSchema,
  type AlpacaAccountResponse,
  type AlpacaAssetResponse,
  type AlpacaBarsResponse,
  type AlpacaClockResponse,
  type AlpacaOptionSnapshotsResponse,
  type AlpacaStockSnapshotResponse,
  type OptionDataFeed,
  type StockDataFeed,
} from "./types";

export interface AlpacaReadClientConfig {
  apiKeyId?: string;
  apiSecretKey?: string;
  tradingBaseUrl?: string;
  dataBaseUrl?: string;
  optionFeed?: OptionDataFeed;
  stockFeed?: StockDataFeed;
  mockMode?: boolean;
}

function assertExactBaseUrl(rawUrl: string, hostname: string, label: string): string {
  const url = new URL(rawUrl);
  const invalid =
    url.protocol !== "https:" ||
    url.hostname !== hostname ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "" && url.pathname !== "/");

  if (invalid) {
    throw new Error(`[FAIL-CLOSED] ${label} must be exactly https://${hostname}.`);
  }
  return `https://${hostname}`;
}

/** Read-only Alpaca adapter. It deliberately exposes no order-writing method. */
export class AlpacaReadClient {
  private readonly apiKeyId: string;
  private readonly apiSecretKey: string;
  private readonly tradingBaseUrl: string;
  private readonly dataBaseUrl: string;
  private readonly optionFeed: OptionDataFeed;
  private readonly stockFeed: StockDataFeed;
  private readonly mockMode: boolean;

  constructor(config?: AlpacaReadClientConfig) {
    const env = config ? null : getServerEnv();
    this.mockMode = config?.mockMode ?? env?.ALPACA_MOCK_MODE === "true";
    this.apiKeyId = config?.apiKeyId ?? env?.ALPACA_API_KEY_ID ?? "";
    this.apiSecretKey = config?.apiSecretKey ?? env?.ALPACA_API_SECRET_KEY ?? "";
    this.tradingBaseUrl = assertExactBaseUrl(
      config?.tradingBaseUrl ?? env?.ALPACA_TRADING_BASE_URL ?? "https://paper-api.alpaca.markets",
      "paper-api.alpaca.markets",
      "Alpaca trading URL"
    );
    this.dataBaseUrl = assertExactBaseUrl(
      config?.dataBaseUrl ?? env?.ALPACA_DATA_BASE_URL ?? "https://data.alpaca.markets",
      "data.alpaca.markets",
      "Alpaca data URL"
    );
    this.optionFeed = config?.optionFeed ?? env?.ALPACA_DATA_FEED ?? "indicative";
    this.stockFeed = config?.stockFeed ?? env?.ALPACA_STOCK_DATA_FEED ?? "iex";

    if (!this.mockMode && (!this.apiKeyId || !this.apiSecretKey)) {
      throw new Error("[FAIL-CLOSED] Alpaca credentials are required when mock mode is disabled.");
    }
  }

  getOptionFeed(): OptionDataFeed {
    return this.optionFeed;
  }

  getStockFeed(): StockDataFeed {
    return this.stockFeed;
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  private getHeaders(): Record<string, string> {
    return {
      Accept: "application/json",
      "APCA-API-KEY-ID": this.apiKeyId,
      "APCA-API-SECRET-KEY": this.apiSecretKey,
    };
  }

  private async fetchJson<T>(url: URL, description: string, schema: ZodType<T>): Promise<T> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Alpaca ${description} returned HTTP ${response.status}.`);
      }
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error(`Alpaca ${description} returned an invalid response payload.`);
      }
      return parsed.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown provider error";
      throw new Error(`[FAIL-CLOSED] ${description} failed: ${message}`);
    }
  }

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
        balance_asof: new Date().toISOString().slice(0, 10),
        pattern_day_trader: false,
        options_approved_level: 3,
        options_trading_level: 3,
      };
    }
    return this.fetchJson(new URL("/v2/account", this.tradingBaseUrl), "getAccount", alpacaAccountSchema);
  }

  async getClock(): Promise<AlpacaClockResponse> {
    if (this.mockMode) {
      const now = new Date();
      return {
        timestamp: now.toISOString(),
        is_open: true,
        next_open: new Date(now.getTime() + 86_400_000).toISOString(),
        next_close: new Date(now.getTime() + 28_800_000).toISOString(),
      };
    }
    return this.fetchJson(new URL("/v2/clock", this.tradingBaseUrl), "getClock", alpacaClockSchema);
  }

  async getAsset(symbol: "SPY" | "QQQ"): Promise<AlpacaAssetResponse> {
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
    return this.fetchJson(
      new URL(`/v2/assets/${encodeURIComponent(symbol)}`, this.tradingBaseUrl),
      `getAsset(${symbol})`,
      alpacaAssetSchema
    );
  }

  async getOptionSnapshots(
    underlying: "SPY" | "QQQ",
    feed: OptionDataFeed = this.optionFeed
  ): Promise<AlpacaOptionSnapshotsResponse> {
    if (this.mockMode) {
      return this.buildMockOptionSnapshots(underlying);
    }

    const snapshots: AlpacaOptionSnapshotsResponse["snapshots"] = {};
    const seenTokens = new Set<string>();
    let pageToken: string | undefined;

    for (let page = 0; page < 50; page++) {
      const url = new URL(`/v1beta1/options/snapshots/${underlying}`, this.dataBaseUrl);
      url.searchParams.set("feed", feed);
      url.searchParams.set("limit", "1000");
      if (pageToken) url.searchParams.set("page_token", pageToken);

      const response = await this.fetchJson(url, `getOptionSnapshots(${underlying})`, alpacaOptionSnapshotsSchema);
      Object.assign(snapshots, response.snapshots);
      const nextToken = response.next_page_token ?? undefined;
      if (!nextToken) return { snapshots, next_page_token: null };
      if (seenTokens.has(nextToken)) {
        throw new Error(`[FAIL-CLOSED] getOptionSnapshots(${underlying}) repeated a pagination token.`);
      }
      seenTokens.add(nextToken);
      pageToken = nextToken;
    }

    throw new Error(`[FAIL-CLOSED] getOptionSnapshots(${underlying}) exceeded the pagination limit.`);
  }

  async getStockSnapshot(symbol: "SPY" | "QQQ"): Promise<AlpacaStockSnapshotResponse> {
    if (this.mockMode) {
      const price = symbol === "SPY" ? 500 : 450;
      const timestamp = new Date().toISOString();
      return {
        latestTrade: { p: price, s: 100, t: timestamp },
        latestQuote: { ap: price + 0.05, as: 100, bp: price - 0.05, bs: 100, t: timestamp },
      };
    }
    const url = new URL(`/v2/stocks/${symbol}/snapshot`, this.dataBaseUrl);
    url.searchParams.set("feed", this.stockFeed);
    return this.fetchJson(url, `getStockSnapshot(${symbol})`, alpacaStockSnapshotSchema);
  }

  async getStockBars(
    symbol: "SPY" | "QQQ",
    timeframe: "1Day" | "1Hour" | "15Min" = "1Day",
    limit = 60
  ): Promise<AlpacaBarsResponse> {
    if (!Number.isInteger(limit) || limit < 20 || limit > 10_000) {
      throw new Error("[FAIL-CLOSED] Stock bar limit must be an integer between 20 and 10000.");
    }
    if (this.mockMode) {
      const basePrice = symbol === "SPY" ? 500 : 450;
      return {
        bars: {
          [symbol]: Array.from({ length: limit }, (_, index) => {
            const close = basePrice + Math.sin(index / 3) * 5 + index * 0.05;
            return {
              t: new Date(Date.now() - (limit - index) * 86_400_000).toISOString(),
              o: close - 1,
              h: close + 2,
              l: close - 2,
              c: close,
              v: 50_000_000,
              n: 100_000,
              vw: close + 0.1,
            };
          }),
        },
      };
    }
    const url = new URL("/v2/stocks/bars", this.dataBaseUrl);
    url.searchParams.set("symbols", symbol);
    url.searchParams.set("timeframe", timeframe);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("feed", this.stockFeed);
    return this.fetchJson(url, `getStockBars(${symbol})`, alpacaBarsSchema);
  }

  async getPositions(): Promise<import("@/lib/monitor/position-monitor").AlpacaPositionResponse[]> {
    if (this.mockMode) {
      return [];
    }
    const url = new URL("/v2/positions", this.tradingBaseUrl);
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`[FAIL-CLOSED] getPositions returned HTTP ${response.status}.`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("[FAIL-CLOSED] getPositions returned a non-array response.");
    }
    return data;
  }

  private buildMockOptionSnapshots(underlying: "SPY" | "QQQ"): AlpacaOptionSnapshotsResponse {
    const timestamp = new Date().toISOString();
    const basePrice = underlying === "SPY" ? 500 : 450;
    const snapshots: AlpacaOptionSnapshotsResponse["snapshots"] = {};

    for (const dte of [14, 21]) {
      const expiry = new Date(Date.now() + dte * 86_400_000);
      const date = `${String(expiry.getUTCFullYear()).slice(-2)}${String(expiry.getUTCMonth() + 1).padStart(2, "0")}${String(expiry.getUTCDate()).padStart(2, "0")}`;
      for (let offset = -15; offset <= 15; offset += 5) {
        const strike = basePrice + offset;
        const strikeCode = String(strike * 1000).padStart(8, "0");
        for (const type of ["C", "P"] as const) {
          const symbol = `${underlying}${date}${type}${strikeCode}`;
          const intrinsicBias = type === "C" ? basePrice - strike : strike - basePrice;
          const bid = Math.max(0.5, (intrinsicBias + 5) * 0.8);
          const delta = type === "C"
            ? Math.max(0.1, Math.min(0.9, 0.5 - offset * 0.02))
            : Math.max(-0.9, Math.min(-0.1, -0.5 - offset * 0.02));
          snapshots[symbol] = {
            latestQuote: { ap: bid + 0.15, as: 50, bp: bid, bs: 50, t: timestamp },
            latestTrade: { p: bid + 0.05, s: 10, t: timestamp },
            dailyBar: { t: timestamp, o: bid, h: bid + 0.2, l: Math.max(0.01, bid - 0.2), c: bid + 0.05, v: 500, n: 100, vw: bid + 0.05 },
            greeks: { delta, gamma: 0.02, theta: -0.05, vega: 0.1 },
            impliedVolatility: type === "C" ? 0.18 : 0.19,
            open_interest: 1000,
          };
        }
      }
    }
    return { snapshots, next_page_token: null };
  }
}
