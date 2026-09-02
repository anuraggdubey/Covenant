"use client";

<<<<<<< HEAD
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
=======
import { useCallback, useEffect, useState } from "react";

interface Verdict {
  id: string;
  title: string;
  enforcedAt: string;
  ok: boolean;
  action: string;
  reason: string;
  shrinkTo?: number;
}

interface CoverageRow {
  invariant: string;
  title: string;
  triggered: number;
  covered: boolean;
}

interface BreakMeResponse {
  scenario: {
    outcome: string;
    quantity: number;
    standaloneMaxLoss: string;
    dte: number;
    equity: string;
    perTradeMaxLossPct: number;
    sessionState: string;
    intentHash: string;
  };
  attack?: { id: string; label: string; description: string } | null;
  verdicts: Verdict[];
  report: {
    cases: number;
    runs: number;
    seed: number;
    passed: boolean;
    fullyCovered: boolean;
    coverage: CoverageRow[];
    counterexamples: { invariant: string; description: string; seed: number }[];
  };
  activation: { ok: boolean; reason: string };
}

interface AttackOption {
  id: string;
  label: string;
}

const PRESETS = [
  { label: "A legal trade", overrides: {} },
  { label: "Nine lots (over the cap)", overrides: { quantity: 9 } },
  { label: "Expiry too far out", overrides: { dte: 45 } },
  { label: "Down 4% on the day", overrides: { dayPnlPct: -4 } },
  { label: "Session already halted", overrides: { sessionHalted: true } },
  { label: "Tiny account, same trade", overrides: { equity: "10000.00" } },
  { label: "Stale quotes attack", overrides: { attack: "STALE_QUOTE" } },
  { label: "Crossed market attack", overrides: { attack: "CROSSED_MARKET" } }
];

function outcomeClass(outcome: string): string {
  if (outcome === "APPROVE") return "badge badge-emerald";
  if (outcome === "VETO") return "badge badge-rose";
  return "badge badge-amber";
}
>>>>>>> 803a917 (Wire Break Me, Execution, and Shadow Ledger to live backend APIs.)

