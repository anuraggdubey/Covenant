"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import {
  Layers,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Zap,
  Info
} from "lucide-react";
import { PayoffChart } from "@/components/PayoffChart";

interface ContractView {
  bid: string;
  ask: string;
  delta?: number;
  impliedVolatility?: number;
  symbol?: string;
}

interface LegView {
  symbol: string;
  side: "buy" | "sell";
  ratioQty: number;
  positionIntent: string;
}

interface RankedCandidateView {
  id: string;
  structure: string;
  expiry: string;
  dte: number;
  legs: LegView[];
  quantity: number;
  limitPrice: string;
  standaloneMaxLoss: string;
  standaloneMaxGain: string;
  breakevenUnderlying: string;
  riskRewardRatio: string;
  alphaScore: number;
  expectedPnl: string;
  lowerConfidenceBoundPnl: string;
  scenarioCount: number;
  thesis: string;
}

interface UnderlyingView {
  underlying: "SPY" | "QQQ";
  underlyingPrice: string;
  feed: string;
  totalContractsInChain: number;
  expirations: string[];
  ladderByExpiry: Record<string, Array<{ strike: string; call?: ContractView; put?: ContractView }>>;
  signals: { usable: boolean; trend: string; realizedVol20d: number };
  candidatesCount: number;
  rankedCandidates: RankedCandidateView[];
}

interface CandidateResponse {
  timestamp?: string;
  dataMode: "PAPER" | "SYNTHETIC_MOCK";
  freshness?: "LIVE" | "STALE";
  source?: "BROKER" | "CACHE";
  warning?: string;
  underlyings: UnderlyingView[];
}

