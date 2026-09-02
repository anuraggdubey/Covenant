"use client";

import { motion, Variants } from "framer-motion";
import {
  FileKey2,
  ShieldCheck,
  Lock,
  Clock,
  Key,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Layers,
  FileCode2,
  Terminal,
  Zap,
  Check
} from "lucide-react";
import Link from "next/link";

type StepStatus = "IMPLEMENTED" | "BLOCKED";

const PERMIT_FLOW: {
  step: number;
  name: string;
  owner: string;
  description: string;
  status: StepStatus;
  evidence: string;
}[] = [
  {
    step: 1,
    name: "TradeIntent created",
    owner: "Alpha Engine",
    description:
      "Proposes a defined-risk vertical spread with a canonical intentHash. Holds no broker credential and cannot submit anything.",
    status: "IMPLEMENTED",
    evidence: "lib/alpha/engine.ts"
  },
  {
    step: 2,
    name: "Safety Kernel evaluation",
    owner: "Safety Kernel",
    description:
      "Re-fetches account and market state rather than trusting the caller. Evaluates COV-01 through COV-08 and returns APPROVE, SHRINK, VETO or ABSTAIN.",
    status: "IMPLEMENTED",
    evidence: "lib/safety/kernel.ts"
  },
  {
    step: 3,
    name: "Ed25519 permit signing",
    owner: "Permit Signer",
    description:
      "Signs a TradePermit with a 60-second TTL, single-use nonce, exact legs, quantity ceiling and price band. The only file in the repository that reads the private key.",
    status: "IMPLEMENTED",
    evidence: "lib/permits/sign.ts"
  },
  {
    step: 4,
    name: "Permit verification",
    owner: "Permit Executor",
    description:
      "Recomputes the intent hash and re-verifies the signature rather than trusting the kernel. Fourteen checks, every one of them before any network call.",
    status: "IMPLEMENTED",
    evidence: "lib/execution/executor.ts"
  },
  {
    step: 5,
    name: "Alpaca order submission",
    owner: "Permit Executor",
    description:
      "Submits order_class: 'mleg' to Alpaca paper and records order_id and X-Request-ID. The code path is written and tested against a recording transport.",
    status: "BLOCKED",
    evidence: "Blocked on paper credentials and Level 3 options approval"
  }
];

const ATTACKS = [
  {
    attack: "Swap a contract for a different strike",
    rejection: "INTENT_TAMPERED / INTENT_HASH_MISMATCH",
    note: "Caught whether or not the attacker recomputes the intent hash."
  },
  {
    attack: "Edit the permit's legs directly",
    rejection: "SIGNATURE_INVALID",
    note: "The signature covers the permit body."
  },
  {
    attack: "Submit 3 lots against a permit shrunk to 1",
    rejection: "QUANTITY_EXCEEDS_PERMIT",
    note: "A shrink can never be undone."
  },
  {
    attack: "Replay a permit that already traded",
    rejection: "NONCE_REPLAYED",
    note: "The nonce is consumed immediately before the network call."
  },
  {
    attack: "Wait past the 60-second TTL",
    rejection: "PERMIT_EXPIRED",
    note: "Authority is not durable. The nonce is not burned on rejection."
  },
  {
    attack: "Present a permit this kernel never issued",
    rejection: "NONCE_UNKNOWN",
    note: "A forged permit has no registered nonce."
  }
];

const PERMIT_FIELDS = [
  { field: "permitId", type: "string", description: "Unique permit identifier" },
  { field: "policyId + policyVersion + policyHash", type: "string", description: "Bound to one exact policy version" },
  { field: "intentHash", type: "string", description: "SHA-256 of the TradeIntent — tamper-evident" },
  { field: "accountSnapshotHash", type: "string", description: "Account state at evaluation time" },
  { field: "marketSnapshotHash", type: "string", description: "Market state at evaluation time" },
  { field: "exactLegs[]", type: "Leg[]", description: "Immutable contract symbols, sides, ratios" },
  { field: "maxQuantity", type: "number", description: "A SHRINK may only reduce, never increase" },
  { field: "limitPriceBand", type: "{ min, max }", description: "Submitted price must fall inside it" },
  { field: "expiresAt", type: "ISO string", description: "60-second TTL — a permit cannot outlive its freshness" },
  { field: "nonce", type: "string", description: "Single-use. A replayed nonce is rejected" },
  { field: "signature", type: "Ed25519", description: "Over canonical JSON, excluding this field" }
];

const PROPERTIES = [
  {
    title: "Tamper-evident",
    desc: "Ed25519 over canonical JSON. Any mutation of legs, quantity or price invalidates the permit."
  },
  {
    title: "Time-bounded",
    desc: "A 60-second TTL. A permit cannot outlive the market state it was evaluated against."
  },
  {
    title: "Single-use",
    desc: "The nonce is consumed after validation and immediately before submission, so a rejected permit never burns it and a replay has no window."
  },
  {
    title: "Credential-isolated",
    desc: "The signing key lives only in lib/permits/sign.ts. The executor holds the public half — it can verify a permit, never mint one."
  }
];

