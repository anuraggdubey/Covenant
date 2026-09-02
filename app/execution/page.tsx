"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileKey2,
  Layers,
  Play,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ClickableHash,
  HashInspectorModal,
  formatDateTime,
  type HashInspectorData,
} from "@/components/HashInspectorModal";

interface Governance {
  decision: string;
  reason: string;
  failedInvariants: string[];
  shrunkQuantity?: number;
  heldForOperator?: boolean;
  permit?: { permitId: string; expiresAt: string };
  execution?:
    | { submitted: true; orderId: string; requestId: string }
    | { submitted: false; code: string; reason: string };
}

interface TickUnderlying {
  symbol: string;
  marketSnapshotHash?: string;
  proposal: { intent?: { quantity: number; structure: string; standaloneMaxLoss: string; intentHash?: string } } & {
    abstain?: true;
    reason?: string;
  };
  governance?: Governance;
}

interface Tick {
  timestamp: string;
  dataMode: string;
  submissionMode: string;
  shadowMarksUpdated?: number;
  clock: { isOpen: boolean; nextOpen: string; nextClose: string };
  account: { id: string; equity: string; optionsLevel: number };
  session?: { state: string; sessionDate: string; haltReason: string | null };
  underlyings: TickUnderlying[];
  events?: { eventId: string; eventType: string }[];
}

interface History {
  totalTicks: number;
  summary: { intentsGenerated: number; abstainDecisions: number };
  recentTicks: Tick[];
}

interface Health {
  mode: "SYNTHETIC_MOCK" | "PAPER_TRADING";
  alpaca?: { marketOpen: boolean; equity: string };
}

const REFRESH_MS = 10_000;

function decisionBadge(decision: string | undefined) {
  switch (decision) {
    case "APPROVE":
      return "border-emerald-800/30 bg-emerald-50 text-emerald-900";
    case "SHRINK":
    case "ABSTAIN":
      return "border-amber-800/30 bg-amber-50 text-amber-900";
    case "VETO":
      return "border-rose-800/30 bg-rose-50 text-rose-900";
    default:
      return "border-black/15 bg-white text-[#5F5E56]";
  }
}