export default function CandidateLabPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CandidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnderlying, setSelectedUnderlying] = useState<"SPY" | "QQQ">("SPY");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"SPREADS" | "CHAIN_LADDER">("SPREADS");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [structureFilter, setStructureFilter] = useState<string>("ALL");
  const [maxLossCap, setMaxLossCap] = useState<string>("");

  const fetchCandidates = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(force ? "/api/candidates?force=true" : "/api/candidates");
      const json = (await res.json()) as CandidateResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Candidate data is unavailable.");
      setData(json);

      const activeData = json.underlyings.find((u) => u.underlying === selectedUnderlying);
      if (activeData && activeData.expirations.length > 0 && !selectedExpiry) {
        setSelectedExpiry(activeData.expirations[0]!);
      }
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : "Candidate data is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  // AI Explanations
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

  const fetchAiExplanation = async (cand: RankedCandidateView) => {
    if (aiExplanations[cand.id] || loadingAi[cand.id]) return;
    setLoadingAi((prev) => ({ ...prev, [cand.id]: true }));
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            underlying: selectedUnderlying,
            underlyingPrice: activeUnderlyingData?.underlyingPrice ?? "500.00",
            structure: cand.structure,
            expiry: cand.expiry,
            dte: cand.dte,
            limitPrice: cand.limitPrice,
            maxLoss: cand.standaloneMaxLoss,
            maxGain: cand.standaloneMaxGain,
            riskRewardRatio: cand.riskRewardRatio,
            alphaScore: cand.alphaScore,
            trend: activeUnderlyingData?.signals.trend,
            realizedVol: activeUnderlyingData?.signals.realizedVol20d,
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.explanation) {
        setAiExplanations((prev) => ({ ...prev, [cand.id]: json.explanation }));
      }
    } catch {
      // Ignore fallback
    } finally {
      setLoadingAi((prev) => ({ ...prev, [cand.id]: false }));
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const activeUnderlyingData = data?.underlyings?.find(
    (underlying) => underlying.underlying === selectedUnderlying
  );

  const activeExpirations = activeUnderlyingData?.expirations ?? [];
  const currentExpiry = selectedExpiry || activeExpirations[0] || "";
  const currentLadder = activeUnderlyingData?.ladderByExpiry?.[currentExpiry] ?? [];

  // Filtered spreads
  const filteredCandidates = useMemo(() => {
    if (!activeUnderlyingData) return [];
    let list = activeUnderlyingData.rankedCandidates;

    if (structureFilter !== "ALL") {
      list = list.filter((c) => c.structure === structureFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.thesis.toLowerCase().includes(q) ||
          c.structure.toLowerCase().includes(q) ||
          c.expiry.toLowerCase().includes(q) ||
          c.legs.some((l) => l.symbol.toLowerCase().includes(q))
      );
    }

    if (maxLossCap.trim()) {
      const cap = Number(maxLossCap);
      if (Number.isFinite(cap) && cap > 0) {
        list = list.filter((c) => Number(c.standaloneMaxLoss) <= cap);
      }
    }

    return list;
  }, [activeUnderlyingData, structureFilter, searchQuery, maxLossCap]);

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
        className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-16 flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/15">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-white border border-black/15 text-[#232323]">
                CANDIDATE LAB · LANE A
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] border border-black/15 text-emerald-900">
                ALPACA MARKET DATA
              </span>
              {data?.freshness === "STALE" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-50 border border-black/15 text-amber-900">
                  <Clock className="w-3 h-3" />
                  STALE QUOTES
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              Ranked defined-risk spreads & chains
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl">
              Ingesting live Alpaca options chains, calculating exact standalone max-loss and payoff math, and ranking legal vertical spreads without broker write authority.
            </p>
          </div>

          {/* Controls: Symbol switcher & Refresh */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex bg-white border border-black/15 p-1">
              {(["SPY", "QQQ"] as const).map((sym) => (
                <button
                  key={sym}
                  onClick={() => {
                    setSelectedUnderlying(sym);
                    setSelectedExpiry("");
                  }}
                  className={`px-4 py-1.5 text-xs font-mono font-bold uppercase transition-all ${
                    selectedUnderlying === sym
                      ? "bg-[#232323] text-white"
                      : "text-[#74736A] hover:text-[#232323]"
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>

            <button
              onClick={() => void fetchCandidates(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#FAF9F5] text-[#232323] text-xs font-mono font-bold uppercase border border-black/15 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#74736A] ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh Chains"}
            </button>
          </div>
        </motion.div>

        {/* Warning Banner */}
        {data?.warning && (
          <div className="bg-amber-50 border border-amber-800/30 p-4 flex items-start gap-3 text-amber-950 text-xs font-mono">
            <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">OBSERVATION NOTICE: </span>
              {data.warning}
            </div>
          </div>
        )}

        {/* Underlying Telemetry Cards (Sharp flat blocks) */}
        {activeUnderlyingData && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#EAEEDD] border border-black/15 p-5">
              <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
                01 · {selectedUnderlying} MARK
              </span>
              <div className="text-2xl md:text-3xl font-bold font-mono text-[#232323] mt-1">
                ${activeUnderlyingData.underlyingPrice}
              </div>
              <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Live execution reference</span>
            </div>

            <div className="bg-white border border-black/15 p-5">
              <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
                02 · MARKET SIGNAL
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] text-emerald-900 border border-emerald-800/30">
                  {activeUnderlyingData.signals.trend}
                </span>
                <span className="font-mono text-sm font-bold text-[#232323]">
                  {(activeUnderlyingData.signals.realizedVol20d * 100).toFixed(1)}% Realized Vol
                </span>
              </div>
              <span className="text-[10px] text-[#74736A] font-mono mt-1 block">20-day historical window</span>
            </div>

            <div className="bg-white border border-black/15 p-5">
              <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
                03 · INGESTION FEED
              </span>
              <div className="text-xl font-bold font-mono text-[#0B4FFF] mt-1 uppercase">
                {activeUnderlyingData.feed}
              </div>
              <span className="text-[10px] text-[#74736A] font-mono mt-1 block">
                {activeUnderlyingData.totalContractsInChain} option contracts
              </span>
            </div>

            <div className="bg-white border border-black/15 p-5">
              <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider block">
                04 · ELIGIBLE SPREADS
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
                {activeUnderlyingData.candidatesCount}
              </div>
              <span className="text-[10px] text-[#74736A] font-mono mt-1 block">Capped risk setups</span>
            </div>
          </motion.div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-black/15 pb-2">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("SPREADS")}
              className={`text-sm font-mono font-bold uppercase pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "SPREADS"
                  ? "border-[#0B4FFF] text-[#0B4FFF]"
                  : "border-transparent text-[#74736A] hover:text-[#232323]"
              }`}
            >
              Ranked Vertical Spreads ({filteredCandidates.length})
            </button>
            <button
              onClick={() => setActiveTab("CHAIN_LADDER")}
              className={`text-sm font-mono font-bold uppercase pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "CHAIN_LADDER"
                  ? "border-[#0B4FFF] text-[#0B4FFF]"
                  : "border-transparent text-[#74736A] hover:text-[#232323]"
              }`}
            >
              Option Chain Ladder
            </button>
          </div>
        </div>

        {/* TAB 1: Ranked Spread Candidates */}
        {activeTab === "SPREADS" && (
          <motion.div variants={itemVariants} className="flex flex-col gap-6">
            {/* Filter controls card */}
            <div className="bg-white border border-black/15 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#74736A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search thesis, strike, or OCC symbol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#FAF9F5] border border-black/15 text-xs text-[#232323] focus:outline-none focus:border-[#0B4FFF] font-mono rounded-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#74736A]">
                  <Filter className="w-3 h-3" />
                  <span>STRUCTURE:</span>
                  <select
                    value={structureFilter}
                    onChange={(e) => setStructureFilter(e.target.value)}
                    className="bg-[#FAF9F5] border border-black/15 px-2.5 py-1.5 text-xs text-[#232323] font-mono rounded-none"
                  >
                    <option value="ALL">ALL STRUCTURES</option>
                    <option value="BULL_CALL_DEBIT">BULL CALL DEBIT</option>
                    <option value="BEAR_PUT_DEBIT">BEAR PUT DEBIT</option>
                    <option value="CREDIT_VERTICAL">CREDIT VERTICAL</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#74736A]">
                  <span>MAX LOSS ($):</span>
                  <input
                    type="number"
                    placeholder="No max"
                    value={maxLossCap}
                    onChange={(e) => setMaxLossCap(e.target.value)}
                    className="w-24 bg-[#FAF9F5] border border-black/15 px-2.5 py-1.5 text-xs text-[#232323] font-mono rounded-none"
                  />
                </div>
              </div>
            </div>

            {/* Candidates List (Cards from Images 4 & 5!) */}
            {loading ? (
              <div className="bg-white p-16 text-center border border-black/15">
                <RefreshCw className="w-6 h-6 text-[#0B4FFF] animate-spin mx-auto mb-3" />
                <div className="text-sm font-mono font-bold text-[#232323]">INGESTING ALPACA OPTION CHAINS...</div>
                <div className="text-xs text-[#74736A] mt-1 font-mono">Calculating exact max-loss envelopes</div>
              </div>
            ) : filteredCandidates.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {filteredCandidates.map((cand, idx) => (
                  <div
                    key={cand.id}
                    className="bg-white border border-black/15 flex flex-col justify-between"
                  >
                    {/* Card Header (Pale sage background from Image 4) */}
                    <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#232323]">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#0B4FFF] uppercase">
                          {cand.structure.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-white border border-black/15 text-[#232323]">
                          {cand.expiry}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-white border border-black/15 text-[#232323]">
                          {cand.dte} DTE
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 md:p-8">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                        {/* Left: Thesis & Legs */}
                        <div className="lg:col-span-7 flex flex-col justify-between">
                          <div>
                            <h3 className="text-xl md:text-2xl font-serif text-[#232323] leading-snug mb-3">
                              {cand.thesis}
                            </h3>

                            {/* AI Risk & Thesis Explainer Button */}
                            <div className="mb-4">
                              <button
                                type="button"
                                onClick={() => void fetchAiExplanation(cand)}
                                disabled={loadingAi[cand.id]}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#FAF9F5] border border-black/15 text-[11px] font-mono font-bold text-[#0B4FFF] transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Sparkles className={`w-3.5 h-3.5 ${loadingAi[cand.id] ? "animate-spin" : ""}`} />
                                {loadingAi[cand.id] ? "Analyzing with AI..." : aiExplanations[cand.id] ? "Re-analyze with AI" : "Ask AI to Audit Trade"}
                              </button>

                              {aiExplanations[cand.id] && (
                                <div className="mt-2.5 p-3.5 bg-[#EAEEDD] border border-black/15 text-xs font-mono text-[#232323] leading-relaxed">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0B4FFF] uppercase tracking-wider mb-1">
                                    <Sparkles className="w-3 h-3 text-[#0B4FFF]" />
                                    AI Options Risk Audit
                                  </div>
                                  {aiExplanations[cand.id]}
                                </div>
                              )}
                            </div>

                            {/* Exact OCC Legs */}
                            <div className="bg-[#FAF9F5] p-4 border border-black/10">
                              <div className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider mb-2">
                                EXACT OCC LEGS
                              </div>
                              <div className="space-y-1.5">
                                {cand.legs.map((leg, lIdx) => (
                                  <div
                                    key={lIdx}
                                    className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-white border border-black/10 font-mono"
                                  >
                                    <span
                                      className={`font-bold uppercase ${
                                        leg.side === "buy" ? "text-emerald-800" : "text-rose-700"
                                      }`}
                                    >
                                      {leg.positionIntent.replace(/_/g, " ")} {leg.ratioQty}x
                                    </span>
                                    <span className="text-[#232323] font-semibold">{leg.symbol}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Payoff Visualization */}
                        <div className="lg:col-span-5 flex flex-col justify-center">
                          <PayoffChart
                            structure={cand.structure}
                            maxLoss={cand.standaloneMaxLoss}
                            maxGain={cand.standaloneMaxGain}
                            breakeven={cand.breakevenUnderlying}
                            limitPrice={cand.limitPrice}
                          />
                        </div>
                      </div>

                      {/* Metrics row */}
                      <div className="pt-4 border-t border-black/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono">
                        <div className="bg-[#FAF9F5] p-2 border border-black/10">
                          <span className="text-[#74736A] text-[9px] uppercase font-bold block">Quantity</span>
                          <span className="font-bold text-[#232323] text-xs mt-0.5 block">{cand.quantity} lots</span>
                        </div>
                        <div className="bg-[#FAF9F5] p-2 border border-black/10">
                          <span className="text-[#74736A] text-[9px] uppercase font-bold block">Limit Price</span>
                          <span className="font-bold text-[#0B4FFF] text-xs mt-0.5 block">${cand.limitPrice}</span>
                        </div>
                        <div className="bg-[#FAF9F5] p-2 border border-black/10">
                          <span className="text-[#74736A] text-[9px] uppercase font-bold block">Max Loss</span>
                          <span className="font-bold text-rose-700 text-xs mt-0.5 block">${cand.standaloneMaxLoss}</span>
                        </div>
                        <div className="bg-[#FAF9F5] p-2 border border-black/10">
                          <span className="text-[#74736A] text-[9px] uppercase font-bold block">Max Gain</span>
                          <span className="font-bold text-emerald-800 text-xs mt-0.5 block">${cand.standaloneMaxGain}</span>
                        </div>
                        <div className="bg-[#FAF9F5] p-2 border border-black/10">
                          <span className="text-[#74736A] text-[9px] uppercase font-bold block">R / R</span>
                          <span className="font-bold text-[#232323] text-xs mt-0.5 block">{cand.riskRewardRatio}</span>
                        </div>
                        <div className="bg-[#FAF9F5] p-2 border border-black/10">
                          <span className="text-[#74736A] text-[9px] uppercase font-bold block">Alpha Score</span>
                          <span className="font-bold text-emerald-800 text-xs mt-0.5 block">{cand.alphaScore}/100</span>
                        </div>
                        <div className="bg-[#FAF9F5] p-2 border border-black/10">
                          <span className="text-[#74736A] text-[9px] uppercase font-bold block">90% Lower</span>
                          <span className="font-bold text-emerald-800 text-xs mt-0.5 block">${cand.lowerConfidenceBoundPnl}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Card Footer Action Bar (Image 4 & 5 Style!) */}
                    <div className="flex items-stretch border-t border-black/15 bg-white">
                      <div className="flex-1 px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[#232323]">
                        {cand.structure.replace(/_/g, " ")} · {cand.expiry}
                      </div>
                      <div className="w-12 h-11 flex items-center justify-center border-l border-black/15 bg-[#EAEEDD] hover:bg-[#DDE2CF] text-[#232323] transition-colors cursor-pointer">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-16 text-center border border-black/15">
                <AlertCircle className="w-6 h-6 text-amber-700 mx-auto mb-2" />
                <h3 className="text-base font-mono font-bold text-[#232323]">NO CANDIDATES MATCH FILTER</h3>
                <p className="text-xs text-[#74736A] mt-1 font-mono">Covenant fails closed and returns ABSTAIN.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 2: Option Chain Snapshot Ladder */}
        {activeTab === "CHAIN_LADDER" && (
          <motion.div variants={itemVariants} className="bg-white border border-black/15">
            <div className="p-5 md:p-6 bg-[#EAEEDD] border-b border-black/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-mono font-bold text-[#232323] uppercase">
                  Option Snapshot Ladder — {selectedUnderlying}
                </h2>
                <p className="text-xs text-[#74736A] font-mono mt-0.5">
                  Real quotes, Greeks, and implied volatility across all strikes.
                </p>
              </div>

              {/* Expiry Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#74736A]">EXPIRY:</span>
                <select
                  value={currentExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="bg-white border border-black/15 px-3 py-1.5 text-xs font-mono font-bold text-[#0B4FFF] focus:outline-none rounded-none"
                >
                  {activeExpirations.map((exp: string) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-[#FAF9F5] text-[#74736A] uppercase text-[10px] font-bold border-b border-black/10">
                    <th colSpan={4} className="py-2.5 px-3 text-[#0B4FFF] border-r border-black/10">
                      CALLS (Bullish)
                    </th>
                    <th className="py-2.5 px-3 bg-[#EAEEDD] text-[#232323] border-r border-black/10">Strike</th>
                    <th colSpan={4} className="py-2.5 px-3 text-rose-700">
                      PUTS (Bearish)
                    </th>
                  </tr>
                  <tr className="border-b border-black/15 text-[10px] text-[#74736A]">
                    <th className="py-2 px-2">Delta</th>
                    <th className="py-2 px-2">IV</th>
                    <th className="py-2 px-2">Bid</th>
                    <th className="py-2 px-2 border-r border-black/10">Ask</th>
                    <th className="py-2 px-3 bg-[#EAEEDD] font-bold text-[#232323] border-r border-black/10">$ Strike</th>
                    <th className="py-2 px-2">Bid</th>
                    <th className="py-2 px-2">Ask</th>
                    <th className="py-2 px-2">IV</th>
                    <th className="py-2 px-2">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 font-mono">
                  {currentLadder.length > 0 ? (
                    currentLadder.map((row, rIdx) => {
                      const c = row.call;
                      const p = row.put;
                      return (
                        <tr key={rIdx} className="hover:bg-[#FAF9F5] transition-colors">
                          <td className="py-2 px-2 text-[#74736A]">
                            {c?.delta !== undefined ? c.delta.toFixed(2) : "—"}
                          </td>
                          <td className="py-2 px-2 text-[#74736A]">
                            {c?.impliedVolatility ? `${(c.impliedVolatility * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className="py-2 px-2 text-emerald-800 font-bold">
                            {c?.bid ? `$${c.bid}` : "—"}
                          </td>
                          <td className="py-2 px-2 text-[#232323] border-r border-black/10">
                            {c?.ask ? `$${c.ask}` : "—"}
                          </td>
                          <td className="py-2 px-3 font-bold bg-[#EAEEDD] text-[#0B4FFF] border-r border-black/10">
                            ${row.strike}
                          </td>
                          <td className="py-2 px-2 text-emerald-800 font-bold">
                            {p?.bid ? `$${p.bid}` : "—"}
                          </td>
                          <td className="py-2 px-2 text-[#232323]">
                            {p?.ask ? `$${p.ask}` : "—"}
                          </td>
                          <td className="py-2 px-2 text-[#74736A]">
                            {p?.impliedVolatility ? `${(p.impliedVolatility * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className="py-2 px-2 text-[#74736A]">
                            {p?.delta !== undefined ? p.delta.toFixed(2) : "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-[#74736A]">
                        No option contracts found for expiry {currentExpiry}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