export default function PermitsPage() {
  const implemented = PERMIT_FLOW.filter((s) => s.status === "IMPLEMENTED").length;

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
                PERMIT CONSOLE · LANE B
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] border border-black/15 text-emerald-900">
                {implemented}/{PERMIT_FLOW.length} STAGES IMPLEMENTED
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-50 border border-black/15 text-amber-900">
                PAPER ONLY
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              Authority, issued one trade at a time
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl">
              Every order requires a cryptographically signed, short-lived permit bound to exact legs, a price band, and verified snapshots. The strategy cannot reach Alpaca; only the executor can, and only with a permit.
            </p>
          </div>

          <div className="bg-[#EAEEDD] border border-black/15 p-4 min-w-[260px]">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">
              <span>Key Isolation</span>
              <span className="text-emerald-900 bg-white border border-black/10 px-1.5 py-0.5">
                ENFORCED
              </span>
            </div>
            <div className="mt-2 text-sm font-bold text-[#232323]">
              Ed25519 Capability Model
            </div>
            <div className="mt-1 text-xs text-[#74736A] font-mono">
              60-second TTL · Single-Use Nonce
            </div>
          </div>
        </motion.div>

        {/* Telemetry Stat Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#EAEEDD] border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              01 · SIGNING PRIVILEGE
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-[#232323] mt-1">
              lib/permits/sign.ts
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Only file with private key</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              02 · PERMIT LIFESPAN
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-[#0B4FFF] mt-1">
              60 SECONDS
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Strict ephemeral TTL</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              03 · EXECUTOR BOUNDARY
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-emerald-800 mt-1">
              14 CHECKS
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Pre-flight verification</span>
          </div>

          <div className="bg-white border border-black/15 p-5">
            <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
              04 · REPLAY WINDOW
            </span>
            <div className="text-2xl md:text-3xl font-bold font-mono text-rose-700 mt-1">
              0 SECONDS
            </div>
            <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Nonces consumed prior to send</span>
          </div>
        </motion.div>

        {/* 1. Permit Lifecycle Stages Card (Image 4 & 5 Style) */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 flex flex-col">
          <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15 flex items-center justify-between">
            <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
              01 · PERMIT LIFECYCLE PIPELINE
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-white border border-black/15 text-[#232323]">
              ZERO TRUST STACK
            </span>
          </div>

          <div className="divide-y divide-black/15">
            {PERMIT_FLOW.map((step) => (
              <div key={step.step} className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-[#FAF9F5] transition-colors">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 bg-[#EAEEDD] border border-black/15 flex items-center justify-center font-mono text-xs font-bold text-[#232323] shrink-0">
                    {String(step.step).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-[#232323]">{step.name}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-white border border-black/15 text-[#74736A]">
                        {step.owner}
                      </span>
                    </div>
                    <p className="text-xs text-[#74736A] mt-1.5 leading-relaxed max-w-3xl">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                  <span className="text-[11px] font-mono text-[#74736A] hidden lg:block">
                    {step.evidence}
                  </span>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                      step.status === "IMPLEMENTED"
                        ? "bg-[#EAEEDD] text-emerald-900 border-emerald-800/30"
                        : "bg-amber-50 text-amber-900 border-amber-800/30"
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Card Footer */}
          <div className="flex items-stretch border-t border-black/15 bg-white">
            <div className="flex-1 px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#232323]">
              Deterministic Execution Pipeline
            </div>
            <Link
              href="/proof"
              className="w-12 h-11 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] hover:bg-[#DDE2CF] text-[#232323] transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* 2. Attack Scenarios & Rejection Table Card */}
        <motion.div variants={itemVariants} className="bg-white border border-black/15 flex flex-col">
          <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15">
            <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
              02 · HARDENED ATTACK TEST SUITE
            </div>
            <p className="text-xs text-[#74736A] font-mono mt-0.5">
              Exercised in tests/execution/executor.attacks.test.ts against adversarial modifications.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#74736A] uppercase text-[10px] font-bold border-b border-black/10">
                  <th className="py-2.5 px-4 w-72">Adversarial Action</th>
                  <th className="py-2.5 px-4 w-80 text-rose-800">Deterministic Rejection Code</th>
                  <th className="py-2.5 px-4">Verification Defense Logic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {ATTACKS.map((atk, i) => (
                  <tr key={i} className="hover:bg-[#FAF9F5] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#232323]">{atk.attack}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-50 text-rose-900 border border-rose-800/30">
                        {atk.rejection}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#74736A] font-sans text-xs">{atk.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Card Footer */}
          <div className="flex items-stretch border-t border-black/15 bg-white">
            <div className="flex-1 px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#232323]">
              14 Pre-submission Attack Guards Verified
            </div>
            <div className="w-12 h-11 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] text-[#232323]">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>

        {/* 3. TradePermit JSON Schema & Properties */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Schema Fields (7 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-7 bg-white border border-black/15 flex flex-col">
            <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15">
              <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
                03 · TRADE PERMIT SPECIFICATION
              </div>
              <p className="text-xs text-[#74736A] font-mono mt-0.5">
                Exact schema signed by Ed25519 over canonical RFC-8785 JSON.
              </p>
            </div>

            <div className="divide-y divide-black/10 p-6 space-y-3">
              {PERMIT_FIELDS.map((f, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0B4FFF]">{f.field}</span>
                    <span className="text-[10px] text-[#74736A]">({f.type})</span>
                  </div>
                  <span className="text-[#74736A] font-sans text-xs sm:text-right">{f.description}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Core Properties (5 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col gap-4">
            {PROPERTIES.map((prop, idx) => (
              <div key={idx} className="bg-white border border-black/15 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-[#232323]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#232323]">
                    {prop.title}
                  </h4>
                </div>
                <p className="text-xs text-[#74736A] leading-relaxed">
                  {prop.desc}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
