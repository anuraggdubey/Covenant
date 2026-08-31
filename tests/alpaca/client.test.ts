import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlpacaReadClient } from "@/lib/alpaca/client";

function jsonResponse(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

const credentials = { apiKeyId: "test-key", apiSecretKey: "test-secret", mockMode: false } as const;

describe("AlpacaReadClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each([
    "https://api.alpaca.markets",
    "https://paper-api.alpaca.markets.evil.example",
  ])("rejects non-paper trading host %s", (tradingBaseUrl) => {
    expect(() => new AlpacaReadClient({ ...credentials, tradingBaseUrl })).toThrow("[FAIL-CLOSED]");
  });

  it("rejects missing credentials unless mock mode is explicit", () => {
    expect(() => new AlpacaReadClient({ mockMode: false })).toThrow("credentials are required");
    expect(() => new AlpacaReadClient({ mockMode: true })).not.toThrow();
  });

  it("validates account responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ id: "incomplete" }));
    const client = new AlpacaReadClient(credentials);
    await expect(client.getAccount()).rejects.toThrow("invalid response payload");
  });

  it("fetches and validates account state", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({
      id: "acc_test_123", account_number: "PA123456", status: "ACTIVE", currency: "USD",
      buying_power: "200000.00", regt_buying_power: "200000.00", daytrading_buying_power: "400000.00",
      cash: "100000.00", portfolio_value: "100000.00", equity: "100000.00", last_equity: "100000.00",
      multiplier: "2", initial_margin: "0", maintenance_margin: "0", last_maintenance_margin: "0", sma: "0",
      daytrade_count: 0, balance_asof: "2026-08-30", pattern_day_trader: false,
      options_approved_level: 3, options_trading_level: 3,
    }));
    const account = await new AlpacaReadClient(credentials).getAccount();
    expect(account.id).toBe("acc_test_123");
  });

  it("fetches every option snapshot page", async () => {
    const quote = { ap: 5.5, as: 10, bp: 5.4, bs: 20, t: "2026-08-30T14:30:00Z" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ snapshots: { SPY260918C00500000: { latestQuote: quote } }, next_page_token: "page-2" }))
      .mockResolvedValueOnce(jsonResponse({ snapshots: { SPY260918C00505000: { latestQuote: quote } }, next_page_token: null }));
    globalThis.fetch = fetchMock;

    const snapshots = await new AlpacaReadClient(credentials).getOptionSnapshots("SPY");
    expect(Object.keys(snapshots.snapshots)).toHaveLength(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("page_token=page-2");
  });

  it("uses independent valid feeds for stock and option requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ snapshots: {}, next_page_token: null }))
      .mockResolvedValueOnce(jsonResponse({
        latestTrade: { p: 500, s: 1, t: "2026-08-30T14:30:00Z" },
      }));
    globalThis.fetch = fetchMock;
    const client = new AlpacaReadClient({ ...credentials, optionFeed: "indicative", stockFeed: "iex" });
    await client.getOptionSnapshots("SPY");
    await client.getStockSnapshot("SPY");
    expect(String(fetchMock.mock.calls[0][0])).toContain("feed=indicative");
    expect(String(fetchMock.mock.calls[1][0])).toContain("feed=iex");
  });

  it("marks mock liquidity with daily volume rather than trade size", async () => {
    const snapshots = await new AlpacaReadClient({ mockMode: true }).getOptionSnapshots("SPY");
    const first = Object.values(snapshots.snapshots)[0];
    expect(first.dailyBar?.v).toBe(500);
    expect(first.latestTrade?.s).toBe(10);
  });

  it("exposes no order-writing methods", () => {
    const client = new AlpacaReadClient({ mockMode: true });
    expect("submitOrder" in client).toBe(false);
    expect("cancelOrder" in client).toBe(false);
  });
});
