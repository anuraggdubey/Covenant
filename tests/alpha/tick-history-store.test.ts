import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  appendPersistedTick,
  clearPersistedTickHistory,
  loadPersistedTickHistory
} from "@/lib/alpha/tick-history-store";

describe("tick history store", () => {
  let tempDir: string;
  let previousPath: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "covenant-tick-"));
    previousPath = process.env.COVENANT_TICK_HISTORY_PATH;
    process.env.COVENANT_TICK_HISTORY_PATH = join(tempDir, "tick-history.json");
    clearPersistedTickHistory();
  });

  afterEach(() => {
    if (previousPath === undefined) delete process.env.COVENANT_TICK_HISTORY_PATH;
    else process.env.COVENANT_TICK_HISTORY_PATH = previousPath;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("persists ticks across load calls (simulates CLI then dev server)", () => {
    appendPersistedTick({ timestamp: "2026-09-02T10:00:00.000Z", events: [{ eventId: "evt-0001" }] });
    const loaded = loadPersistedTickHistory<{ timestamp: string; events: Array<{ eventId: string }> }>();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.events[0]?.eventId).toBe("evt-0001");
  });

  it("clears the journal", () => {
    appendPersistedTick({ timestamp: "t1" });
    clearPersistedTickHistory();
    expect(loadPersistedTickHistory()).toEqual([]);
  });
});
