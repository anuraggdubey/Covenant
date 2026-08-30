import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/server";

const validEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  ALPACA_TRADING_BASE_URL: "https://paper-api.alpaca.markets",
  ALPACA_DATA_BASE_URL: "https://data.alpaca.markets",
  ALPACA_API_KEY_ID: "test-key",
  ALPACA_API_SECRET_KEY: "test-secret",
  ALPACA_PAPER: "true",
  ALPACA_MOCK_MODE: "false",
};

describe("Server Environment Validation", () => {
  it("accepts an exact paper configuration", () => {
    const env = parseServerEnv(validEnv);
    expect(env.ALPACA_DATA_FEED).toBe("indicative");
    expect(env.ALPACA_STOCK_DATA_FEED).toBe("iex");
  });

  it.each([
    "https://api.alpaca.markets",
    "https://paper-api.alpaca.markets.evil.example",
    "https://user:pass@paper-api.alpaca.markets",
    "http://paper-api.alpaca.markets",
  ])("rejects hostile trading URL %s", (url) => {
    expect(() => parseServerEnv({ ...validEnv, ALPACA_TRADING_BASE_URL: url })).toThrow("[FAIL-CLOSED]");
  });

  it("rejects an untrusted data host", () => {
    expect(() => parseServerEnv({
      ...validEnv,
      ALPACA_DATA_BASE_URL: "https://data.alpaca.markets.evil.example",
    })).toThrow("Alpaca data URL");
  });

  it("requires paired credentials outside explicit mock mode", () => {
    expect(() => parseServerEnv({ ...validEnv, ALPACA_API_SECRET_KEY: "" })).toThrow("configured together");
    expect(() => parseServerEnv({ ...validEnv, ALPACA_API_KEY_ID: "", ALPACA_API_SECRET_KEY: "" })).toThrow("required");
  });

  it("allows explicit mock mode in test but never production", () => {
    expect(parseServerEnv({
      ...validEnv,
      ALPACA_API_KEY_ID: "",
      ALPACA_API_SECRET_KEY: "",
      ALPACA_MOCK_MODE: "true",
    }).ALPACA_MOCK_MODE).toBe("true");
    expect(() => parseServerEnv({
      ...validEnv,
      NODE_ENV: "production",
      ALPACA_MOCK_MODE: "true",
    })).toThrow("forbidden in production");
  });
});
