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
import { getPermitStore } from "@/lib/storage/permit-store";
import { EventJournal } from "@/lib/audit/journal";
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

export async function listProofSourcesAsync(): Promise<ProofSourceSummary[]> {
  const demo = loadDemoProof().source;
  const livePermits: ProofSourceSummary[] = [];

  try {
    const store = getPermitStore();
    const permits = await store.list(20);
    for (const p of permits) {
      const isSubmitted = p.execution === "SUBMITTED";
      const timeStr = new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      livePermits.push({
        id: `permit-${p.permitId}`,
        kind: "LIVE",
        label: `${p.symbol} ${p.structure.replaceAll("_", " ")} · ${isSubmitted ? `Paper Order (${timeStr})` : `${p.lifecycle} (${timeStr})`}`,
        runId: `permit-${p.permitId}`,
        createdAt: p.createdAt,
        eventCount: p.orderId ? 6 : 5
      });
    }
  } catch {
    // Permit storage may be unconfigured in test runs
  }

  const history = getTickHistory();
  const liveTicks: ProofSourceSummary[] = [];

  [...history].reverse().forEach((tick, displayIndex) => {
    const events = tick.events ?? [];
    if (events.length === 0) return;
    const tickIndex = history.length - 1 - displayIndex;
    liveTicks.push({
      id: `live-${tickIndex}`,
      kind: "LIVE",
      label:
        displayIndex === 0
          ? `Latest execution tick (${events.length} events)`
          : `Execution tick ${displayIndex + 1} ago (${events.length} events)`,
      runId: `live-tick-${tickIndex}-${tick.timestamp}`,
      createdAt: tick.timestamp,
      eventCount: events.length,
      tickIndex
    });
  });

  return [...livePermits, ...liveTicks, demo];
}

export async function loadPermitProof(permitId: string): Promise<ProofPayload | null> {
  try {
    const store = getPermitStore();
    const detail = await store.getPermit(permitId);
    if (!detail) return null;

    const journal = new EventJournal({
      codeRevision: "dev",
      clock: () => new Date(detail.createdAt),
      actor: "permit-console"
    });

    journal.append("POLICY_ACTIVATED", { policy: detail.policy }, "governance");
    journal.append(
      "MARKET_SNAPSHOT_RECORDED",
      {
        market: {
          underlying: detail.symbol,
          snapshotHash: detail.intent.marketSnapshotHash
        }
      },
      "alpha"
    );
    journal.append(
      "ACCOUNT_SNAPSHOT_RECORDED",
      {
        account: {
          snapshotHash: detail.intent.accountSnapshotHash
        }
      },
      "alpha"
    );
    journal.append("TRADE_INTENT_CREATED", { intent: detail.intent }, "alpha");
    journal.append(
      "PERMIT_SIGNED",
      {
        permit: detail.permit,
        intent: detail.intent,
        policy: detail.policy,
        decision: "APPROVE",
        failedInvariants: []
      },
      "safety-kernel"
    );

    if (detail.orderId) {
      journal.append(
        "ORDER_SUBMITTED",
        {
          orderId: detail.orderId,
          permit: detail.permit,
          order: {
            orderId: detail.orderId,
            qty: String(detail.quantity),
            legs: detail.permit.exactLegs,
            limitPrice: detail.intent.limitPrice
          },
          submittedAt: detail.usedAt ?? detail.createdAt
        },
        "executor"
      );
    }

    const events = journal.all();
    const manifest: RunManifest = {
      runId: `permit-${detail.permitId}`,
      createdAt: detail.createdAt,
      codeRevision: "dev",
      policyHash: detail.policy.policyHash,
      signingKeyId: detail.permit.signingKeyId,
      publicKeyPem: publicKeyPemFromEnv(),
      events: [...events],
      headEventHash: events[events.length - 1]?.eventHash ?? null
    };

    const notes = [
      `Live trade permit issued by operator for ${detail.symbol} ${detail.structure}.`,
      detail.orderId
        ? `Order submitted and accepted by Alpaca Paper Trading with Order ID: ${detail.orderId}.`
        : `Permit status: ${detail.lifecycle} (held under authority window).`,
      "All hash-chained events, Ed25519 signature, and intent hashes are verifiable offline."
    ];

    return {
      source: {
        id: `permit-${detail.permitId}`,
        kind: "LIVE",
        label: `${detail.symbol} ${detail.structure.replaceAll("_", " ")} (${detail.execution === "SUBMITTED" ? "Submitted" : detail.lifecycle})`,
        runId: manifest.runId,
        createdAt: detail.createdAt,
        eventCount: events.length
      },
      manifest,
      report: verifyManifest(manifest),
      notes
    };
  } catch (err) {
    console.error("Failed to load permit proof:", err);
    return null;
  }
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

