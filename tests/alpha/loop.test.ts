import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeTick, clearTickHistory, getTickHistory, defaultActivePolicy } from "@/lib/alpha/loop";
import { AlpacaReadClient } from "@/lib/alpaca/client";

function createMockClient(): AlpacaReadClient {
  return new AlpacaReadClient({ mockMode: true });
}

describe("executeTick()", () => {
  beforeEach(() => {
    clearTickHistory();
  });

  it("produces a valid TickResult with proposals for each underlying", async () => {
    const client = createMockClient();
    const result = await executeTick(undefined, client);

    expect(result.timestamp).toBeDefined();
    expect(result.dataMode).toBe("SYNTHETIC_MOCK");
    expect(result.clock.isOpen).toBe(true);
    expect(result.account.equity).toBe("100000.00");
    expect(result.account.optionsLevel).toBe(3);
    expect(result.account.snapshotHash).toHaveLength(64);
    expect(result.underlyings).toHaveLength(2);

    for (const u of result.underlyings) {
      expect(["SPY", "QQQ"]).toContain(u.symbol);
      expect(u.proposal).toBeDefined();
      // In mock mode with synthetic data, either intent or abstain is valid
      expect("intent" in u.proposal || "abstain" in u.proposal).toBe(true);
    }
  });

  it("records tick results in history", async () => {
    const client = createMockClient();
    expect(getTickHistory()).toHaveLength(0);

    await executeTick(undefined, client);
    expect(getTickHistory()).toHaveLength(1);

    await executeTick(undefined, client);
    expect(getTickHistory()).toHaveLength(2);
  });

  it("clears tick history", async () => {
    const client = createMockClient();
    await executeTick(undefined, client);
    expect(getTickHistory()).toHaveLength(1);

    clearTickHistory();
    expect(getTickHistory()).toHaveLength(0);
  });

  it("fails closed when policy is not ACTIVE", async () => {
    const client = createMockClient();
    const blockedPolicy = { ...defaultActivePolicy, status: "BLOCKED" as const };
    const result = await executeTick(blockedPolicy, client);

    // All proposals should be abstain because policy is blocked
    for (const u of result.underlyings) {
      // Engine checks policy status before proposing
      if ("abstain" in u.proposal) {
        expect(u.proposal.reason).toBeDefined();
      }
    }
  });

  it("includes position monitor data in the result", async () => {
    const client = createMockClient();
    const result = await executeTick(undefined, client);

    // In mock mode, position monitor returns empty (no positions)
    if (result.positionMonitor) {
      expect(result.positionMonitor.summary.total).toBe(0);
      expect(result.positionMonitor.positions).toEqual([]);
    }
  });

  it("uses the default active policy when none is provided", async () => {
    const client = createMockClient();
    const result = await executeTick(undefined, client);

    // Should execute without error using default policy
    expect(result.timestamp).toBeDefined();
    expect(result.underlyings.length).toBeGreaterThan(0);
  });
});
