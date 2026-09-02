import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  loadDemoProof,
  listProofSources,
  loadLiveProof,
  manifestFromTickEvents,
  verifyProofManifest
} from "@/lib/alpha/proof-explorer";
import { executeTick, clearTickHistory } from "@/lib/alpha/loop";
import { clearOperatorActivePolicy } from "@/lib/alpha/runtime-policy";
import { verifyChain } from "@/lib/audit/journal";
import { AlpacaReadClient } from "@/lib/alpaca/client";

let tempDir: string;
let previousPath: string | undefined;

describe("proof explorer", () => {
  it("loads the committed demo manifest and verifies it", () => {
    const proof = loadDemoProof();
    expect(proof.source.kind).toBe("DEMO");
    expect(proof.manifest.events.length).toBeGreaterThan(0);
    expect(proof.report.ok).toBe(true);
    expect(proof.report.counts.failed).toBe(0);
    expect(proof.report.counts.reproduced).toBeGreaterThan(0);
    expect(proof.report.counts.recorded).toBeGreaterThan(0);
  });

  it("lists demo as the first source", () => {
    const sources = listProofSources();
    expect(sources[0]?.kind).toBe("DEMO");
    expect(sources[0]?.id).toBe("demo");
  });

  it("re-runs verification on an arbitrary manifest", () => {
    const { manifest, report } = loadDemoProof();
    const again = verifyProofManifest(manifest);
    expect(again.ok).toBe(report.ok);
    expect(again.checks.length).toBe(report.checks.length);
  });
});

describe("live tick proof", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "covenant-proof-"));
    previousPath = process.env.COVENANT_TICK_HISTORY_PATH;
    process.env.COVENANT_TICK_HISTORY_PATH = join(tempDir, "tick-history.json");
    clearTickHistory();
    clearOperatorActivePolicy();
  });

  afterEach(() => {
    if (previousPath === undefined) delete process.env.COVENANT_TICK_HISTORY_PATH;
    else process.env.COVENANT_TICK_HISTORY_PATH = previousPath;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("builds a manifest from tick events with intact chain", async () => {
    const client = new AlpacaReadClient({ mockMode: true });
    await executeTick(undefined, client);

    const proof = loadLiveProof(0);
    expect(proof).not.toBeNull();
    expect(proof!.source.kind).toBe("LIVE");
    expect(proof!.manifest.events.length).toBeGreaterThan(0);
    expect(verifyChain(proof!.manifest.events)).toEqual([]);

    const sources = listProofSources();
    expect(sources.some((s) => s.kind === "LIVE")).toBe(true);
  });

  it("returns null for an out-of-range tick index", () => {
    expect(loadLiveProof(0)).toBeNull();
  });

  it("returns null when events are empty", () => {
    expect(manifestFromTickEvents([], "2026-09-02T10:00:00.000Z", 0)).toBeNull();
  });
});
