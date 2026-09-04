"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { 
  BrainCircuit, 
  ShieldCheck, 
  Terminal, 
  Lock, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  FileCode,
  Zap,
  Check,
  Flame,
  Clock,
  ShieldAlert
} from "lucide-react";

const INVARIANTS = [
  { id: "COV-01", name: "Valid Permit Binding", rule: "Order must match an unexpired, unused Ed25519 cryptographic permit.", stage: "Permit Executor" },
  { id: "COV-02", name: "Defined-Risk Max Loss", rule: "Max loss mathematically bounded before entry; naked options rejected at compile time.", stage: "Safety Kernel" },
  { id: "COV-03", name: "Portfolio Heat Cap", rule: "Aggregate open dollar risk across all positions cannot exceed mandate heat limit.", stage: "Safety Kernel" },
  { id: "COV-04", name: "Daily Halt Lockout", rule: "Breaching daily loss trips irreversible halt (ACTIVE → HALTED) cleared only on new session.", stage: "Session Monitor" },
  { id: "COV-05", name: "Market Hygiene Bands", rule: "Enforces fresh quotes (<15s), maximum bid-ask spread width, and delta bounds (0.15–0.45).", stage: "Safety Kernel" },
  { id: "COV-06", name: "Duplicate Cooldown", rule: "Blocks duplicate or correlated spread entries within specified cooldown intervals.", stage: "Safety Kernel" },
  { id: "COV-07", name: "Exit Escalation Order", rule: "Initiates automated exit workflows prior to expiration deadlines to prevent assignment.", stage: "Position Monitor" },
  { id: "COV-08", name: "Fail-Closed State", rule: "Any missing, stale, or inconsistent state deterministically triggers ABSTAIN. Never guess.", stage: "All Stages" },
];

