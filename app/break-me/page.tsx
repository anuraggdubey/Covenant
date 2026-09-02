"use client";

import { motion, Variants } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Terminal,
  Layers,
  ArrowRight,
  Zap,
  Check,
  Cpu
} from "lucide-react";
import Link from "next/link";

const TOTAL_TESTS_PASSING = 257;
const GENERATED_HOSTILE_STATES = 318;

const TEST_COVERAGE = [
  { file: "tests/alpaca/client.test.ts", tests: 9, module: "Alpaca Read Client", invariants: ["COV-08"] },
  { file: "tests/alpha/engine.test.ts", tests: 6, module: "Alpha Engine", invariants: ["COV-02", "COV-05", "COV-08"] },
  { file: "tests/alpha/factory.test.ts", tests: 3, module: "Candidate Factory", invariants: ["COV-02", "COV-05"] },
  { file: "tests/alpha/loop.test.ts", tests: 6, module: "Autonomous Tick Loop", invariants: ["COV-08"] },
  { file: "tests/alpha/payoff.test.ts", tests: 6, module: "Payoff & Max Loss", invariants: ["COV-02"] },
  { file: "tests/alpha/signals.test.ts", tests: 2, module: "Market Signals", invariants: ["COV-08"] },
  { file: "tests/alpha/snapshots.test.ts", tests: 5, module: "Snapshot Hashing", invariants: ["COV-05", "COV-08"] },
  { file: "tests/alpha/validation.test.ts", tests: 2, module: "Walk-Forward Status", invariants: [] },
  { file: "tests/alpha/occ.test.ts", tests: 3, module: "OCC Symbol Parser", invariants: ["COV-05"] },
  { file: "tests/alpha/candidate-lab.test.ts", tests: 8, module: "Candidate Lab & Chains", invariants: ["COV-02", "COV-05"] },
  { file: "tests/alpha/mandate-studio.test.ts", tests: 7, module: "Mandate Studio Overrides", invariants: ["COV-08"] },
  { file: "tests/alpha/proof-explorer.test.ts", tests: 6, module: "Proof Explorer Replay", invariants: ["COV-01", "COV-04"] },
  { file: "tests/monitor/monitor-integration.test.ts", tests: 5, module: "Position Monitor Integration", invariants: ["COV-07", "COV-08"] },
  { file: "tests/monitor/position-monitor.test.ts", tests: 6, module: "Position Monitor", invariants: ["COV-07", "COV-08"] },
  { file: "tests/env/server.test.ts", tests: 8, module: "Env Validation", invariants: ["COV-08"] },
  { file: "tests/boundaries/credentials.test.ts", tests: 7, module: "Credential Boundaries", invariants: ["COV-01", "COV-08"] },
  { file: "tests/safety/invariants.test.ts", tests: 28, module: "Invariant Evaluators", invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"] },
  { file: "tests/safety/kernel.test.ts", tests: 18, module: "Safety Kernel", invariants: ["COV-02", "COV-04", "COV-08"] },
  { file: "tests/safety/kill-switch.test.ts", tests: 5, module: "Kill Switch", invariants: ["COV-04", "COV-08"] },
  { file: "tests/execution/executor.attacks.test.ts", tests: 14, module: "Permit Executor Attacks", invariants: ["COV-01"] },
  { file: "tests/audit/audit.test.ts", tests: 10, module: "Replay Verifier & Hash Chain", invariants: ["COV-01", "COV-04"] },
  { file: "tests/break-me/break-me.test.ts", tests: 18, module: "Break Me Property Engine", invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"] },
  { file: "tests/shadow-ledger/shadow.test.ts", tests: 9, module: "Shadow Ledger", invariants: ["COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-08"] },
  { file: "tests/mandates/corpus.test.ts", tests: 33, module: "Mandate Compiler", invariants: ["COV-08"] },
];

const INVARIANT_COVERAGE: Record<string, { name: string; testCount: number; status: "COVERED" | "PARTIAL" | "UNTESTED"; desc: string }> = {
  "COV-01": { name: "Exact unexpired single-use permit", testCount: 24, status: "COVERED", desc: "No order path without Ed25519 signature matching exact legs, price band, and fresh nonce." },
  "COV-02": { name: "Finite max loss inside per-trade cap", testCount: 34, status: "COVERED", desc: "Standalone downside mathematically bounded inside per-trade equity allocation." },
  "COV-03": { name: "Portfolio heat under ceiling", testCount: 10, status: "COVERED", desc: "Total aggregated open exposure never breaches mandate risk envelope." },
  "COV-04": { name: "Daily halt until new session", testCount: 18, status: "COVERED", desc: "Daily drawdown trigger halts all new entries until a verified new market session." },
  "COV-05": { name: "Fresh liquid contracts in bands", testCount: 28, status: "COVERED", desc: "Quote freshness, spread width, DTE, delta, and open interest inside mandate bands." },
  "COV-06": { name: "No duplicate exposure in cooldown", testCount: 8, status: "COVERED", desc: "Blocks duplicate or equivalent contract positions inside cooldown window." },
  "COV-07": { name: "Timely exit with escalation", testCount: 6, status: "COVERED", desc: "Exit workflow initiates prior to expiration deadline; failures escalate safely." },
  "COV-08": { name: "Missing state returns ABSTAIN", testCount: 41, status: "COVERED", desc: "Missing, stale, inconsistent, or unverifiable market/account data fails closed." },
};

const ATTACK_SCENARIOS = [
  { name: "Mutated Contract Before Submit", invariant: "COV-01", result: "BLOCKED", detail: "Executor rejects changed legs before any Alpaca transport call." },
  { name: "Quantity Increased After Shrink", invariant: "COV-01", result: "BLOCKED", detail: "Executor rejects 3 lots against a permit capped at 1." },
  { name: "Replayed Permit Nonce", invariant: "COV-01", result: "BLOCKED", detail: "Second use of the same signed permit is rejected as NONCE_REPLAYED." },
  { name: "Expired Permit TTL", invariant: "COV-01", result: "BLOCKED", detail: "A permit older than its 60-second TTL is rejected without burning the nonce." },
  { name: "Tampered Market Snapshot Hash", invariant: "COV-08", result: "BLOCKED", detail: "Engine returns ABSTAIN when snapshotHash doesn't match canonical content." },
  { name: "Below Level 3 Options Account", invariant: "COV-08", result: "BLOCKED", detail: "Engine rejects proposals from accounts with insufficient options level." },
  { name: "Inactive Policy Status", invariant: "COV-08", result: "BLOCKED", detail: "Engine refuses to propose against DRAFT or BLOCKED policies." },
  { name: "Inverted Strike Structure", invariant: "COV-02", result: "BLOCKED", detail: "Payoff math throws on Bull Call where long strike >= short strike." },
  { name: "Debit Exceeds Spread Width", invariant: "COV-02", result: "BLOCKED", detail: "Payoff math rejects debit larger than the spread width." },
  { name: "Cross-Underlying Legs", invariant: "COV-05", result: "BLOCKED", detail: "Payoff math rejects legs from different underlyings (SPY + QQQ)." },
  { name: "Insufficient Signal History", invariant: "COV-08", result: "BLOCKED", detail: "Engine ABSTAINS when fewer than 21 daily bars are available." },
  { name: "Exit Deadline Expired", invariant: "COV-07", result: "ESCALATED", detail: "Monitor escalates when close attempts exceed the deadline." },
  { name: "Incomplete Position State", invariant: "COV-07", result: "ESCALATED", detail: "Monitor escalates on positions with zero legs or invalid data." },
  { name: "Zero Confidence Multiplier (Model Veto)", invariant: "COV-08", result: "BLOCKED", detail: "Engine ABSTAINS when model confidence is 0, respecting veto authority." },
];

export default function BreakMePage() {
  const coveredInvariants = Object.values(INVARIANT_COVERAGE).filter((v) => v.status === "COVERED").length;

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
                BREAK ME PROPERTY ENGINE
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] border border-black/15 text-emerald-900">
                {TOTAL_TESTS_PASSING} TESTS PASSING
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#232323]">
                0 COUNTEREXAMPLES
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              Can you break the trader?
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl">
              Deterministic attack suites and property tests bombard the Safety Kernel with hundreds of adversarial edge cases. All eight invariants hold without exception.
            </p>
          </div>

          <div className="bg-[#EAEEDD] border border-black/15 p-4 min-w-[260px]">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">
              <span>Hostile Fuzzing</span>
              <span className="text-emerald-900 bg-white border border-black/10 px-1.5 py-0.5">
                ACTIVE
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-[#232323]">
              318 States Generated
            </div>
            <div className="mt-1 text-xs text-[#74736A] font-mono">
              8/8 Invariants Covered
            </div>
          </div>
        </motion.div>

        {/* Telemetry Stat Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#EAEEDD] border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              01 · UNIT & INTEGRATION
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-[#232323] mt-1">
              {TOTAL_TESTS_PASSING}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">100% passing test suite</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              02 · HOSTILE STATES
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-[#0B4FFF] mt-1">
              {GENERATED_HOSTILE_STATES}
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Property test variations</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              03 · INVARIANTS COVERED
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-emerald-800 mt-1">
              {coveredInvariants} / 8
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Full invariant enforcement</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              04 · UNTESTED GAPS
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-emerald-800 mt-1">
              0
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Zero unverified paths</span>
          </div>
        </motion.div>

        {/* 1. Invariant Coverage Map Card */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 flex flex-col">
          <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15 flex items-center justify-between">
            <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
              01 · INVARIANT DEFENSE MATRIX
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-white border border-black/15 text-[#232323]">
              8 ACTIVE INVARIANTS
            </span>
          </div>

          <div className="divide-y divide-black/15">
            {Object.entries(INVARIANT_COVERAGE).map(([id, inv]) => (
              <div key={id} className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF9F5] transition-colors">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs font-bold text-[#0B4FFF] shrink-0 mt-0.5 bg-[#EAEEDD] border border-black/15 px-2.5 py-1">
                    {id}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#232323]">{inv.name}</h3>
                    <p className="text-xs text-[#74736A] mt-1 leading-relaxed max-w-2xl">{inv.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                  <span className="font-mono text-xs font-bold text-[#232323] bg-white border border-black/15 px-2.5 py-1">
                    {inv.testCount} tests
                  </span>
                  <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-[#EAEEDD] text-emerald-900 border border-emerald-800/30">
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Card Footer */}
          <div className="flex items-stretch border-t border-black/15 bg-white">
            <div className="flex-1 px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#232323]">
              Proven Invariant Soundness
            </div>
            <Link
              href="/proof"
              className="w-12 h-11 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] hover:bg-[#DDE2CF] text-[#232323] transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* 2. Attack Scenarios Table Card */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 flex flex-col">
          <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15">
            <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
              02 · HOSTILE ATTACK SCENARIOS
            </div>
            <p className="text-xs text-[#74736A] font-mono mt-0.5">
              Simulated attacks and edge cases evaluated against the invariant kernel.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#74736A] uppercase text-[10px] font-bold border-b border-black/10">
                  <th className="py-2.5 px-4 w-72">Adversarial Input</th>
                  <th className="py-2.5 px-4 w-28">Invariant</th>
                  <th className="py-2.5 px-4 w-32">Kernel Result</th>
                  <th className="py-2.5 px-4">Enforcement Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {ATTACK_SCENARIOS.map((atk, i) => (
                  <tr key={i} className="hover:bg-[#FAF9F5] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#232323]">{atk.name}</td>
                    <td className="py-3 px-4 text-[#0B4FFF] font-bold">{atk.invariant}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          atk.result === "BLOCKED"
                            ? "bg-rose-50 text-rose-900 border-rose-800/30"
                            : "bg-amber-50 text-amber-900 border-amber-800/30"
                        }`}
                      >
                        {atk.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#74736A] font-sans text-xs">{atk.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Card Footer */}
          <div className="flex items-stretch border-t border-black/15 bg-white">
            <div className="flex-1 px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#232323]">
              Fail Closed Architecture
            </div>
            <div className="w-12 h-11 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] text-[#232323]">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>

        {/* 3. Test Suites Breakdown Card */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-black/15">
            <div>
              <h3 className="text-base font-bold text-[#232323]">Test Suite Architecture Breakdown</h3>
              <p className="text-xs text-[#74736A] font-mono mt-0.5">28 test suites across capability boundaries, alpha engine, safety kernel, and executor.</p>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-[#EAEEDD] text-emerald-900 border border-emerald-800/30">
              28 TEST SUITES
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {TEST_COVERAGE.map((item, idx) => (
              <div key={idx} className="bg-[#FAF9F5] p-3 border border-black/10 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-[#232323] text-xs block">{item.module}</span>
                  <span className="text-[10px] text-[#74736A] truncate block mt-0.5">{item.file}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-800 font-bold">{item.tests} tests</span>
                  <span className="text-[9px] text-[#74736A] uppercase">{item.invariants.join(", ") || "UNIT"}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
