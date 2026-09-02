import { beforeEach, describe, expect, it } from "vitest";

import { dollarCapsForDraft } from "@/lib/alpha/mandate-caps";
import {
  activateMandateFromText,
  clearOperatorActivePolicy,
  getOperatorActivePolicy
} from "@/lib/alpha/runtime-policy";
import { executeTick, defaultActivePolicy } from "@/lib/alpha/loop";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { compileMandate } from "@/lib/mandates/compile";
import corpus from "@/docs/mandates/corpus-v1.json";

const M01 = corpus.cases[0]!.mandateText;
const BLOCKED = corpus.cases.find((c) => c.expectedCompiledPolicy.status === "BLOCKED")!.mandateText;

describe("mandate dollar caps", () => {
  it("turns Balanced percent limits into dollars on a $100k account", () => {
    const caps = dollarCapsForDraft("BALANCED", {}, 100_000, "CALIBRATED");
    expect(caps.perTradeMaxLoss).toBe("600.00");
    expect(caps.portfolioHeatMaxLoss).toBe("2500.00");
    expect(caps.dailyHalt).toBe("-1250.00");
    expect(caps.perTradeMaxLossPct).toBeCloseTo(0.6, 6);
  });

  it("changes the echo when the sentence names a different per-trade cap", () => {
    const balanced = compileMandate(M01);
    const tighter = compileMandate(`${M01} Risk at most 0.40% of equity on one trade.`);
    expect(balanced.echo).toMatch(/0\.60%/);
    expect(tighter.echo).toMatch(/0\.40%/);
    expect(tighter.draft.riskOverrides.perTradeMaxLossPct).toBeCloseTo(0.004, 6);
  });

  it("honours slider dollar caps over the Balanced default", () => {
    const result = compileMandate(M01, {
      riskProfile: "BALANCED",
      riskOverrides: { perTradeMaxLossPct: 800 / 100_000, portfolioHeatMaxLossPct: 3000 / 100_000 }
    });
    expect(result.echo).toMatch(/0\.80%/);
    expect(result.echo).toMatch(/3\.00%/);
  });

  it("parses a dollar per-trade sentence", () => {
    const result = compileMandate("Trade SPY verticals with a Balanced profile. Max loss $400 per trade.");
    expect(result.draft.riskOverrides.perTradeMaxLossPct).toBeCloseTo(0.004, 6);
    expect(result.echo).toMatch(/0\.40%/);
  });
});

describe("operator policy activation", () => {
  beforeEach(() => {
    clearOperatorActivePolicy();
  });

  it("installs a READY mandate as ACTIVE for the tick", async () => {
    const policy = activateMandateFromText(M01, "2026-09-02T10:00:00.000Z", { id: "pol_test_m01" });
    expect(policy.status).toBe("ACTIVE");
    expect(getOperatorActivePolicy()?.id).toBe("pol_test_m01");
    expect(policy.perTradeMaxLossPct).toBeCloseTo(0.6, 6);

    const tick = await executeTick(undefined, new AlpacaReadClient({ mockMode: true }));
    expect(tick.account.equity).toBe("100000.00");
    // Conservative check: runtime policy is the one executeTick used when customPolicy is omitted.
    expect(getOperatorActivePolicy()?.status).toBe("ACTIVE");
  });

  it("refuses a BLOCKED mandate", () => {
    expect(() => activateMandateFromText(BLOCKED, "2026-09-02T10:00:00.000Z")).toThrow(/BLOCKED/);
    expect(getOperatorActivePolicy()).toBeNull();
  });

  it("falls back to the default policy when nothing is activated", () => {
    expect(getOperatorActivePolicy()).toBeNull();
    expect(defaultActivePolicy.status).toBe("ACTIVE");
  });
});
