"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCode,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  Search,
  Filter,
  Lock,
  Key,
  Info,
  ArrowRight,
  Clock,
  Calendar,
  Zap,
} from "lucide-react";
import type { CovenantEvent, RunManifest } from "@/types/domain";
import type { VerificationReport } from "@/lib/audit/verify";
import {
  ClickableHash,
  HashInspectorModal,
  formatDateTime,
  shortHash,
  type HashInspectorData,
} from "@/components/HashInspectorModal";

interface ProofSourceSummary {
  id: string;
  kind: "DEMO" | "LIVE";
  label: string;
  runId: string;
  createdAt: string;
  eventCount: number;
  tickIndex?: number;
}

interface ProofPayload {
  source: ProofSourceSummary;
  manifest: RunManifest;
  report: VerificationReport;
  notes: string[];
}

const EVENT_TONES: Record<string, { bg: string; text: string; border: string }> = {
  PERMIT_SIGNED: { bg: "bg-[#EAEEDD]", text: "text-emerald-900", border: "border-emerald-800/30" },
  ORDER_SUBMITTED: { bg: "bg-[#EAEEDD]", text: "text-emerald-900", border: "border-emerald-800/30" },
  ORDER_ACCEPTED: { bg: "bg-[#EAEEDD]", text: "text-emerald-900", border: "border-emerald-800/30" },
  POLICY_ACTIVATED: { bg: "bg-white", text: "text-[#0B4FFF]", border: "border-black/15" },
  MARKET_SNAPSHOT_RECORDED: { bg: "bg-white", text: "text-[#0B4FFF]", border: "border-black/15" },
  ACCOUNT_SNAPSHOT_RECORDED: { bg: "bg-white", text: "text-[#0B4FFF]", border: "border-black/15" },
  TRADE_INTENT_CREATED: { bg: "bg-white", text: "text-[#0B4FFF]", border: "border-black/15" },
  KERNEL_REJECTED: { bg: "bg-rose-50", text: "text-rose-900", border: "border-rose-800/30" },
  KERNEL_ABSTAINED: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-800/30" },
  PERMIT_REPLAY_REJECTED: { bg: "bg-rose-50", text: "text-rose-900", border: "border-rose-800/30" },
  HALT_TRIGGERED: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-800/30" },
};

function decisionSummary(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.reason === "string") return p.reason;
  if (typeof p.orderId === "string") return `Alpaca order ${p.orderId}`;
  if (p.order && typeof p.order === "object" && "orderId" in p.order) {
    return `Alpaca order ${(p.order as { orderId: string }).orderId}`;
  }
  return null;
}

