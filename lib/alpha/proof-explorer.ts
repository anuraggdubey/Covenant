/**
 * Proof Explorer data layer — Lane A, T-A8.
 *
 * Serves the committed demo manifest and in-memory tick journals. Full
 * `verifyManifest` runs offline for demo; live ticks synthesize a manifest
 * from recorded events plus the server's public signing key (never the private
 * half).
 */

import demoManifestJson from "@/demo/run_manifest.json";
import { getTickHistory } from "@/lib/alpha/loop";
import { verifyManifest, type VerificationReport } from "@/lib/audit/verify";
import type { CovenantEvent, Policy, RunManifest, TradePermit } from "@/types/domain";

export type ProofSourceKind = "DEMO" | "LIVE";

export interface ProofSourceSummary {
  id: string;
  kind: ProofSourceKind;
  label: string;
  runId: string;
  createdAt: string;
  eventCount: number;
  /** Newest-first index into tick history for LIVE sources. */
  tickIndex?: number;
}

export interface ProofPayload {
  source: ProofSourceSummary;
  manifest: RunManifest;
  report: VerificationReport;
  /** Honest caveats about what this source can and cannot prove. */
  notes: string[];
}

function decodePublicKeyPem(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  if (trimmed.includes("-----BEGIN")) return trimmed.replace(/\\n/g, "\n");
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.includes("-----BEGIN")) return decoded;
  } catch {
    /* fall through */
  }
  return "";
}

export function publicKeyPemFromEnv(): string {
  return decodePublicKeyPem(process.env.PERMIT_SIGNING_PUBLIC_KEY ?? "");
}

function asRunManifest(value: unknown): RunManifest {
  return value as RunManifest;
}

const DEMO_MANIFEST = asRunManifest(demoManifestJson);

export function loadDemoProof(): ProofPayload {
  const manifest = DEMO_MANIFEST;
  return {
    source: {
      id: "demo",
      kind: "DEMO",
      label: "Committed demo manifest",
      runId: manifest.runId,
      createdAt: manifest.createdAt,
      eventCount: manifest.events.length
    },
    manifest,
    report: verifyManifest(manifest),
    notes: [
      "Reproduced from demo/run_manifest.json — no credentials, no network.",
      "Anyone can replay this with npm run verify -- demo/run_manifest.json."
    ]
  };
}

interface DecisionPayloadShape {
  policy?: Policy;
  permit?: TradePermit;
}

function policyFromEvents(events: readonly CovenantEvent[]): Policy | undefined {
  for (const event of events) {
    if (
      event.eventType === "PERMIT_SIGNED" ||
      event.eventType === "KERNEL_REJECTED" ||
      event.eventType === "KERNEL_ABSTAINED"
    ) {
      const payload = event.payload as DecisionPayloadShape;
      if (payload.policy !== undefined) return payload.policy;
    }
  }
  const activated = events.find((e) => e.eventType === "POLICY_ACTIVATED");
  if (activated !== undefined) {
    const payload = activated.payload as { policy?: Policy };
    return payload.policy;
  }
  return undefined;
}

function signingKeyFromEvents(events: readonly CovenantEvent[]): string {
  for (const event of events) {
    if (event.eventType === "PERMIT_SIGNED") {
      const permit = (event.payload as DecisionPayloadShape).permit;
      if (permit?.signingKeyId) return permit.signingKeyId;
    }
  }
  return "";
}

/** Build a manifest envelope from a tick's hash-chained events. */
export function manifestFromTickEvents(
  events: readonly CovenantEvent[],
  tickTimestamp: string,
  tickIndex: number
): RunManifest | null {
  if (events.length === 0) return null;

  const policy = policyFromEvents(events);
  const head = events[events.length - 1]?.eventHash ?? null;

  return {
    runId: `live-tick-${tickIndex}-${tickTimestamp}`,
    createdAt: tickTimestamp,
    codeRevision: events[0]?.codeRevision ?? process.env.COVENANT_CODE_REVISION ?? "dev",
    policyHash: policy?.policyHash ?? "",
    signingKeyId: signingKeyFromEvents(events),
    publicKeyPem: publicKeyPemFromEnv(),
    events: [...events],
    headEventHash: head
  };
}

export function listProofSources(): ProofSourceSummary[] {
  const demo = loadDemoProof().source;
  const history = getTickHistory();
  const live: ProofSourceSummary[] = [];

  [...history].reverse().forEach((tick, displayIndex) => {
    const events = tick.events ?? [];
    if (events.length === 0) return;
    const tickIndex = history.length - 1 - displayIndex;
    live.push({
      id: `live-${tickIndex}`,
      kind: "LIVE",
      label:
        displayIndex === 0
          ? `Latest tick (${events.length} events)`
          : `Tick ${displayIndex + 1} ago (${events.length} events)`,
      runId: `live-tick-${tickIndex}-${tick.timestamp}`,
      createdAt: tick.timestamp,
      eventCount: events.length,
      tickIndex
    });
  });

  return [demo, ...live];
}

export function loadLiveProof(tickIndex: number): ProofPayload | null {
  const history = getTickHistory();
  const tick = history[tickIndex];
  if (tick === undefined) return null;

  const events = tick.events ?? [];
  const manifest = manifestFromTickEvents(events, tick.timestamp, tickIndex);
  if (manifest === null) return null;

  const notes = [
    "Live process journal — persisted to .covenant/tick-history.json so npm run tick and the dev server share it.",
    "Recorded facts are broker snapshots from that tick, not re-fetched now."
  ];

  if (manifest.publicKeyPem === "") {
    notes.push(
      "PERMIT_SIGNING_PUBLIC_KEY is not configured — permit signature checks will fail until it is set."
    );
  }

  const decisionCount = events.filter(
    (e) =>
      e.eventType === "PERMIT_SIGNED" ||
      e.eventType === "KERNEL_REJECTED" ||
      e.eventType === "KERNEL_ABSTAINED"
  ).length;
  if (decisionCount === 0) {
    notes.push(
      "This tick has no kernel decision events yet — chain integrity checks still apply; invariant replay does not."
    );
  }

  return {
    source: {
      id: `live-${tickIndex}`,
      kind: "LIVE",
      label: tickIndex === history.length - 1 ? "Latest tick" : `Tick #${tickIndex + 1}`,
      runId: manifest.runId,
      createdAt: tick.timestamp,
      eventCount: events.length,
      tickIndex
    },
    manifest,
    report: verifyManifest(manifest),
    notes
  };
}

export function verifyProofManifest(manifest: RunManifest): VerificationReport {
  return verifyManifest(manifest);
}
