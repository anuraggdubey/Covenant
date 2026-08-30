import { describe, it, expect, vi, beforeEach } from "vitest";
import { AlpacaReadClient } from "@/lib/alpaca/client";

describe("AlpacaReadClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fails closed if initialized with a live trading URL", () => {
    expect(() => {
      new AlpacaReadClient({
        tradingBaseUrl: "https://api.alpaca.markets",
      });
    }).toThrow("[FAIL-CLOSED] Refusing to initialize Alpaca client with live trading URL.");
  });

  it("fetches account state successfully via HTTP", async () => {
    const mockAccount = {
      id: "acc_test_123",
      account_number: "PA123456",
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
      balance_asof: "2026-08-30",
      pattern_day_trader: false,
      options_approved_level: 3,
      options_trading_level: 3,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAccount,
    } as Response);

    const client = new AlpacaReadClient({
      apiKeyId: "test_key",
      apiSecretKey: "test_secret",
      tradingBaseUrl: "https://paper-api.alpaca.markets",
      mockMode: false,
    });

    const account = await client.getAccount();
    expect(account.id).toBe("acc_test_123");
    expect(account.equity).toBe("100000.00");
    expect(account.options_approved_level).toBe(3);
  });

  it("fetches market clock via HTTP", async () => {
    const mockClock = {
      timestamp: "2026-08-30T14:30:00Z",
      is_open: true,
      next_open: "2026-08-31T13:30:00Z",
      next_close: "2026-08-30T20:00:00Z",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClock,
    } as Response);

    const client = new AlpacaReadClient({
      apiKeyId: "test_key",
      apiSecretKey: "test_secret",
      mockMode: false,
    });
    const clock = await client.getClock();
    expect(clock.is_open).toBe(true);
  });

  it("fetches option chain snapshots via HTTP", async () => {
    const mockSnapshots = {
      snapshots: {
        "SPY260116C00500000": {
          latestQuote: { ap: 5.5, as: 10, bp: 5.4, bs: 20, t: "2026-08-30T14:30:00Z" },
          greeks: { delta: 0.5, gamma: 0.02, theta: -0.05, vega: 0.1 },
          impliedVolatility: 0.18,
        },
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSnapshots,
    } as Response);

    const client = new AlpacaReadClient({
      apiKeyId: "test_key",
      apiSecretKey: "test_secret",
      mockMode: false,
    });
    const snapshots = await client.getOptionSnapshots("SPY");
    expect(snapshots.snapshots["SPY260116C00500000"]).toBeDefined();
    expect(snapshots.snapshots["SPY260116C00500000"].latestQuote?.ap).toBe(5.5);
  });

  it("generates synthetic option snapshots when running in mockMode", async () => {
    const client = new AlpacaReadClient({ mockMode: true });
    const snapshots = await client.getOptionSnapshots("SPY");
    expect(Object.keys(snapshots.snapshots).length).toBeGreaterThan(0);
    const clock = await client.getClock();
    expect(clock.is_open).toBe(true);
  });

  it("guarantees zero order-submitting methods on client instance", () => {
    const client = new AlpacaReadClient();
    // @ts-expect-error Checking that submitOrder does not exist on read client
    expect(client.submitOrder).toBeUndefined();
    // @ts-expect-error Checking that cancelOrder does not exist on read client
    expect(client.cancelOrder).toBeUndefined();
  });
});
