"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Sliders,
  CheckCircle2,
  XCircle,
  Play,
  BookmarkPlus,
  RefreshCw,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface Contradiction {
  code: string;
  fields: string[];
  explanation?: string;
  reason?: string;
}

interface MandateCase {
  id: string;
  title: string;
  mandateText: string;
  expectedCompiledPolicy: {
    status: string;
    riskProfile: string;
    allowedUnderlyings: string[];
    allowedStructures: string[];
    missingStateAction: string;
    modelAuthority: string;
    invariants: string[];
    riskOverrides?: Record<string, unknown>;
  };
  expectedContradictions: Contradiction[];
}

interface CorpusData {
  schemaVersion: number;
  profileSource: string;
  cases: MandateCase[];
}

interface CompiledResult {
  status: string;
  echo: string;
  draft: {
    riskProfile: string;
    allowedUnderlyings: string[];
    allowedStructures: string[];
    missingStateAction: string;
    modelAuthority: string;
    invariants: string[];
    riskOverrides?: Record<string, unknown>;
  };
  contradictions: Contradiction[];
}

interface ActivePolicyState {
  source: string;
  policy: {
    id: string;
    version: number;
    status: string;
    policyHash: string;
    plainEnglishEcho: string;
    riskProfile: string;
    allowedUnderlyings: string[];
    allowedStructures: string[];
    perTradeMaxLossPct: number;
    portfolioHeatMaxLossPct: number;
    dailyHaltPct: number;
    minDte: number;
    maxDte: number;
  };
  caps: {
    equityUsd: string;
    equitySource: string;
    perTradeMaxLoss: string;
    portfolioHeatMaxLoss: string;
    dailyHalt: string;
  };
}

