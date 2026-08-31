/**
 * Kill switch — T-B6.
 *
 * The property that matters is not "it halts". It is "it halts even when
 * everything else fails". A kill switch with an error path that leaves the
 * agent trading is worse than no kill switch, because someone is relying on it.
 */

import { describe, expect, it } from "vitest";

import {
  KillSwitchRefused,
  engageKillSwitch,
  isHalted,
  type OrderCanceller
} from "@/lib/safety/kill-switch";
import { buildSession, FIXED_NOW } from "../fixtures";

const OK: OrderCanceller = {
  async cancelAllOrders() {
    return ["order-1", "order-2"];
  }
};

const BROKEN: OrderCanceller = {
  async cancelAllOrders() {
    throw new Error("Alpaca unreachable");
  }
};

describe("kill switch", () => {
  it("halts new entries on a correct confirmation", async () => {
    const result = await engageKillSwitch(
      { confirmation: "COVENANT_HALT", reason: "operator stop" },
      buildSession(),
      { now: FIXED_NOW }
    );

    expect(result.halted).toBe(true);
    expect(isHalted(result.session)).toBe(true);
    expect(result.session.haltReason).toMatch(/operator stop/);
    expect(result.session.haltedAt).toBe(FIXED_NOW.toISOString());
  });

  it("refuses without the confirmation phrase, and changes nothing", async () => {
    const session = buildSession();

    await expect(
      engageKillSwitch({ confirmation: "yes", reason: "oops" }, session, { now: FIXED_NOW })
    ).rejects.toBeInstanceOf(KillSwitchRefused);

    expect(session.state).toBe("ACTIVE");
  });

  it("cancels open orders when asked", async () => {
    const result = await engageKillSwitch(
      { confirmation: "COVENANT_HALT", reason: "stop", cancelOpenOrders: true },
      buildSession(),
      { canceller: OK, now: FIXED_NOW }
    );

    expect(result.cancelledOrderIds).toEqual(["order-1", "order-2"]);
  });

  it("STILL halts when cancelling orders throws", async () => {
    const result = await engageKillSwitch(
      { confirmation: "COVENANT_HALT", reason: "broker down", cancelOpenOrders: true },
      buildSession(),
      { canceller: BROKEN, now: FIXED_NOW }
    );

    expect(result.halted).toBe(true);
    expect(isHalted(result.session)).toBe(true);
    expect(result.cancellationError).toMatch(/unreachable/);
    // And it says so plainly rather than reporting a clean stop.
    expect(result.message).toMatch(/FAILED/);
    expect(result.message).toMatch(/manually/);
  });

  it("leaves open orders alone unless explicitly asked", async () => {
    const result = await engageKillSwitch(
      { confirmation: "COVENANT_HALT", reason: "pause only" },
      buildSession(),
      { canceller: OK, now: FIXED_NOW }
    );

    expect(result.cancelledOrderIds).toEqual([]);
  });
});