export default function WriteUpPage() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  };

  return (
    <div className="flex-1 w-full bg-[#F0EFE3] min-h-screen text-[#232323]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-16 flex flex-col gap-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-black/15">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#232323]">
                HACKATHON SUBMISSION · ONE-PAGE WRITE-UP
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] border border-black/15 text-emerald-900">
                ALPACA AUTONOMOUS AGENTS
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-blue-50 border border-black/15 text-blue-900">
                PAPER ONLY
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              Covenant Architecture Write-Up
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl leading-relaxed">
              Autonomous options trading on SPY and QQQ governed by mathematical proofs, compile-time policy validation, and cryptographically signed authority permits before any order touches Alpaca.
            </p>
          </div>

          <div className="bg-[#EAEEDD] border border-black/15 p-4 min-w-[280px]">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">
              <span>Authority Boundary</span>
              <span className="text-[#0B4FFF] bg-white border border-black/10 px-1.5 py-0.5">
                ISOLATED KERNEL
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-[#232323]">
              Ed25519 Signed Permits (60s TTL)
            </div>
            <div className="mt-1 text-xs text-[#74736A] font-mono">
              Model Authority: draft | veto | shrink | explain
            </div>
          </div>
        </motion.div>

        {/* SECTION 1: AI LOGIC */}
        <motion.div variants={itemVariants} className="bg-[#EAEEDD] border border-black/15">
          <div className="p-6 md:p-8 border-b border-black/15 bg-[#EAEEDD] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white border border-black/15 text-[#0B4FFF]">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-medium text-[#232323] tracking-tight">
                  1. AI Logic Implementation
                </h2>
                <p className="text-xs text-[#74736A]">
                  Natural language mandate compilation, strict authority boundaries & candidate ranking
                </p>
              </div>
            </div>
            <span className="inline-flex self-start md:self-auto items-center px-2.5 py-1 text-xs font-mono font-bold bg-white border border-black/15 text-[#232323]">
              lib/ai/ · lib/mandates/ · lib/alpha/
            </span>
          </div>

          <div className="p-6 md:p-8 bg-[#F0EFE3] flex flex-col gap-6">
            <p className="text-sm text-[#232323] leading-relaxed">
              Covenant treats AI models as untrusted analytical components operating under a strict capability fence: <code className="font-mono text-xs bg-white border border-black/15 px-1.5 py-0.5 text-[#232323]">draft | veto | shrink | explain</code>. Models can never activate policies, sign permits, submit orders, widen risk, or author OCC option symbols.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-black/15 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#232323] mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0B4FFF]" /> Mandate Compilation & Copilot
                  </div>
                  <p className="text-xs text-[#74736A] leading-relaxed">
                    Traders declare mandates in unconstrained natural language. The AI Copilot (<code className="text-[#232323] font-mono">lib/ai/client.ts</code>) drafts structured parameters, which Covenant's compiler (<code className="text-[#232323] font-mono">lib/mandates/compile.ts</code>) transforms into typed, versioned <code className="text-[#232323] font-mono">Policy</code> JSON. Contradictions (e.g. forced trade frequency vs. fail-closed abstention) are blocked at compile time.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono text-[#74736A]">
                  <span>Compile-time verification</span>
                  <span className="text-emerald-800 font-semibold">4 Contradiction Classes</span>
                </div>
              </div>

              <div className="bg-white border border-black/15 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#232323] mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0B4FFF]" /> Algorithmic Alpha & 1,000-Run Monte Carlo
                  </div>
                  <p className="text-xs text-[#74736A] leading-relaxed">
                    Rather than letting an LLM hallucinate option legs, a deterministic factory (<code className="text-[#232323] font-mono">lib/alpha/</code>) constructs valid vertical spreads (bull call / bear put debit & credit spreads) from live chains. Spreads are evaluated using Black-Scholes Greeks, liquidity bands, and 1,000-scenario Monte Carlo simulations to rank candidates by risk-adjusted expectancy net of slippage.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono text-[#74736A]">
                  <span>Alpha Engine</span>
                  <span className="text-[#0B4FFF] font-semibold">Deterministic Payoff Math</span>
                </div>
              </div>

              <div className="bg-white border border-black/15 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#232323] mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0B4FFF]" /> Multi-Factor AI Risk Audits
                  </div>
                  <p className="text-xs text-[#74736A] leading-relaxed">
                    Candidate spreads are audited by secondary LLM passes (<code className="text-[#232323] font-mono">auditCandidateRisk</code>) that evaluate macroeconomic catalysts and volatility regime shifts, while an explanation generator (<code className="text-[#232323] font-mono">explainCandidate</code>) renders quantitative trade rationale into transparent English for the operator.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono text-[#74736A]">
                  <span>Risk Explainer</span>
                  <span className="text-purple-800 font-semibold">Human-Readable Audits</span>
                </div>
              </div>

              <div className="bg-white border border-black/15 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#232323] mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0B4FFF]" /> Adversarial Self-Fuzzing ("Break Me")
                  </div>
                  <p className="text-xs text-[#74736A] leading-relaxed">
                    Prior to policy activation, a dedicated fuzzing engine (<code className="text-[#232323] font-mono">lib/break-me/</code>) bombards policies with 318 generated hostile market scenarios (flash crashes, stale quotes, zero-bid anomalies, volatility spikes) to mathematically verify that invariant boundaries hold under stress.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-mono text-[#74736A]">
                  <span>Break Me Engine</span>
                  <span className="text-rose-800 font-semibold">318 Hostile Scenarios</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SECTION 2: RISK GATES */}
        <motion.div variants={itemVariants} className="bg-[#EAEEDD] border border-black/15">
          <div className="p-6 md:p-8 border-b border-black/15 bg-[#EAEEDD] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white border border-black/15 text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-medium text-[#232323] tracking-tight">
                  2. Risk Gates & Mathematical Invariants
                </h2>
                <p className="text-xs text-[#74736A]">
                  The eight runtime invariants (COV-01 – COV-08) & cryptographic authority permits
                </p>
              </div>
            </div>
            <span className="inline-flex self-start md:self-auto items-center px-2.5 py-1 text-xs font-mono font-bold bg-white border border-black/15 text-emerald-900">
              lib/safety/ · lib/permits/
            </span>
          </div>

          <div className="p-6 md:p-8 bg-[#F0EFE3] flex flex-col gap-6">
            <p className="text-sm text-[#232323] leading-relaxed">
              Every candidate intent must pass an isolated <strong>Safety Kernel</strong> (<code className="font-mono text-xs bg-white border border-black/15 px-1.5 py-0.5 text-[#232323]">lib/safety/kernel.ts</code>) that re-fetches authoritative account equity and option market data directly before evaluation.
            </p>

            <div className="overflow-x-auto border border-black/15 bg-white">
              <table className="w-full text-left text-xs divide-y divide-black/10">
                <thead className="bg-[#EAEEDD] text-[10px] font-mono font-bold uppercase tracking-wider text-[#74736A]">
                  <tr>
                    <th className="py-2.5 px-3">Invariant</th>
                    <th className="py-2.5 px-3">Formal Name</th>
                    <th className="py-2.5 px-3">Enforced Rule & Mechanism</th>
                    <th className="py-2.5 px-3 text-right">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 text-[#232323]">
                  {INVARIANTS.map((inv) => (
                    <tr key={inv.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{inv.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#232323]">{inv.name}</td>
                      <td className="py-2.5 px-3 text-[#5F5E56] font-mono text-[11px] leading-relaxed">{inv.rule}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[10px] text-[#74736A] uppercase">{inv.stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-black/15 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-[#232323]">
                  <Lock className="w-4 h-4 text-emerald-700" /> Ephemeral Cryptographic Authority Permits (TradePermit)
                </div>
                <p className="text-xs text-[#5F5E56] leading-relaxed max-w-3xl">
                  Approved trades receive a 60-second TTL Ed25519-signed permit (<code className="text-[#232323] font-mono">lib/permits/sign.ts</code>) bound to exact OCC option legs, quantities, limit price bands, account equity snapshot hash, and policy hash. Single-use nonces prevent replay attacks; any alteration to order parameters invalidates the signature.
                </p>
              </div>
              <div className="shrink-0 font-mono text-xs border border-emerald-800/20 bg-emerald-50 text-emerald-900 px-3 py-1.5 font-bold">
                Ed25519 · 60s TTL
              </div>
            </div>
          </div>
        </motion.div>

        {/* SECTION 3: ALPACA INFRASTRUCTURE */}
        <motion.div variants={itemVariants} className="bg-[#EAEEDD] border border-black/15">
          <div className="p-6 md:p-8 border-b border-black/15 bg-[#EAEEDD] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white border border-black/15 text-[#0B4FFF]">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-medium text-[#232323] tracking-tight">
                  3. Alpaca Infrastructure Implementation
                </h2>
                <p className="text-xs text-[#74736A]">
                  Physical capability isolation, paper trading enforcement & multi-leg execution
                </p>
              </div>
            </div>
            <span className="inline-flex self-start md:self-auto items-center px-2.5 py-1 text-xs font-mono font-bold bg-white border border-black/15 text-blue-900">
              lib/execution/ · lib/alpaca/
            </span>
          </div>

          <div className="p-6 md:p-8 bg-[#F0EFE3] flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-black/15 p-5 space-y-2">
                <h3 className="font-bold text-sm text-[#232323]">Physical Capability Isolation</h3>
                <p className="text-xs text-[#5F5E56] leading-relaxed">
                  <code className="text-[#232323] font-mono">ALPACA_API_SECRET_KEY</code> is isolated strictly to <code className="text-[#232323] font-mono">lib/execution/executor.ts</code> (order writes) and <code className="text-[#232323] font-mono">lib/alpaca/client.ts</code> (read-only data). Strategy/alpha modules and the browser have zero access to broker keys or signing secrets, continuously verified by 27 automated capability audit checks (<code className="text-[#232323] font-mono">npm run audit</code>).
                </p>
              </div>

              <div className="bg-white border border-black/15 p-5 space-y-2">
                <h3 className="font-bold text-sm text-[#232323]">Paper-Trading Only by Construction</h3>
                <p className="text-xs text-[#5F5E56] leading-relaxed">
                  Transport endpoints are hard-locked to <code className="text-[#232323] font-mono">https://paper-api.alpaca.markets</code> and <code className="text-[#232323] font-mono">https://data.alpaca.markets</code>. Live endpoints are not configured, not allowlisted, and structurally unreachable. Any non-paper endpoint causes immediate fail-closed termination.
                </p>
              </div>

              <div className="bg-white border border-black/15 p-5 space-y-2">
                <h3 className="font-bold text-sm text-[#232323]">Market Data & Multi-Leg Order Flow</h3>
                <p className="text-xs text-[#5F5E56] leading-relaxed">
                  Ingests real-time SPY/QQQ option chain snapshots, quotes, and bars via Alpaca Market Data v2. Executes atomic multi-leg vertical spreads using Alpaca’s <code className="text-[#232323] font-mono">order_class: "mleg"</code> with exact OCC leg ratios, limit prices, and deterministic client order IDs derived from permit nonces.
                </p>
              </div>

              <div className="bg-white border border-black/15 p-5 space-y-2">
                <h3 className="font-bold text-sm text-[#232323]">Deterministic Replay & Shadow Ledger</h3>
                <p className="text-xs text-[#5F5E56] leading-relaxed">
                  Every quote snapshot, intent, permit, and Alpaca fill is SHA-256 hash-chained in an append-only event journal. Allows offline verification without network or credentials (<code className="text-[#232323] font-mono">npm run verify</code>). A counterfactual Shadow Ledger tracks vetoed intents to quantify the exact dollar P&L saved or foregone by each invariant.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer Links & Navigation */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-black/15 text-xs text-[#74736A]">
          <div className="flex items-center gap-2">
            <span>Repository source:</span>
            <a 
              href="https://github.com/anuraggdubey/Covenant/blob/main/WRITEUP.md" 
              target="_blank" 
              rel="noreferrer"
              className="text-[#0B4FFF] hover:underline inline-flex items-center gap-1 font-mono font-bold"
            >
              WRITEUP.md <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <Link href="/mandates" className="hover:text-[#232323] transition-colors">Mandates</Link>
            <Link href="/candidates" className="hover:text-[#232323] transition-colors">Candidates</Link>
            <Link href="/permits" className="hover:text-[#232323] transition-colors">Permits</Link>
            <Link href="/execution" className="hover:text-[#232323] transition-colors">Execution</Link>
            <Link href="/break-me" className="hover:text-[#232323] transition-colors">Break Me</Link>
            <Link href="/proof" className="hover:text-[#232323] transition-colors">Proof</Link>
            <Link href="/shadow-ledger" className="hover:text-[#232323] transition-colors">Shadow Ledger</Link>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
