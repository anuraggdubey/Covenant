"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { RefreshCw, Play, ArrowRight, Shield, TrendingDown, TrendingUp, AlertTriangle, ShieldAlert } from "lucide-react";

interface Row {
  candidateId: string;
  underlying: string;
  structure: string;
  decision: string;
  failedInvariants: string[];
  requestedQuantity: number;
  governedQuantity: number;
  markPerContract: string;
  governedPnl: string;
  shadowPnl: string;
  delta: string;
  markedAt: string;
}

interface LedgerResponse {
  candidates: number;
  empty: boolean;
  emptyReason: string | null;
  report: {
    candidates: number;
    governedPnl: string;
    shadowPnl: string;
    safetyDelta: string;
    lossAvoided: string;
    missedUpside: string;
    attribution: { invariant: string; interventions: number; lossAvoided: string; upsideForgone: string }[];
    caveat: string;
  };
  rows: Row[];
}

function money(value: string): string {
  const parsed = Number(value);
  const sign = parsed > 0 ? "+" : "";
  return `${sign}$${value}`;
}

function toneForText(value: string): string {
  const parsed = Number(value);
  if (parsed > 0) return "text-emerald-700";
  if (parsed < 0) return "text-rose-700";
  return "text-[#232323]";
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

export default function ShadowLedgerPage() {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [runningTick, setRunningTick] = useState(false);
  const [tickError, setTickError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/shadow-ledger");
      setData((await response.json()) as LedgerResponse);
    } catch {
      /* keep the last good state */
    }
  }, []);

  const runTick = useCallback(async () => {
    setRunningTick(true);
    setTickError(null);
    try {
      const response = await fetch("/api/tick/run", { method: "POST" });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (!body.ok) setTickError(body.error ?? "Tick failed.");
      await load();
    } catch (error) {
      setTickError(error instanceof Error ? error.message : "Tick request failed.");
    } finally {
      setRunningTick(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10_000);
    return () => clearInterval(timer);
  }, [load]);

  const report = data?.report;

  return (
    <div className="flex-1 w-full bg-[#F0EFE3] min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[1400px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/15">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#232323]">
                SHADOW LEDGER
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] border border-black/15 text-emerald-900">
                LIVE MARKING
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              What the rules cost, and what they saved
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl">
              Every candidate the kernel saw is marked here — approved, shrunk, vetoed or abstained —
              on the same schedule, so the comparison is like-for-like. Marking only the approvals
              would be the selection bias this page exists to measure.
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <Link 
              href="/execution"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-black/15 text-[#232323] text-sm font-medium hover:bg-[#FAF9F5] transition-colors"
            >
              Execution <ArrowRight className="w-4 h-4" />
            </Link>
            <button 
              disabled={runningTick} 
              onClick={() => void runTick()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B4FFF] text-white text-sm font-medium hover:bg-[#0B4FFF]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {runningTick ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {runningTick ? "Running…" : "Run tick"}
            </button>
          </div>
        </motion.div>

        {tickError !== null && (
          <motion.div variants={itemVariants} className="bg-rose-50 border border-rose-800/30 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-mono text-sm text-rose-900 m-0">{tickError}</p>
          </motion.div>
        )}

        {data?.empty === true ? (
          <motion.div variants={itemVariants} className="bg-white border border-black/15 p-12 flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-12 h-12 text-[#a1a1aa] mb-4" />
            <h2 className="text-xl font-medium text-[#232323] mb-2">Nothing marked yet</h2>
            <p className="text-[#74736A] mb-8">{data.emptyReason}</p>
            <button 
              disabled={runningTick} 
              onClick={() => void runTick()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0B4FFF] text-white text-sm font-medium hover:bg-[#0B4FFF]/90 transition-colors disabled:opacity-50 min-w-[200px]"
            >
              {runningTick ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {runningTick ? "Running tick…" : "Run a tick to populate the ledger"}
            </button>
          </motion.div>
        ) : (
          report !== undefined && (
            <div className="flex flex-col gap-8">
              {/* Metric Cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <article className="bg-[#FAF9F5] border-l-4 border-l-emerald-500 border border-black/15 p-8 flex flex-col justify-between">
                  <div>
                    <p className="font-mono text-xs text-[#74736A] uppercase tracking-widest mb-4">Column A — What actually happened</p>
                    <h2 className="text-2xl font-medium text-[#232323] mb-1">Governed</h2>
                    <p className="text-sm text-[#74736A]">The size the kernel allowed, at the current mark.</p>
                  </div>
                  <div className="mt-8">
                    <strong className={`text-[40px] leading-none tracking-tight block mb-4 ${toneForText(report.governedPnl)}`}>
                      {money(report.governedPnl)}
                    </strong>
                    <div className="flex items-center gap-2 text-sm text-[#74736A] bg-emerald-50 border border-emerald-100 p-3">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Loss avoided by refusing or shrinking: 
                      <strong className="font-mono text-emerald-900">${report.lossAvoided}</strong>
                    </div>
                  </div>
                </article>

                <article className="bg-[#FAF9F5] border-l-4 border-l-rose-500 border border-black/15 p-8 flex flex-col justify-between">
                  <div>
                    <p className="font-mono text-xs text-[#74736A] uppercase tracking-widest mb-4">Column B — What would have happened</p>
                    <h2 className="text-2xl font-medium text-[#232323] mb-1">Ungoverned</h2>
                    <p className="text-sm text-[#74736A]">Every candidate taken at the full requested size.</p>
                  </div>
                  <div className="mt-8">
                    <strong className={`text-[40px] leading-none tracking-tight block mb-4 ${toneForText(report.shadowPnl)}`}>
                      {money(report.shadowPnl)}
                    </strong>
                    <div className="flex items-center gap-2 text-sm text-[#74736A] bg-rose-50 border border-rose-100 p-3">
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                      Upside given up: 
                      <strong className="font-mono text-rose-900">${report.missedUpside}</strong>
                    </div>
                  </div>
                </article>
              </motion.div>

              {/* Safety Delta */}
              <motion.div variants={itemVariants} className="bg-white border border-black/15 p-12 text-center flex flex-col items-center">
                <p className="font-mono text-xs text-[#74736A] uppercase tracking-widest mb-2">Safety delta — governed minus ungoverned</p>
                <strong className={`text-[56px] md:text-[72px] leading-none tracking-tight block mb-4 ${toneForText(report.safetyDelta)}`}>
                  {money(report.safetyDelta)}
                </strong>
                <p className="text-sm text-[#74736A] max-w-xl mx-auto">
                  Across {report.candidates} marked candidate{report.candidates === 1 ? "" : "s"}.
                  A delta of zero means governance never had to intervene — not that it did nothing.
                </p>
              </motion.div>

              {/* Attribution Table */}
              {report.attribution.length > 0 && (
                <motion.div variants={itemVariants} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-medium text-[#232323]">Which rule did it</h2>
                  </div>
                  <div className="bg-white border border-black/15 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-black/15 bg-[#FAF9F5]">
                          <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal">Invariant</th>
                          <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal">Interventions</th>
                          <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal">Loss avoided</th>
                          <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal">Upside forgone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {report.attribution.map((row) => (
                          <tr key={row.invariant} className="hover:bg-[#FAF9F5]/50 transition-colors">
                            <td className="p-4 font-mono text-sm text-[#232323]">{row.invariant}</td>
                            <td className="p-4 font-mono text-sm text-[#74736A]">{row.interventions}</td>
                            <td className="p-4 font-mono text-sm text-emerald-600">${row.lossAvoided}</td>
                            <td className="p-4 font-mono text-sm text-rose-600">${row.upsideForgone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-[#74736A]">
                    A candidate stopped by two rules credits both. We are not pretending to know
                    which one really did it.
                  </p>
                </motion.div>
              )}

              {/* Master Ledger Table */}
              <motion.div variants={itemVariants} className="flex flex-col gap-4">
                <h2 className="text-xl font-medium text-[#232323]">Candidate by candidate</h2>
                <div className="bg-white border border-black/15 overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-black/15 bg-[#FAF9F5]">
                        <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal">Decision</th>
                        <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal">Underlying</th>
                        <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal text-right">Requested</th>
                        <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal text-right">Allowed</th>
                        <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal text-right">Mark / contract</th>
                        <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal text-right">Governed P&amp;L</th>
                        <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal text-right">Ungoverned P&amp;L</th>
                        <th className="p-4 text-xs font-mono text-[#74736A] uppercase tracking-wider font-normal text-right">VS delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {data?.rows.map((row) => (
                        <tr key={row.candidateId} className="hover:bg-[#FAF9F5]/50 transition-colors">
                          <td className="p-4">
                            <span
                              className={`inline-flex px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider border ${
                                row.decision === "APPROVE"
                                  ? "bg-[#EAEEDD] text-emerald-900 border-emerald-800/30"
                                  : row.decision === "VETO"
                                    ? "bg-rose-50 text-rose-900 border-rose-800/30"
                                    : "bg-amber-50 text-amber-900 border-amber-800/30"
                              }`}
                            >
                              {row.decision}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-medium text-[#232323]">{row.underlying}</td>
                          <td className="p-4 font-mono text-sm text-[#74736A] text-right">{row.requestedQuantity}</td>
                          <td className="p-4 font-mono text-sm text-[#232323] font-medium text-right">{row.governedQuantity}</td>
                          <td className="p-4 font-mono text-sm text-[#74736A] text-right">${row.markPerContract}</td>
                          <td className={`p-4 font-mono text-sm text-right ${toneForText(row.governedPnl)}`}>{money(row.governedPnl)}</td>
                          <td className={`p-4 font-mono text-sm text-right ${toneForText(row.shadowPnl)}`}>{money(row.shadowPnl)}</td>
                          <td className={`p-4 font-mono text-sm text-right font-medium ${toneForText(row.delta)}`}>{money(row.delta)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-amber-50 border border-amber-800/30 p-6 flex flex-col gap-2">
                <p className="font-mono text-xs text-amber-900 uppercase tracking-widest font-bold">Read this before quoting the number</p>
                <p className="text-sm text-amber-900/80 m-0">{report.caveat}</p>
              </motion.div>
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}