export default function MandateStudioPage() {
  const [corpus, setCorpus] = useState<CorpusData | null>(null);
  const [selectedMandate, setSelectedMandate] = useState<MandateCase | null>(null);
  const [mandateText, setMandateText] = useState("");
  const [compiled, setCompiled] = useState<CompiledResult | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activePolicyData, setActivePolicyData] = useState<ActivePolicyState | null>(null);
  const [activationFeedback, setActivationFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [filterTab, setFilterTab] = useState<"ALL" | "VALID" | "CONTRADICTORY" | "SAVED">("ALL");
  const [savedDrafts, setSavedDrafts] = useState<Array<{ text: string; result: CompiledResult; savedAt: string }>>([]);

  // Risk overrides sliders state
  const [showSliders, setShowSliders] = useState(false);
  const [perTradeUsd, setPerTradeUsd] = useState(600);
  const [heatUsd, setHeatUsd] = useState(2500);
  const [haltUsd, setHaltUsd] = useState(1250);
  const [minDte, setMinDte] = useState(7);
  const [maxDte, setMaxDte] = useState(21);

  const fetchActivePolicy = async () => {
    try {
      const res = await fetch("/api/mandates/active");
      if (res.ok) {
        const data = await res.json();
        setActivePolicyData(data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetch("/api/mandates/corpus")
      .then((r) => r.json())
      .then((data: CorpusData) => {
        setCorpus(data);
        if (data.cases.length > 0) {
          setSelectedMandate(data.cases[0]!);
          setMandateText(data.cases[0]!.mandateText);
        }
      })
      .catch(() => setCorpus(null));

    fetchActivePolicy();
  }, []);

  async function handleCompile() {
    if (!mandateText.trim()) return;
    setCompiling(true);
    setCompiled(null);
    setActivationFeedback(null);
    try {
      const payload: Record<string, unknown> = { mandateText: mandateText.trim() };
      if (showSliders) {
        payload.limits = {
          perTradeMaxLossUsd: perTradeUsd,
          portfolioHeatMaxLossUsd: heatUsd,
          dailyHaltUsd: haltUsd,
          minDte,
          maxDte
        };
      }
      const res = await fetch("/api/mandates/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data: CompiledResult = await res.json();
      setCompiled(data);
      setSelectedMandate(null);
    } catch {
      setCompiled(null);
    } finally {
      setCompiling(false);
    }
  }

  async function handleActivate() {
    if (!mandateText.trim()) return;
    setActivating(true);
    setActivationFeedback(null);
    try {
      const payload: Record<string, unknown> = { mandateText: mandateText.trim() };
      if (showSliders) {
        payload.limits = {
          perTradeMaxLossUsd: perTradeUsd,
          portfolioHeatMaxLossUsd: heatUsd,
          dailyHaltUsd: haltUsd,
          minDte,
          maxDte
        };
      }
      const res = await fetch("/api/mandates/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setActivationFeedback({ ok: false, message: data.error ?? "Failed to activate policy." });
      } else {
        setActivationFeedback({
          ok: true,
          message: `Policy successfully activated as ${data.policy?.id ?? "active"}. Execution tick will now use this mandate.`
        });
        fetchActivePolicy();
      }
    } catch (err: unknown) {
      setActivationFeedback({ ok: false, message: err instanceof Error ? err.message : "Activation error" });
    } finally {
      setActivating(false);
    }
  }

  function handleSaveDraft() {
    if (!compiled) return;
    setSavedDrafts((prev) => [
      { text: mandateText.trim(), result: compiled, savedAt: new Date().toISOString() },
      ...prev
    ]);
  }

  const displayPolicy = compiled ? compiled.draft : selectedMandate?.expectedCompiledPolicy ?? null;
  const displayContradictions = compiled ? compiled.contradictions : selectedMandate?.expectedContradictions ?? [];
  const displayStatus = compiled
    ? compiled.status
    : displayContradictions.length > 0
    ? "BLOCKED"
    : selectedMandate?.expectedCompiledPolicy.status ?? null;
  const displayEcho = compiled?.echo ?? null;

  const contradictoryCases = corpus?.cases.filter((c) => c.expectedContradictions.length > 0) ?? [];
  const validCases = corpus?.cases.filter((c) => c.expectedContradictions.length === 0) ?? [];

  const filteredCases =
    filterTab === "VALID"
      ? validCases
      : filterTab === "CONTRADICTORY"
      ? contradictoryCases
      : corpus?.cases ?? [];

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
                MANDATE STUDIO · LANE B
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] border border-black/15 text-emerald-900">
                12 BENCHMARKS
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-50 border border-black/15 text-rose-900">
                4 CONTRADICTIONS BLOCKED
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              Turn trader intent into mathematical policy
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl">
              Plain-English trading mandates are compiled into versioned, typed policy JSON. Contradictions are mathematically refused before a single order path can exist.
            </p>
          </div>

          {activePolicyData && (
            <div className="bg-[#EAEEDD] border border-black/15 p-4 min-w-[280px]">
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">
                <span>Active Policy</span>
                <span className="text-emerald-900 bg-white border border-black/10 px-1.5 py-0.5">
                  {activePolicyData.source}
                </span>
              </div>
              <div className="mt-2 text-sm font-bold text-[#232323] truncate">
                {activePolicyData.policy.id} (v{activePolicyData.policy.version})
              </div>
              <div className="mt-1 text-xs text-[#74736A] font-mono">
                Equity: ${Number(activePolicyData.caps.equityUsd).toLocaleString()} · Halt: {activePolicyData.caps.dailyHalt}
              </div>
            </div>
          )}
        </motion.div>

        {/* Studio Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editor & Corpus (7 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-7 flex flex-col gap-8">
            
            {/* 1. Mandate Editor Card Component */}
            <div className="bg-[#EAEEDD] border border-black/15 flex flex-col justify-between">
              {/* Card Top / Header */}
              <div className="p-6 md:p-8 border-b border-black/15 bg-[#EAEEDD]">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
                    01 · MANDATE DECLARATION
                  </div>
                  <button
                    onClick={() => setShowSliders(!showSliders)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#F5F4EC] border border-black/15 text-[11px] font-mono font-bold uppercase tracking-wider text-[#232323] transition-colors"
                  >
                    <Sliders className="w-3 h-3" />
                    {showSliders ? "Hide Sliders" : "Configure Dollar Caps"}
                  </button>
                </div>

                <textarea
                  value={mandateText}
                  onChange={(e) => {
                    setMandateText(e.target.value);
                    setCompiled(null);
                    setActivationFeedback(null);
                  }}
                  rows={5}
                  placeholder="Declare your trading mandate in plain English, e.g.: Trade defined-risk SPY and QQQ bull-call debits and bear-put debits using the Balanced risk profile. Abstain whenever state is missing."
                  className="w-full bg-white border border-black/15 p-4 text-[#232323] placeholder-[#74736A] text-sm font-normal leading-relaxed focus:outline-none focus:border-[#0B4FFF] resize-y rounded-none"
                />

                {/* Collapsible Sliders for Studio Overrides */}
                <AnimatePresence>
                  {showSliders && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4 pt-4 border-t border-black/15"
                    >
                      <div className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider mb-3">
                        DOLLAR LOSS OVERRIDES ($100,000 ACCOUNT)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-3 border border-black/15">
                          <div className="flex justify-between text-xs font-medium text-[#232323] mb-1">
                            <span className="font-mono text-[11px]">Max Loss/Trade</span>
                            <span className="font-mono text-[#0B4FFF] font-bold">${perTradeUsd}</span>
                          </div>
                          <input
                            type="range"
                            min="200"
                            max="2000"
                            step="50"
                            value={perTradeUsd}
                            onChange={(e) => setPerTradeUsd(Number(e.target.value))}
                            className="w-full accent-[#0B4FFF] cursor-pointer"
                          />
                          <div className="text-[10px] text-[#74736A] mt-1 font-mono">{(perTradeUsd / 1000).toFixed(2)}% of equity</div>
                        </div>

                        <div className="bg-white p-3 border border-black/15">
                          <div className="flex justify-between text-xs font-medium text-[#232323] mb-1">
                            <span className="font-mono text-[11px]">Portfolio Heat</span>
                            <span className="font-mono text-[#0B4FFF] font-bold">${heatUsd}</span>
                          </div>
                          <input
                            type="range"
                            min="1000"
                            max="6000"
                            step="100"
                            value={heatUsd}
                            onChange={(e) => setHeatUsd(Number(e.target.value))}
                            className="w-full accent-[#0B4FFF] cursor-pointer"
                          />
                          <div className="text-[10px] text-[#74736A] mt-1 font-mono">{(heatUsd / 1000).toFixed(2)}% total ceiling</div>
                        </div>

                        <div className="bg-white p-3 border border-black/15">
                          <div className="flex justify-between text-xs font-medium text-[#232323] mb-1">
                            <span className="font-mono text-[11px]">Daily Halt</span>
                            <span className="font-mono text-rose-700 font-bold">-${haltUsd}</span>
                          </div>
                          <input
                            type="range"
                            min="500"
                            max="3000"
                            step="50"
                            value={haltUsd}
                            onChange={(e) => setHaltUsd(Number(e.target.value))}
                            className="w-full accent-rose-600 cursor-pointer"
                          />
                          <div className="text-[10px] text-[#74736A] mt-1 font-mono">-{(haltUsd / 1000).toFixed(2)}% stop session</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Activation Result Alert */}
                {activationFeedback && (
                  <div
                    className={`mt-4 p-3.5 border text-xs flex items-start gap-2.5 ${
                      activationFeedback.ok
                        ? "bg-white border-emerald-600 text-emerald-950"
                        : "bg-white border-rose-600 text-rose-950"
                    }`}
                  >
                    {activationFeedback.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold uppercase tracking-wider">{activationFeedback.ok ? "Policy Activated" : "Activation Refused"}</div>
                      <div className="mt-0.5 leading-relaxed">{activationFeedback.message}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Bottom Footer Action Bar (Style from Image 4 & 5) */}
              <div className="flex items-stretch border-t border-black/15 bg-white">
                <button
                  onClick={handleCompile}
                  disabled={compiling || !mandateText.trim()}
                  className="flex-1 px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[#232323] hover:bg-[#F5F4EC] transition-colors border-r border-black/15 flex items-center justify-between disabled:opacity-40"
                >
                  <span>{compiling ? "Compiling..." : "Compile & Check Contradictions"}</span>
                </button>

                <button
                  onClick={handleActivate}
                  disabled={activating || !mandateText.trim() || (compiled ? compiled.status === "BLOCKED" : false)}
                  className="px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white transition-colors border-r border-black/15 disabled:opacity-40"
                >
                  {activating ? "Activating..." : "Activate"}
                </button>

                <button
                  onClick={handleSaveDraft}
                  disabled={!compiled}
                  className="px-4 py-3.5 bg-white hover:bg-[#F5F4EC] text-[#232323] transition-colors border-r border-black/15 disabled:opacity-40"
                  title="Save Draft"
                >
                  <BookmarkPlus className="w-4 h-4 text-[#74736A]" />
                </button>

                <button
                  onClick={handleCompile}
                  disabled={compiling || !mandateText.trim()}
                  className="w-12 flex items-center justify-center bg-[#EAEEDD] hover:bg-[#DCE1CE] text-[#232323] transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Corpus Benchmarks Card Component */}
            <div className="bg-white border border-black/15 flex flex-col">
              <div className="p-6 border-b border-black/15 bg-[#EAEEDD]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
                    02 · CORPUS TEST BENCHMARKS
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 border border-black/15 text-xs">
                    {(["ALL", "VALID", "CONTRADICTORY", "SAVED"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setFilterTab(tab)}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
                          filterTab === tab
                            ? "bg-[#232323] text-white"
                            : "text-[#74736A] hover:text-[#232323]"
                        }`}
                      >
                        {tab === "ALL" && `ALL (${corpus?.cases.length ?? 0})`}
                        {tab === "VALID" && `VALID (${validCases.length})`}
                        {tab === "CONTRADICTORY" && `BLOCKED (${contradictoryCases.length})`}
                        {tab === "SAVED" && `SAVED (${savedDrafts.length})`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preset List */}
              <div className="divide-y divide-black/15 max-h-[380px] overflow-y-auto">
                {filterTab === "SAVED" ? (
                  savedDrafts.length > 0 ? (
                    savedDrafts.map((d, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setMandateText(d.text);
                          setCompiled(d.result);
                          setSelectedMandate(null);
                        }}
                        className="p-4 hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              d.result.status === "READY"
                                ? "bg-[#EAEEDD] text-emerald-900 border-emerald-800/30"
                                : "bg-rose-50 text-rose-900 border-rose-800/30"
                            }`}
                          >
                            {d.result.status}
                          </span>
                          <span className="text-[11px] text-[#74736A] font-mono">
                            {new Date(d.savedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#232323] line-clamp-2 font-mono">{d.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-[#74736A] font-mono">No saved drafts in this session yet.</div>
                  )
                ) : (
                  filteredCases.map((m) => {
                    const isContradictory = m.expectedContradictions.length > 0;
                    const isSelected = selectedMandate?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMandate(m);
                          setMandateText(m.mandateText);
                          setCompiled(null);
                          setActivationFeedback(null);
                        }}
                        className={`p-4 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#EAEEDD]"
                            : isContradictory
                            ? "hover:bg-rose-50/50"
                            : "hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#0B4FFF]">{m.id}</span>
                            <span className="text-xs font-bold text-[#232323]">{m.title}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              isContradictory
                                ? "bg-rose-50 text-rose-900 border-rose-800/30"
                                : "bg-[#EAEEDD] text-emerald-900 border-emerald-800/30"
                            }`}
                          >
                            {isContradictory ? "CONTRADICTION" : "READY"}
                          </span>
                        </div>
                        <p className="text-xs text-[#74736A] line-clamp-2 leading-relaxed">{m.mandateText}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Compiler Verification Card (5 cols) */}
          <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
            <div className="bg-white border border-black/15 flex flex-col">
              {/* Card Header */}
              <div className="p-6 border-b border-black/15 bg-[#EAEEDD]">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono font-bold text-[#74736A] uppercase tracking-widest">
                    03 · COMPILER VERIFICATION
                  </div>
                  {displayStatus && (
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider border ${
                        displayStatus === "READY"
                          ? "bg-[#EAEEDD] text-emerald-900 border-emerald-800/30"
                          : "bg-rose-50 text-rose-900 border-rose-800/30"
                      }`}
                    >
                      {displayStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Contradiction Alert Panel */}
                {displayContradictions.length > 0 && (
                  <div className="mb-5 p-4 bg-rose-50 border border-rose-800/30 text-rose-950">
                    <div className="font-mono font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                      CONTRADICTION DETECTED — ACTIVATION BLOCKED
                    </div>
                    {displayContradictions.map((c) => (
                      <div key={c.code} className="text-xs mt-2 pt-2 border-t border-rose-800/20">
                        <div className="font-mono font-bold text-rose-900">{c.code}</div>
                        <div className="text-rose-900/90 mt-1 leading-relaxed">{c.explanation ?? c.reason}</div>
                        <div className="font-mono text-[10px] text-rose-800/70 mt-1">Fields: {c.fields.join(", ")}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Plain English Echo */}
                {displayEcho && (
                  <div className="mb-5 p-4 bg-[#FAF9F5] border border-black/10">
                    <div className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider mb-1">
                      PLAIN-ENGLISH COMPILER ECHO
                    </div>
                    <p className="text-xs text-[#232323] italic leading-relaxed">&ldquo;{displayEcho}&rdquo;</p>
                  </div>
                )}

                {/* Policy Fields Breakdown */}
                {displayPolicy ? (
                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-black/10">
                      <span className="text-[#74736A] font-mono">Risk Profile</span>
                      <span className="font-mono font-bold text-[#232323] bg-[#EAEEDD] px-2 py-0.5 border border-black/10">
                        {displayPolicy.riskProfile}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black/10">
                      <span className="text-[#74736A] font-mono">Allowed Underlyings</span>
                      <span className="font-mono font-bold text-[#0B4FFF]">
                        {displayPolicy.allowedUnderlyings.join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black/10">
                      <span className="text-[#74736A] font-mono">Permitted Structures</span>
                      <span className="font-mono text-[#232323] text-right">
                        {displayPolicy.allowedStructures.join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black/10">
                      <span className="text-[#74736A] font-mono">Missing State Action</span>
                      <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 border border-amber-800/30">
                        {displayPolicy.missingStateAction}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black/10">
                      <span className="text-[#74736A] font-mono">Model Authority</span>
                      <span className="font-mono text-[#232323]">{displayPolicy.modelAuthority}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-black/10">
                      <span className="text-[#74736A] font-mono">Invariants Bound</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {displayPolicy.invariants.length} safety checks (COV-01..08)
                      </span>
                    </div>

                    {displayPolicy.riskOverrides && Object.keys(displayPolicy.riskOverrides).length > 0 && (
                      <div className="mt-3 p-3 bg-[#FAF9F5] border border-black/10">
                        <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block mb-1">
                          Applied Risk Overrides (Fractions)
                        </span>
                        <pre className="font-mono text-[11px] text-[#232323] overflow-x-auto">
                          {JSON.stringify(displayPolicy.riskOverrides, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-[#74736A] font-mono">
                    Select a benchmark or type a mandate above to compile.
                  </div>
                )}
              </div>

              {/* Bottom Card Bar */}
              <div className="flex items-stretch border-t border-black/15 bg-[#FAF9F5]">
                <div className="flex-1 px-4 py-3 text-xs font-mono text-[#74736A]">
                  Deterministic Output
                </div>
                <div className="w-10 h-10 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] text-[#232323]">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