export default function ExecutionPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [running, setRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [inspectData, setInspectData] = useState<HashInspectorData | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [historyResponse, healthResponse] = await Promise.all([
        fetch("/api/tick/history"),
        fetch("/api/health"),
      ]);
      setHistory((await historyResponse.json()) as History);
      setHealth((await healthResponse.json()) as Health);
    } catch {
      /* leave the last good state on screen rather than blanking it */
    }
  }, []);

  const runTick = useCallback(async () => {
    setRunning(true);
    setLastError(null);
    try {
      const response = await fetch("/api/tick/run", { method: "POST" });
      const body = (await response.json()) as { ok: boolean; error?: string; durationMs?: number };
      setLastDurationMs(body.durationMs ?? null);
      if (!body.ok) setLastError(body.error ?? "Tick failed.");
      else setLastError(null);
      await load();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Tick request failed.");
    } finally {
      setRunning(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (timer.current !== null) clearInterval(timer.current);
    if (!autoRefresh) return;
    timer.current = setInterval(() => void load(), REFRESH_MS);
    return () => {
      if (timer.current !== null) clearInterval(timer.current);
    };
  }, [autoRefresh, load]);

  const latest = history?.recentTicks[0];
  const latestTime = formatDateTime(latest?.timestamp);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.35 } },
  };

  return (
    <div className="min-h-screen bg-[#F0EFE3] text-[#232323]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-[1400px] px-6 py-12 md:py-16 flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/15"
        >
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#232323]">
                EXECUTION LOOP · LANE B
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider border ${
                  health?.mode === "SYNTHETIC_MOCK"
                    ? "bg-amber-50 border-amber-800/30 text-amber-900"
                    : "bg-[#EAEEDD] border-black/15 text-emerald-900"
                }`}
              >
                {health?.mode === "SYNTHETIC_MOCK" ? "SYNTHETIC MOCK" : "ALPACA PAPER TRADING"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#5F5E56]">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                FAIL-CLOSED BY CONSTRUCTION
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              The autonomous loop.
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl">
              One tick fetches live option chains from Alpaca, computes defined-risk verticals, validates
              all eight safety invariants, and either issues an Ed25519 TradePermit or refuses.
              Click any hash to inspect its raw verification digest and timestamp.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/shadow-ledger"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FAF9F5] text-[#232323] text-xs font-mono font-bold uppercase border border-black/15 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#74736A]" />
              Shadow Ledger
              <ArrowRight className="w-3 h-3 text-[#74736A]" />
            </Link>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-mono font-bold uppercase border transition-colors cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-50 border-emerald-800/30 text-emerald-900"
                  : "bg-white border-black/15 text-[#74736A]"
              }`}
              title="Auto-refresh tick history every 10 seconds"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "text-emerald-700" : "text-[#74736A]"}`} />
              {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
            </button>

            <button
              onClick={() => void runTick()}
              disabled={running}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0B4FFF] hover:bg-[#093ED9] text-white text-xs font-mono font-bold uppercase transition-all hover:shadow-[0_4px_14px_0_rgba(11,79,255,0.39)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${running ? "animate-spin" : ""}`} />
              {running ? "Executing cycle..." : "Run Single Tick"}
            </button>
          </div>
        </motion.div>

        {/* Notices */}
        {lastDurationMs !== null && lastError === null && (
          <motion.div
            variants={itemVariants}
            className="flex items-start gap-3 p-4 border border-emerald-800/25 bg-emerald-50 text-emerald-900 text-sm font-mono"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">CYCLE COMPLETED: </span>
              Finished full pipeline in <strong>{lastDurationMs}ms</strong>.
              {latest?.shadowMarksUpdated !== undefined && latest.shadowMarksUpdated > 0 && (
                <span>
                  {" "}
                  Shadow ledger updated <strong>{latest.shadowMarksUpdated}</strong> candidate mark
                  {latest.shadowMarksUpdated === 1 ? "" : "s"}.
                </span>
              )}
            </div>
          </motion.div>
        )}

        {lastError !== null && (
          <motion.div
            variants={itemVariants}
            className="flex items-start gap-3 p-4 border border-rose-800/30 bg-rose-50 text-rose-900 text-sm font-mono"
          >
            <CircleAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">EXECUTION ERROR: </span>
              {lastError}
            </div>
          </motion.div>
        )}

        {/* 4 Telemetry Metric Blocks */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#EAEEDD] border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              01 · TICKS EXECUTED
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-[#232323] mt-1">
              {history?.totalTicks ?? 0}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Full cycles run</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              02 · INTENTS GENERATED
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-[#0B4FFF] mt-1">
              {history?.summary.intentsGenerated ?? 0}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Alpha candidates proposed</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              03 · FAIL-CLOSED REFUSALS
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-amber-800 mt-1">
              {history?.summary.abstainDecisions ?? 0}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Kernel invariant halts</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              04 · BROKER SUBMISSION
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono mt-1">
              <span
                className={`px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider border ${
                  latest?.submissionMode === "LIVE"
                    ? "bg-emerald-50 border-emerald-800/30 text-emerald-900"
                    : "bg-[#FAF9F5] border-black/15 text-[#5F5E56]"
                }`}
              >
                {latest?.submissionMode === "LIVE" ? "ALPACA LIVE" : "HELD (DRY RUN)"}
              </span>
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">
              COVENANT_LIVE_SUBMIT gate
            </span>
          </div>
        </motion.div>

        {/* Latest Tick Section */}
        {latest === undefined ? (
          <motion.div variants={itemVariants} className="border border-black/15 bg-white p-8 text-center">
            <Clock3 className="w-10 h-10 text-[#74736A] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-semibold text-[#232323]">No execution ticks recorded</h3>
            <p className="text-sm text-[#74736A] max-w-md mx-auto mt-2 leading-relaxed">
              Trigger a cycle to ingest real option chains from Alpaca, evaluate the Safety Kernel, and
              observe invariant decisions.
            </p>
            <button
              onClick={() => void runTick()}
              disabled={running}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#0B4FFF] hover:bg-[#093ED9] text-white text-xs font-mono font-bold uppercase transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {running ? "Executing cycle..." : "Run First Tick"}
            </button>
          </motion.div>
        ) : (
          <motion.section variants={itemVariants} className="border border-black/15 bg-white overflow-hidden">
            {/* Latest Tick Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/15 bg-[#FAF9F5] px-6 py-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#74736A]">
                  LATEST RECORDED TICK
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-xl font-semibold text-[#232323]">{latestTime.time}</h2>
                  <span className="font-mono text-xs text-[#74736A]">{latestTime.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                <span className="border border-black/15 bg-white px-2.5 py-1">
                  DATA: <strong>{latest.dataMode}</strong>
                </span>
                <span
                  className={`border px-2.5 py-1 ${
                    latest.clock.isOpen
                      ? "border-emerald-800/30 bg-emerald-50 text-emerald-900"
                      : "border-amber-800/30 bg-amber-50 text-amber-900"
                  }`}
                >
                  MARKET: <strong>{latest.clock.isOpen ? "OPEN" : "CLOSED"}</strong>
                </span>
                <span className="border border-black/15 bg-white px-2.5 py-1">
                  SESSION: <strong>{latest.session?.state ?? "ACTIVE"}</strong>
                </span>
                <span className="border border-black/15 bg-[#EAEEDD] px-2.5 py-1 text-[#232323]">
                  EQUITY:{" "}
                  <strong>
                    ${Number(latest.account.equity).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </strong>
                </span>
              </div>
            </div>

            {/* Underlyings Grid */}
            <div className="p-6 grid gap-6 md:grid-cols-2">
              {latest.underlyings.map((underlying) => {
                const governance = underlying.governance;
                const intent = "intent" in underlying.proposal ? underlying.proposal.intent : undefined;

                return (
                  <div
                    key={underlying.symbol}
                    className="border border-black/15 bg-[#FAF9F5] p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                        <div className="flex items-center gap-2">
                          <strong className="text-xl font-mono">{underlying.symbol}</strong>
                          <span className="text-xs font-mono text-[#74736A]">
                            {underlying.symbol === "SPY" ? "S&P 500 ETF" : "NASDAQ-100 ETF"}
                          </span>
                        </div>
                        <span
                          className={`border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider ${decisionBadge(
                            governance?.decision
                          )}`}
                        >
                          {governance?.decision ?? "ABSTAIN"}
                        </span>
                      </div>

                      {/* Proposal Details */}
                      <div className="mt-4">
                        {intent ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-[#74736A]">STRUCTURE:</span>
                              <strong className="text-[#232323]">
                                {intent.structure.replaceAll("_", " ")}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-[#74736A]">QUANTITY:</span>
                              <strong className="text-[#232323]">{intent.quantity} contracts</strong>
                            </div>
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-[#74736A]">STANDALONE MAX LOSS:</span>
                              <strong className="text-[#232323]">${intent.standaloneMaxLoss}</strong>
                            </div>
                            {intent.intentHash && (
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-[#74736A]">INTENT HASH:</span>
                                <ClickableHash
                                  hash={intent.intentHash}
                                  label={`${underlying.symbol} Trade Intent Hash`}
                                  timestamp={latest.timestamp}
                                  type="Trade Intent SHA-256"
                                  onInspect={setInspectData}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-[#74736A]">No candidate spread proposed.</p>
                        )}

                        {/* Reason / Thesis */}
                        <div className="mt-4 p-3 bg-white border border-black/10 text-xs font-mono leading-relaxed text-[#51515A]">
                          {governance?.reason ??
                            underlying.proposal.reason ??
                            "Engine produced no trade candidate."}
                        </div>

                        {/* Failed Invariants */}
                        {governance?.failedInvariants && governance.failedInvariants.length > 0 && (
                          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-800/25 text-[11px] font-mono text-rose-900">
                            <strong>FAILED INVARIANTS: </strong>
                            {governance.failedInvariants.join(" · ")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Execution / Permit Footnote */}
                    <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono text-[#74736A] flex-wrap gap-2">
                      {governance?.permit ? (
                        <div className="flex items-center gap-1.5">
                          <FileKey2 className="w-3.5 h-3.5 text-[#0B4FFF]" />
                          <ClickableHash
                            hash={governance.permit.permitId}
                            label={`Permit ${governance.permit.permitId}`}
                            timestamp={latest.timestamp}
                            type="Ed25519 TradePermit ID"
                            onInspect={setInspectData}
                          />
                        </div>
                      ) : (
                        <span>No permit issued</span>
                      )}

                      {governance?.execution?.submitted === true && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-800 font-bold">ORDER:</span>
                          <ClickableHash
                            hash={governance.execution.orderId}
                            label={`Alpaca Paper Order ${governance.execution.orderId}`}
                            timestamp={latest.timestamp}
                            type="Alpaca Broker Order ID"
                            onInspect={setInspectData}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Tick History Table */}
        {history !== null && history.recentTicks.length > 0 && (
          <motion.section variants={itemVariants} className="border border-black/15 bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/15 px-6 py-4 bg-[#FAF9F5]">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#74736A]">
                  AUDIT LOG & TIMELINE
                </p>
                <h2 className="text-lg font-semibold text-[#232323]">Recent Tick Executions</h2>
              </div>
              <span className="font-mono text-xs text-[#74736A]">
                Showing last {history.recentTicks.length} cycles
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="bg-[#FAF9F5] border-b border-black/10 font-mono text-[10px] font-bold tracking-[0.1em] text-[#74736A]">
                  <tr>
                    <th className="px-6 py-3">DATE & TIME</th>
                    <th className="px-4 py-3">SESSION</th>
                    <th className="px-4 py-3">DECISIONS</th>
                    <th className="px-4 py-3">EVENTS</th>
                    <th className="px-4 py-3">DATA MODE</th>
                    <th className="px-6 py-3 text-right">SUBMISSION</th>
                  </tr>
                </thead>
                <tbody>
                  {history.recentTicks.map((tick, index) => {
                    const rowTime = formatDateTime(tick.timestamp);
                    return (
                      <tr
                        key={`${tick.timestamp}-${index}`}
                        className="border-t border-black/10 text-sm hover:bg-[#FAF9F5] transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-xs">
                          <div className="font-semibold text-[#232323]">{rowTime.time}</div>
                          <div className="text-[10px] text-[#74736A]">{rowTime.date}</div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-[#5F5E56]">
                          {tick.session?.state ?? "ACTIVE"}
                        </td>
                        <td className="px-4 py-4 font-mono text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            {tick.underlyings.map((u) => (
                              <span
                                key={u.symbol}
                                className={`border px-1.5 py-0.5 text-[10px] font-bold ${decisionBadge(
                                  u.governance?.decision
                                )}`}
                              >
                                {u.symbol} {u.governance?.decision ?? "ABSTAIN"}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-[#74736A]">
                          {tick.events?.length ?? 0} events
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-[#5F5E56]">{tick.dataMode}</td>
                        <td className="px-6 py-4 text-right font-mono text-xs">
                          <span
                            className={`border px-2 py-0.5 text-[10px] font-bold ${
                              tick.submissionMode === "LIVE"
                                ? "bg-emerald-50 border-emerald-800/30 text-emerald-900"
                                : "bg-[#FAF9F5] border-black/15 text-[#74736A]"
                            }`}
                          >
                            {tick.submissionMode}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}
      </motion.div>

      {/* Cryptographic Inspector Modal */}
      <HashInspectorModal data={inspectData} onClose={() => setInspectData(null)} />
    </div>
  );
}
