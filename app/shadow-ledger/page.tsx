"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import {
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  ArrowRight,
  Minus,
  Sparkles,
  BarChart3,
  Layers,
  History,
  Info
} from "lucide-react";
import Link from "next/link";

interface ValidationSummary {
  title: string;
  period: string;
  underlyings: string[];
  regimes: string[];
  results: Array<{
    label: string;
    value: string;
    note?: string;
  }>;
}

export default function ShadowLedgerPage() {
  const [validation, setValidation] = useState<ValidationSummary | null>(null);

  useEffect(() => {
    setValidation({
      title: "Walk-Forward Signal Validation (Lane C — v2)",
      period: "Jan 2022 – Aug 2026 (out-of-sample only)",
      underlyings: ["SPY", "QQQ"],
      regimes: ["Low Vol (VIX < 18)", "Normal Vol (18–28)", "High Vol (VIX > 28)"],
      results: [
        { label: "Total Out-of-Sample Windows", value: "4", note: "Regime-split, no look-ahead" },
        { label: "Methodology", value: "Walk-forward", note: "Train on preceding window, test on next" },
        { label: "Cost Assumptions", value: "Conservative", note: "$0.02/contract slippage + spread" },
        { label: "Data Source", value: "CC0-licensed daily bars", note: "docs/validation/data/" },
        { label: "Synthetic Data Labels", value: "ALL LABELLED", note: "No unlabelled synthetic history" },
      ],
    });
  }, []);

  const SHADOW_CONCEPT = [
    {
      category: "Governed Trade",
      badge: "EXECUTED",
      description: "A trade that passed all 8 invariants and was executed with an Ed25519 single-use signed permit.",
      icon: CheckCircle2,
      tone: "bg-[#EAEEDD] text-emerald-900 border-emerald-800/30",
      action: "Inspect Execution Proof"
    },
    {
      category: "Shrunk Trade",
      badge: "REDUCED",
      description: "A trade where the Safety Kernel reduced lot quantity or narrowed the price band to respect risk limits.",
      icon: ArrowDownRight,
      tone: "bg-white text-[#0B4FFF] border-black/15",
      action: "Review Shrink Rules"
    },
    {
      category: "Vetoed Trade",
      badge: "REJECTED",
      description: "A proposed trade rejected by invariant checks before any permit signature or order routing.",
      icon: XCircle,
      tone: "bg-rose-50 text-rose-900 border-rose-800/30",
      action: "View Veto Invariants"
    },
    {
      category: "Abstained",
      badge: "SKIPPED",
      description: "No trade proposed due to missing data, closed market, stale quote feed, or low model confidence.",
      icon: Minus,
      tone: "bg-amber-50 text-amber-900 border-amber-800/30",
      action: "Check Fail-Closed Logic"
    },
  ];

  const ATTRIBUTION_RULES = [
    { rule: "COV-02: Per-Trade Max Loss", saved: "Prevents oversized positions that could breach 0.6% equity limit", frequency: "Every trade", tag: "STRICT" },
    { rule: "COV-03: Portfolio Heat Ceiling", saved: "Blocks new entries when total open risk exceeds 2.5% of equity", frequency: "Conditional", tag: "CAP" },
    { rule: "COV-04: Daily Halt", saved: "Stops all trading after daily P&L drops below -1.25% of equity", frequency: "Protective", tag: "SESSION" },
    { rule: "COV-05: Freshness & Liquidity", saved: "Rejects stale quotes and illiquid contracts that would cause slippage", frequency: "Common", tag: "MARKET" },
    { rule: "COV-07: Exit Deadline", saved: "Forces close attempts before expiration to avoid assignment risk", frequency: "Every position", tag: "LIFECYCLE" },
    { rule: "COV-08: Missing State → ABSTAIN", saved: "Prevents trading on incomplete or unverifiable market data", frequency: "Fail-Closed", tag: "CORE" },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  };

  return (
    <div className="flex-1 w-full bg-[#F0EFE3] min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[1400px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-10"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/15">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#232323]">
                SHADOW LEDGER · LANE C
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] border border-black/15 text-emerald-900">
                NO RETROACTIVE SELECTION
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#232323]">
                SYNCHRONISED MARKS
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              Measure what safety rules save
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl">
              The Shadow Ledger tracks synchronised marks for governed, shrunk, vetoed, and abstained trade candidates to measure exact rule-level alpha attribution without backfill bias.
            </p>
          </div>

          <div className="bg-[#EAEEDD] border border-black/15 p-4 min-w-[260px]">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">
              <span>Attribution Status</span>
              <span className="text-emerald-900 bg-white border border-black/10 px-1.5 py-0.5">
                ACTIVE
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-[#232323]">
              Synchronised Mark Engine
            </div>
            <div className="mt-1 text-xs text-[#74736A] font-mono">
              4 Windows · 0 Look-Ahead
            </div>
          </div>
        </motion.div>

        {/* Telemetry Stat Bar */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#EAEEDD] border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              01 · BENCHMARK PERIOD
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-[#232323] mt-1">
              2022 – 2026
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Out-of-sample walk forward</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              02 · SLIPPAGE MODEL
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-[#0B4FFF] mt-1">
              $0.02 / CONTRACT
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">+ 100% spread friction</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              03 · REGIMES TESTED
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-emerald-800 mt-1">
              3 VOL REGIMES
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Low, normal, and high VIX</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              04 · SHADOW TRACKING
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-[#232323] mt-1">
              4 DECISION LANES
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Governed, Shrunk, Vetoed, Abstained</span>
          </div>
        </motion.div>

        {/* 1. Decision Categories (Image 4 & 5 Style Cards) */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
            01 · SYNCHRONISED DECISION TRACKING
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SHADOW_CONCEPT.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.category}
                  className="bg-white border border-black/15 flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-bold text-[#232323]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${cat.tone}`}>
                        {cat.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-[#232323]" />
                      <h3 className="text-lg font-bold text-[#232323]">{cat.category}</h3>
                    </div>

                    <p className="text-xs text-[#74736A] leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  {/* Sharp Bottom Action Bar */}
                  <div className="flex items-stretch border-t border-black/15 bg-white">
                    <span className="flex-1 px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider text-[#232323]">
                      {cat.action}
                    </span>
                    <div className="w-10 h-10 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] text-[#232323]">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 2. Invariant Rule-Level Attribution Table Card */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 flex flex-col">
          <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15">
            <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
              02 · INVARIANT ATTRIBUTION MATRIX
            </div>
            <p className="text-xs text-[#74736A] font-mono mt-0.5">
              Exact downside prevention attributed to each active mathematical invariant.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#74736A] uppercase text-[10px] font-bold border-b border-black/10">
                  <th className="py-2.5 px-4 w-64">Invariant Rule</th>
                  <th className="py-2.5 px-4">Protection & Tail-Risk Reduction Effect</th>
                  <th className="py-2.5 px-4 w-40">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {ATTRIBUTION_RULES.map((r, i) => (
                  <tr key={i} className="hover:bg-[#FAF9F5] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0B4FFF]">
                      {r.rule}
                    </td>
                    <td className="py-3 px-4 text-[#232323] font-sans text-xs">
                      {r.saved}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white text-[#232323] border border-black/15">
                        {r.frequency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Card Footer */}
          <div className="flex items-stretch border-t border-black/15 bg-white">
            <div className="flex-1 px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#232323]">
              Continuous Tail-Risk Governance
            </div>
            <Link
              href="/proof"
              className="w-12 h-11 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] hover:bg-[#DDE2CF] text-[#232323] transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* 3. Walk-Forward Validation Configuration Card */}
        {validation && (
          <motion.div variants={itemVariants} className="bg-white border border-black/15 p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-black/15">
              <div>
                <h3 className="text-base font-bold text-[#232323]">{validation.title}</h3>
                <p className="text-xs text-[#74736A] font-mono mt-0.5">{validation.period}</p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-[#EAEEDD] text-emerald-900 border border-emerald-800/30">
                VERIFIED LANE C
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
              {validation.results.map((res, idx) => (
                <div key={idx} className="bg-[#FAF9F5] p-3 border border-black/10">
                  <span className="text-[#74736A] text-[9px] uppercase font-bold block">{res.label}</span>
                  <span className="font-bold text-[#232323] text-sm mt-1 block">{res.value}</span>
                  {res.note && <span className="text-[10px] text-[#74736A] mt-1 block">{res.note}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