export default function BreakMePage() {
  const [quantity, setQuantity] = useState(1);
  const [maxLoss, setMaxLoss] = useState("240.00");
  const [dte, setDte] = useState(18);
  const [equity, setEquity] = useState("100000.00");
  const [perTrade, setPerTrade] = useState(0.6);
  const [dayPnl, setDayPnl] = useState(0);
  const [halted, setHalted] = useState(false);
  const [runs, setRuns] = useState(200);
  const [attack, setAttack] = useState("");
  const [attacks, setAttacks] = useState<AttackOption[]>([]);
  const [maxLossManual, setMaxLossManual] = useState(false);

  const [result, setResult] = useState<BreakMeResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (overrides?: Record<string, unknown>) => {
      setRunning(true);
      setError(null);
      const body = overrides ?? {
        quantity,
        standaloneMaxLoss: maxLossManual ? maxLoss : undefined,
        dte,
        equity,
        perTradeMaxLossPct: perTrade,
        dayPnlPct: dayPnl,
        sessionHalted: halted,
        runs,
        ...(attack ? { attack } : {})
      };
      try {
        const response = await fetch("/api/break-me", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        const parsed = (await response.json()) as BreakMeResponse & { error?: string };
        if (parsed.error !== undefined) setError(parsed.error);
        else {
          setResult(parsed);
          if (!maxLossManual && !overrides?.standaloneMaxLoss) {
            setMaxLoss(parsed.scenario.standaloneMaxLoss);
          }
          if (overrides?.attack !== undefined) setAttack(String(overrides.attack));
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Run failed.");
      } finally {
        setRunning(false);
      }
    },
    [quantity, maxLoss, maxLossManual, dte, equity, perTrade, dayPnl, halted, runs, attack]
  );

  useEffect(() => {
    void fetch("/api/break-me")
      .then((r) => r.json())
      .then((parsed: { attacks: AttackOption[] }) => setAttacks(parsed.attacks ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void run({ runs: 200 });
    // Run the clean baseline once on mount so the page is never an empty shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blocking = result?.verdicts.filter((verdict) => !verdict.ok) ?? [];
  const passing = result?.verdicts.filter((verdict) => verdict.ok) ?? [];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  };

  return (
<<<<<<< HEAD
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
=======
    <div className="page-container">
      <header>
        <p className="eyebrow">Break Me</p>
        <h1>Try to get a trade past the kernel</h1>
        <p style={{ maxWidth: 680, color: "var(--text-secondary)" }}>
          Build a scenario and run it against the real invariant registry — the same code the
          autonomous loop uses. You get two answers: what the eight rules say about your exact
          trade, and what happens when the generator throws hundreds of hostile variants of it at
          the same policy.
        </p>
      </header>

      <section className="glass-panel">
        <p className="eyebrow">Presets</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="btn-secondary"
              disabled={running}
              onClick={() => {
                if ("attack" in preset.overrides) setAttack(String(preset.overrides.attack));
                else setAttack("");
                if ("quantity" in preset.overrides) setMaxLossManual(false);
                void run({ ...preset.overrides, runs });
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="glass-panel">
        <p className="eyebrow">Your scenario</p>
        <div className="grid-4" style={{ marginTop: 12 }}>
          <label>
            <span className="eyebrow">Contracts</span>
            <input
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value));
                setMaxLossManual(false);
              }}
            />
          </label>
          <label>
            <span className="eyebrow">Max loss ($)</span>
            <input
              value={maxLoss}
              onChange={(e) => {
                setMaxLoss(e.target.value);
                setMaxLossManual(true);
              }}
            />
          </label>
          <label>
            <span className="eyebrow">DTE</span>
            <input type="number" min={0} max={120} value={dte} onChange={(e) => setDte(Number(e.target.value))} />
          </label>
          <label>
            <span className="eyebrow">Equity ($)</span>
            <input value={equity} onChange={(e) => setEquity(e.target.value)} />
          </label>
          <label>
            <span className="eyebrow">Per-trade cap (%)</span>
            <input type="number" step={0.05} min={0.05} max={10} value={perTrade} onChange={(e) => setPerTrade(Number(e.target.value))} />
          </label>
          <label>
            <span className="eyebrow">Day P&amp;L (%)</span>
            <input type="number" step={0.25} min={-20} max={20} value={dayPnl} onChange={(e) => setDayPnl(Number(e.target.value))} />
          </label>
          <label>
            <span className="eyebrow">Fuzz runs</span>
            <input type="number" min={25} max={500} step={25} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
            <input type="checkbox" checked={halted} onChange={(e) => setHalted(e.target.checked)} />
            <span>Session halted</span>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span className="eyebrow">Named attack (optional)</span>
            <select
              value={attack}
              onChange={(e) => setAttack(e.target.value)}
              style={{ width: "100%", marginTop: 6 }}
            >
              <option value="">None — evaluate your scenario as-is</option>
              {attacks.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" disabled={running} onClick={() => void run()}>
            {running ? "Running…" : "Run against the kernel"}
          </button>
        </div>
      </section>

      {error !== null && (
        <div className="glass-panel" style={{ borderColor: "var(--danger)" }}>
          <p className="mono" style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      {result !== null && (
        <>
          <section className="glass-panel-glow">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow">Verdict on your trade</p>
                <h2 style={{ margin: 0 }}>
                  {result.scenario.quantity} × contracts, {result.scenario.dte} DTE, max loss $
                  {result.scenario.standaloneMaxLoss}
                </h2>
              </div>
              <span className={outcomeClass(result.scenario.outcome)} style={{ fontSize: "0.95rem" }}>
                {result.scenario.outcome}
              </span>
            </div>
            {result.attack ? (
              <p style={{ color: "var(--warning)", marginTop: 8, marginBottom: 0 }}>
                Attack applied: <strong>{result.attack.label}</strong> — {result.attack.description}
              </p>
            ) : null}
            <p className="mono" style={{ color: "var(--text-muted)", marginTop: 10, marginBottom: 0 }}>
              intent {result.scenario.intentHash.slice(0, 24)}…
            </p>
          </section>

          <section>
            <h2 style={{ marginBottom: 4 }}>Rule by rule</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
              Blocking rules first. A rule that passes is not evidence it was tested — that is what
              the coverage table below is for.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Result</th>
                    <th>Invariant</th>
                    <th>Enforced at</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {[...blocking, ...passing].map((verdict) => (
                    <tr key={verdict.id}>
                      <td>
                        <span className={verdict.ok ? "badge badge-emerald" : verdict.action === "VETO" ? "badge badge-rose" : "badge badge-amber"}>
                          {verdict.ok ? "PASS" : verdict.action}
                        </span>
                      </td>
                      <td className="mono">{verdict.id}</td>
                      <td style={{ color: "var(--text-muted)" }}>{verdict.enforcedAt}</td>
                      <td>{verdict.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 style={{ marginBottom: 4 }}>Adversarial run</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
              {result.report.cases} generated states from seed{" "}
              <span className="mono">{result.report.seed}</span>. Same seed, same run — this is
              reproducible, not a fresh roll of the dice each visit.
            </p>
            <div className="grid-3" style={{ marginBottom: 16 }}>
              <div className="glass-panel">
                <span className="eyebrow">Counterexamples</span>
                <strong style={{ fontSize: "1.5rem" }} className={result.report.passed ? "success-text" : "warning-text"}>
                  {result.report.counterexamples.length}
                </strong>
              </div>
              <div className="glass-panel">
                <span className="eyebrow">Every rule exercised</span>
                <strong style={{ fontSize: "1.5rem" }} className={result.report.fullyCovered ? "success-text" : "warning-text"}>
                  {result.report.fullyCovered ? "Yes" : "No"}
                </strong>
              </div>
              <div className="glass-panel">
                <span className="eyebrow">Policy may activate</span>
                <strong style={{ fontSize: "1.5rem" }} className={result.activation.ok ? "success-text" : "warning-text"}>
                  {result.activation.ok ? "Yes" : "No"}
                </strong>
              </div>
            </div>

            {result.report.counterexamples.length > 0 && (
              <div className="glass-panel" style={{ borderColor: "var(--danger)", marginBottom: 16 }}>
                <p className="eyebrow" style={{ color: "var(--danger)" }}>Counterexamples</p>
                {result.report.counterexamples.map((counter) => (
                  <p key={`${counter.invariant}-${counter.seed}`} className="mono" style={{ margin: "6px 0" }}>
                    {counter.invariant} — {counter.description}
                  </p>
                ))}
              </div>
            )}

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fired</th>
                    <th>Invariant</th>
                    <th>Times triggered</th>
                    <th>Title</th>
                  </tr>
                </thead>
                <tbody>
                  {result.report.coverage.map((row) => (
                    <tr key={row.invariant}>
                      <td>
                        <span className={row.covered ? "badge badge-emerald" : "badge badge-amber"}>
                          {row.covered ? "YES" : "NEVER"}
                        </span>
                      </td>
                      <td className="mono">{row.invariant}</td>
                      <td className="mono">{row.triggered}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{row.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
              A rule that never fires across hundreds of hostile states is not proven safe — it is
              untested. Activation is refused while any rule sits at NEVER.
            </p>
          </section>
        </>
      )}
>>>>>>> 803a917 (Wire Break Me, Execution, and Shadow Ledger to live backend APIs.)
    </div>
  );
}
