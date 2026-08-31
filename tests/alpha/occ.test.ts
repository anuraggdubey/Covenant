import { describe, it, expect } from "vitest";
import { parseOccSymbol, formatOccSymbol } from "@/lib/alpha/occ";

describe("OCC Symbol Parser & Formatter", () => {
  it("formats and parses call contracts cleanly", () => {
    const symbol = formatOccSymbol("SPY", "2026-01-16", "call", "500.00");
    expect(symbol).toBe("SPY260116C00500000");

    const parsed = parseOccSymbol(symbol);
    expect(parsed.underlying).toBe("SPY");
    expect(parsed.expiration).toBe("2026-01-16");
    expect(parsed.type).toBe("call");
    expect(parsed.strike).toBe("500.00");
  });

  it("formats and parses put contracts cleanly", () => {
    const symbol = formatOccSymbol("QQQ", "2026-09-18", "put", "452.50");
    expect(symbol).toBe("QQQ260918P00452500");

    const parsed = parseOccSymbol(symbol);
    expect(parsed.underlying).toBe("QQQ");
    expect(parsed.expiration).toBe("2026-09-18");
    expect(parsed.type).toBe("put");
    expect(parsed.strike).toBe("452.50");
  });

  it("fails closed on unsupported underlying", () => {
    // @ts-expect-error Checking invalid underlying
    expect(() => formatOccSymbol("NVDA", "2026-01-16", "call", "120.00")).toThrow(
      "[FAIL-CLOSED] Unsupported underlying: NVDA"
    );
  });
});
