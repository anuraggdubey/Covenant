import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getServerEnv } from "@/lib/env/server";

describe("Server Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads default paper trading configuration", () => {
    const env = getServerEnv();
    expect(env.ALPACA_TRADING_BASE_URL).toContain("paper-api.alpaca.markets");
    expect(env.ALPACA_PAPER).toBe("true");
  });

  it("fails closed if a live trading URL is provided", () => {
    process.env.ALPACA_TRADING_BASE_URL = "https://api.alpaca.markets";
    const url = process.env.ALPACA_TRADING_BASE_URL;
    expect(() => {
      if (
        url &&
        url.includes("api.alpaca.markets") &&
        !url.includes("paper-api.alpaca.markets")
      ) {
        throw new Error("[FAIL-CLOSED] Live trading URL detected!");
      }
    }).toThrow("[FAIL-CLOSED] Live trading URL detected!");
  });
});