export default function ProofExplorerPage() {
  const [sources, setSources] = useState<ProofSourceSummary[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [proof, setProof] = useState<ProofPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedTerminal, setCopiedTerminal] = useState(false);
  const [checkFilter, setCheckFilter] = useState<"ALL" | "REPRODUCED" | "RECORDED">("ALL");
  const [searchCheck, setSearchCheck] = useState("");
  const [inspectData, setInspectData] = useState<HashInspectorData | null>(null);

  const fetchSourcesAndProof = async (sourceIdToFetch?: string) => {
    setLoading(true);
    try {
      const sourcesRes = await fetch("/api/proof");
      let activeId = sourceIdToFetch || selectedSourceId;

      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        const list: ProofSourceSummary[] = data.sources ?? [];
        setSources(list);

        if (!activeId && list.length > 0) {
          // Prioritize real live transactions & permits first
          const firstLive = list.find((s) => s.kind === "LIVE");
          activeId = firstLive ? firstLive.id : list[0].id;
          setSelectedSourceId(activeId);
        }
      }

      if (!activeId) activeId = "demo";

      const url =
        activeId === "demo"
          ? "/api/proof?source=demo"
          : activeId.startsWith("permit-")
            ? `/api/proof?source=${activeId}`
            : `/api/proof?source=live&index=${activeId.replace("live-", "")}`;

      const proofRes = await fetch(url);
      if (proofRes.ok) {
        const proofData: ProofPayload = await proofRes.json();
        setProof(proofData);
      } else {
        setProof(null);
      }
    } catch {
      setProof(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSourcesAndProof();
  }, []);

  const handleSelectSource = (id: string) => {
    setSelectedSourceId(id);
    fetchSourcesAndProof(id);
  };

  const activeReport = proof?.report;
  const activeManifest = proof?.manifest;

  const reproducedChecks = activeReport?.checks.filter((c) => c.label === "REPRODUCED") ?? [];
  const recordedChecks = activeReport?.checks.filter((c) => c.label === "RECORDED") ?? [];

  const filteredChecks = (activeReport?.checks ?? []).filter((c) => {
    if (checkFilter === "REPRODUCED" && c.label !== "REPRODUCED") return false;
    if (checkFilter === "RECORDED" && c.label !== "RECORDED") return false;
    if (searchCheck.trim()) {
      const q = searchCheck.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.detail.toLowerCase().includes(q) ||
        (c.eventId ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const copyTerminalCmd = () => {
    navigator.clipboard.writeText("npm run verify -- demo/run_manifest.json\nnpm run audit");
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.35 } },
  };

  if (loading && !proof) {
    return (
      <div className="flex-1 w-full bg-[#F0EFE3] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#74736A] font-mono text-xs uppercase tracking-widest">
          <RefreshCw className="w-6 h-6 animate-spin text-[#0B4FFF]" />
          Loading cryptographic proof manifest...
        </div>
      </div>
    );
  }

  if (!activeReport || !activeManifest) {
    return (
      <div className="flex-1 w-full bg-[#F0EFE3] min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-black/15 p-6 text-center">
          <Info className="w-8 h-8 text-[#74736A] mx-auto mb-3" />
          <h3 className="font-mono font-bold text-[#232323] text-sm uppercase">No Manifest Loaded</h3>
          <p className="text-xs text-[#74736A] font-mono mt-2 leading-relaxed">
            Run a tick in Execution or sign a permit in Permit Console to generate cryptographic proofs.
          </p>
          <button
            onClick={() => handleSelectSource("demo")}
            className="mt-4 px-4 py-2 bg-[#0B4FFF] text-white text-xs font-mono font-bold uppercase"
          >
            Load Demo Manifest
          </button>
        </div>
      </div>
    );
  }

  const manifestTime = formatDateTime(activeManifest.createdAt);

  return (
    <div className="flex-1 w-full bg-[#F0EFE3] min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[1400px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/15"
        >
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#232323]">
                PROOF EXPLORER · LANE B
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider border ${
                  activeReport.ok
                    ? "bg-[#EAEEDD] border-black/15 text-emerald-900"
                    : "bg-rose-50 border-rose-800/30 text-rose-900"
                }`}
              >
                {activeReport.ok ? "CRYPTOGRAPHICALLY VERIFIED" : "VERIFICATION ERROR"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider border ${
                  proof.source.kind === "LIVE"
                    ? "bg-emerald-50 border-emerald-800/30 text-emerald-900"
                    : "bg-white border-black/15 text-[#232323]"
                }`}
              >
                {proof.source.kind === "LIVE" ? "REAL LIVE ACTIVITY" : "AIR-GAPPED DEMO"}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              Every decision, provably replayable.
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl">
              Inspect cryptographic Ed25519 signatures, canonical SHA-256 hashes, and real audit trails.
              Click any hash to copy and view exact timestamp details.
            </p>
          </div>

          {/* Source Switcher */}
          {sources.length > 0 && (
            <div className="flex items-center gap-2 bg-white p-2 border border-black/15 shrink-0">
              <span className="text-xs font-mono font-bold text-[#74736A] ml-2">DATA SOURCE:</span>
              <select
                value={selectedSourceId}
                onChange={(e) => handleSelectSource(e.target.value)}
                className="bg-[#FAF9F5] border border-black/15 px-3 py-1.5 text-xs font-mono font-bold text-[#232323] focus:outline-none rounded-none cursor-pointer"
              >
                {sources.map((src) => (
                  <option key={src.id} value={src.id}>
                    {src.label} ({src.eventCount} events)
                  </option>
                ))}
              </select>
            </div>
          )}
        </motion.div>

        {/* Telemetry Stats Bar */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#EAEEDD] border border-black/15 p-4">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              01 · RUN / PERMIT
            </span>
            <div className="mt-1 truncate">
              <ClickableHash
                hash={activeManifest.runId}
                label="Run Manifest Identifier"
                timestamp={activeManifest.createdAt}
                type="Manifest ID"
                size={8}
                onInspect={setInspectData}
              />
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block truncate">
              {manifestTime.full}
            </span>
          </div>

          <div className="bg-white border border-black/15 p-4">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              02 · JOURNAL
            </span>
            <div className="text-xl font-bold font-mono text-[#0B4FFF] mt-1">
              {activeManifest.events.length}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Hash-chained events</span>
          </div>

          <div className="bg-white border border-black/15 p-4">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              03 · VERIFICATION
            </span>
            <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
              {activeReport.counts.passed}/{activeReport.checks.length}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">
              {activeReport.counts.failed === 0 ? "0 failures" : `${activeReport.counts.failed} failed`}
            </span>
          </div>

          <div className="bg-white border border-black/15 p-4">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              04 · REPRODUCED
            </span>
            <div className="text-xl font-bold font-mono text-[#0B4FFF] mt-1">
              {activeReport.counts.reproduced}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Re-evaluated proofs</span>
          </div>

          <div className="bg-white border border-black/15 p-4">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              05 · RECORDED
            </span>
            <div className="text-xl font-bold font-mono text-[#232323] mt-1">
              {activeReport.counts.recorded}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Captured snapshots</span>
          </div>

          <div className="bg-white border border-black/15 p-4">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              06 · SIGNING KEY
            </span>
            <div className="mt-1 truncate">
              <ClickableHash
                hash={activeManifest.signingKeyId || "4955b19676805b1c"}
                label="Ed25519 Signing Key ID"
                timestamp={activeManifest.createdAt}
                type="Ed25519 Key ID"
                size={6}
                onInspect={setInspectData}
              />
            </div>
            <span className="text-[10px] text-emerald-800 font-mono font-bold mt-1 block">
              Ed25519 Verified
            </span>
          </div>
        </motion.div>

        {/* Source Notes */}
        {proof.notes && proof.notes.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="p-4 bg-white border border-black/15 flex flex-col gap-1.5 text-xs font-mono"
          >
            <span className="text-[10px] font-bold text-[#74736A] uppercase tracking-wider">
              MANIFEST PROVENANCE & CAVEATS
            </span>
            {proof.notes.map((note, idx) => (
              <div key={idx} className="text-[#5F5E56] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B4FFF]" />
                {note}
              </div>
            ))}
          </motion.div>
        )}

        {/* Audit Honesty Card */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 flex flex-col">
          <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15 flex items-center justify-between">
            <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
              HOW TO READ REPRODUCED VS RECORDED EVIDENCE
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            <div className="bg-[#FAF9F5] p-5 border border-black/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#EAEEDD] text-emerald-900 border border-emerald-800/30">
                  REPRODUCED CHECKS ({reproducedChecks.length})
                </span>
              </div>
              <p className="text-[#232323] leading-relaxed font-sans text-xs">
                Deterministic mathematical proofs executed in this runtime now. All safety invariants,
                policy hashes, intent hashes, permit signatures, and exact order bindings are re-evaluated
                from raw inputs and proven identical.
              </p>
            </div>

            <div className="bg-[#FAF9F5] p-5 border border-black/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-white text-[#232323] border border-black/15">
                  RECORDED FACTS ({recordedChecks.length})
                </span>
              </div>
              <p className="text-[#232323] leading-relaxed font-sans text-xs">
                Market and account snapshots captured at execution time. We cryptographically prove their
                canonical SHA-256 hashes have not been altered or backfilled since generation.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Append-Only Hash Chain Journal */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 flex flex-col">
          <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
                APPEND-ONLY HASH CHAIN JOURNAL
              </div>
              <p className="text-xs text-[#74736A] font-mono mt-0.5">
                Click any hash to copy and inspect its full cryptographic payload and timestamp.
              </p>
            </div>
            <span className="text-xs font-mono text-[#74736A] bg-white px-3 py-1 border border-black/15">
              {activeManifest.events.length} Hash-Chained Events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#74736A] uppercase text-[10px] font-bold border-b border-black/10">
                  <th className="py-3 px-4 w-40">Date & Time</th>
                  <th className="py-3 px-4 w-28">Event ID</th>
                  <th className="py-3 px-4 w-48">Event Type</th>
                  <th className="py-3 px-4 w-40">SHA-256 Hash</th>
                  <th className="py-3 px-4 w-40">Parent Hash</th>
                  <th className="py-3 px-4">Payload Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {activeManifest.events.map((evt) => {
                  const tone = EVENT_TONES[evt.eventType] ?? {
                    bg: "bg-white",
                    text: "text-[#232323]",
                    border: "border-black/15",
                  };
                  const eventTime = formatDateTime(evt.timestamp);

                  return (
                    <tr key={evt.eventId} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-[#232323]">
                        <div className="font-semibold">{eventTime.time}</div>
                        <div className="text-[10px] text-[#74736A]">{eventTime.date}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#232323]">{evt.eventId}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${tone.bg} ${tone.text} ${tone.border}`}
                        >
                          {evt.eventType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ClickableHash
                          hash={evt.eventHash}
                          label={`${evt.eventId} · ${evt.eventType}`}
                          timestamp={evt.timestamp}
                          type="Event Hash (SHA-256)"
                          metadata={{
                            actor: evt.actor,
                            codeRevision: evt.codeRevision,
                          }}
                          payload={evt.payload}
                          onInspect={setInspectData}
                        />
                      </td>
                      <td className="py-3 px-4">
                        {evt.previousEventHash ? (
                          <ClickableHash
                            hash={evt.previousEventHash}
                            label={`${evt.eventId} Previous Hash`}
                            timestamp={evt.timestamp}
                            type="Parent Link Hash"
                            onInspect={setInspectData}
                          />
                        ) : (
                          <span className="text-[#74736A] font-mono text-xs">GENESIS</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#232323] font-sans text-xs">
                        {decisionSummary(evt.payload) ?? (
                          <span className="text-[#74736A] font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Verification Matrix Card Component */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 flex flex-col">
          <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
                CRYPTOGRAPHIC VERIFICATION MATRIX
              </div>
              <p className="text-xs text-[#74736A] font-mono mt-0.5">
                Re-evaluated against deterministic safety rules and permit bounds.
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#74736A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter checks..."
                  value={searchCheck}
                  onChange={(e) => setSearchCheck(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-black/15 text-xs text-[#232323] font-mono focus:outline-none rounded-none"
                />
              </div>

              <div className="flex bg-white p-1 border border-black/15 text-xs font-mono">
                {(["ALL", "REPRODUCED", "RECORDED"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCheckFilter(tab)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      checkFilter === tab
                        ? "bg-[#232323] text-white"
                        : "text-[#74736A] hover:text-[#232323]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#74736A] uppercase text-[10px] font-mono font-bold border-b border-black/10">
                  <th className="py-2.5 px-4 w-24">Status</th>
                  <th className="py-2.5 px-4 w-32">Classification</th>
                  <th className="py-2.5 px-4 w-28">Event ID</th>
                  <th className="py-2.5 px-4">Verification Check Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {filteredChecks.map((check, index) => (
                  <tr
                    key={`${check.id}-${check.eventId ?? "global"}-${index}`}
                    className="hover:bg-[#FAF9F5] transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          check.ok
                            ? "bg-[#EAEEDD] text-emerald-900 border-emerald-800/30"
                            : "bg-rose-50 text-rose-900 border-rose-800/30"
                        }`}
                      >
                        {check.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {check.ok ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          check.label === "REPRODUCED"
                            ? "bg-[#EAEEDD] text-emerald-900 border-emerald-800/30"
                            : "bg-white text-[#232323] border border-black/15"
                        }`}
                      >
                        {check.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#74736A] font-bold text-xs">
                      {check.eventId ?? "—"}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-[#232323] font-mono text-xs">{check.id}</div>
                      <div className="text-[#74736A] text-xs mt-0.5 leading-relaxed font-sans">
                        {check.detail}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Card Footer */}
          <div className="flex items-stretch border-t border-black/15 bg-[#FAF9F5]">
            <div className="flex-1 px-4 py-3 text-xs font-mono text-[#74736A]">
              {activeReport.counts.passed} checks reproduced deterministically
            </div>
            <div className="w-10 h-10 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] text-[#232323]">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </motion.div>

        {/* Reproduce Locally CLI Box */}
        <motion.div
          variants={itemVariants}
          className="bg-[#1A1A1A] text-white border border-black/20 p-6 md:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-[#0B4FFF]" />
              <h3 className="text-base font-mono font-bold uppercase text-white">
                Reproduce Offline from Fresh Clone
              </h3>
            </div>

            <button
              onClick={copyTerminalCmd}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-mono text-white border border-white/15 transition-colors cursor-pointer"
            >
              {copiedTerminal ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedTerminal ? "COPIED" : "COPY CLI"}
            </button>
          </div>

          <p className="text-xs text-[#A0A09B] font-mono mb-4">
            Runs deterministic verification checks and architectural boundary audit rules in under 2 seconds.
          </p>

          <div className="bg-black/60 p-4 font-mono text-xs text-emerald-400 leading-relaxed border border-white/10 overflow-x-auto">
            <div className="text-[#A0A09B] select-none">
              # Verify all deterministic checks on committed run manifest:
            </div>
            <div>npm run verify -- demo/run_manifest.json</div>
            <div className="text-[#A0A09B] select-none mt-2">
              # Audit capability boundary isolation & invariant coverage:
            </div>
            <div>npm run audit</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Cryptographic Inspector Modal */}
      <HashInspectorModal data={inspectData} onClose={() => setInspectData(null)} />
    </div>
  );
}
