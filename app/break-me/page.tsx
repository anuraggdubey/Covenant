"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  };

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
                BREAK ME · ADVERSARIAL LAB
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] border border-black/15 text-emerald-900">
                KERNEL TESTING
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-medium text-[#232323] tracking-tight">
              Try to get a trade past the kernel
            </h1>
            <p className="text-base text-[#74736A] mt-2 max-w-3xl leading-relaxed">
              Build a scenario and run it against the real invariant registry — the same code the
              autonomous loop uses. You get two answers: what the eight rules say about your exact
              trade, and what happens when the generator throws hundreds of hostile variants of it at
              the same policy.
            </p>
          </div>
        </motion.div>

        {/* Configuration Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          <div className="flex flex-col gap-6">
            
            {/* Presets */}
            <div className="bg-white border border-black/15 p-6">
              <h2 className="text-xs font-mono font-bold text-[#74736A] uppercase tracking-wider mb-4">
                Presets
              </h2>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    disabled={running}
                    onClick={() => {
                      if ("attack" in preset.overrides) setAttack(String(preset.overrides.attack));
                      else setAttack("");
                      if ("quantity" in preset.overrides) setMaxLossManual(false);
                      void run({ ...preset.overrides, runs });
                    }}
                    className="px-3 py-1.5 text-[11px] font-mono font-bold bg-[#FAF9F5] border border-black/15 text-[#232323] hover:bg-[#232323] hover:text-white transition-colors disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Your Scenario Inputs */}
            <div className="bg-white border border-black/15 p-6">
              <h2 className="text-xs font-mono font-bold text-[#74736A] uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Your Scenario</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">Contracts</span>
                  <input
                    type="number"
                    min={1} max={50}
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(Number(e.target.value));
                      setMaxLossManual(false);
                    }}
                    className="w-full bg-[#FAF9F5] border border-black/15 px-3 py-2 text-sm font-mono text-[#232323] focus:border-[#0B4FFF] focus:outline-none transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">Max loss ($)</span>
                  <input
                    value={maxLoss}
                    onChange={(e) => {
                      setMaxLoss(e.target.value);
                      setMaxLossManual(true);
                    }}
                    className="w-full bg-[#FAF9F5] border border-black/15 px-3 py-2 text-sm font-mono text-[#232323] focus:border-[#0B4FFF] focus:outline-none transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">DTE</span>
                  <input
                    type="number" min={0} max={120}
                    value={dte}
                    onChange={(e) => setDte(Number(e.target.value))}
                    className="w-full bg-[#FAF9F5] border border-black/15 px-3 py-2 text-sm font-mono text-[#232323] focus:border-[#0B4FFF] focus:outline-none transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">Equity ($)</span>
                  <input
                    value={equity}
                    onChange={(e) => setEquity(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-black/15 px-3 py-2 text-sm font-mono text-[#232323] focus:border-[#0B4FFF] focus:outline-none transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">Per-trade cap (%)</span>
                  <input
                    type="number" step={0.05} min={0.05} max={10}
                    value={perTrade}
                    onChange={(e) => setPerTrade(Number(e.target.value))}
                    className="w-full bg-[#FAF9F5] border border-black/15 px-3 py-2 text-sm font-mono text-[#232323] focus:border-[#0B4FFF] focus:outline-none transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">Day P&L (%)</span>
                  <input
                    type="number" step={0.25} min={-20} max={20}
                    value={dayPnl}
                    onChange={(e) => setDayPnl(Number(e.target.value))}
                    className="w-full bg-[#FAF9F5] border border-black/15 px-3 py-2 text-sm font-mono text-[#232323] focus:border-[#0B4FFF] focus:outline-none transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">Fuzz runs</span>
                  <input
                    type="number" min={25} max={500} step={25}
                    value={runs}
                    onChange={(e) => setRuns(Number(e.target.value))}
                    className="w-full bg-[#FAF9F5] border border-black/15 px-3 py-2 text-sm font-mono text-[#232323] focus:border-[#0B4FFF] focus:outline-none transition-colors"
                  />
                </label>
                <div className="flex flex-col gap-1.5 pt-[18px]">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={halted}
                      onChange={(e) => setHalted(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-black/15 text-[#0B4FFF] focus:ring-[#0B4FFF]"
                    />
                    <span className="text-sm font-mono text-[#232323] group-hover:text-[#0B4FFF] transition-colors">Session halted</span>
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-4">
                  <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">Named attack (optional)</span>
                  <select
                    value={attack}
                    onChange={(e) => setAttack(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-black/15 px-3 py-2 text-sm font-mono text-[#232323] focus:border-[#0B4FFF] focus:outline-none transition-colors cursor-pointer"
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
            </div>
          </div>

          <div className="bg-white border border-black/15 p-6 flex flex-col justify-between min-h-[160px]">
             <div>
                <h2 className="text-xs font-mono font-bold text-[#74736A] uppercase tracking-wider mb-2">Execute</h2>
                <p className="text-xs text-[#74736A] leading-relaxed">
                  Fire this scenario against the local kernel invariant registry and observe rule activations and fuzzing coverage.
                </p>
             </div>
             <button
               disabled={running}
               onClick={() => void run()}
               className="w-full mt-4 flex items-center justify-center gap-2 bg-[#0B4FFF] hover:bg-[#093ED9] text-white font-mono font-bold uppercase text-[11px] tracking-wider py-3 px-4 border border-transparent disabled:opacity-50 transition-colors"
             >
               {running ? (
                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
               ) : (
                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
               )}
               {running ? "Running..." : "Run against Kernel"}
             </button>
          </div>
        </motion.div>

        {error !== null && (
          <motion.div variants={itemVariants} className="bg-rose-50 border border-rose-800/30 p-4 flex items-start gap-3 text-rose-950 text-xs font-mono">
            <svg className="w-4 h-4 text-rose-800 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <div>{error}</div>
          </motion.div>
        )}

        {result !== null && (
          <motion.div variants={itemVariants} className="flex flex-col gap-6">
            
            {/* Verdict Alert Card */}
            <div className={`p-6 border ${result.scenario.outcome === 'APPROVE' ? 'bg-[#EAEEDD] border-black/15' : result.scenario.outcome === 'VETO' ? 'bg-rose-50 border-rose-800/20' : 'bg-amber-50 border-amber-800/20'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider mb-2" style={{ color: result.scenario.outcome === 'APPROVE' ? '#232323' : result.scenario.outcome === 'VETO' ? '#9f1239' : '#92400e' }}>
                    Verdict on your trade
                  </h2>
                  <div className="text-xl md:text-2xl font-medium tracking-tight text-[#232323]">
                    {result.scenario.quantity} × contracts, {result.scenario.dte} DTE, max loss ${result.scenario.standaloneMaxLoss}
                  </div>
                </div>
                <div className={`inline-flex items-center justify-center px-4 py-2 font-mono font-bold uppercase tracking-widest text-[13px] border ${result.scenario.outcome === 'APPROVE' ? 'bg-white text-emerald-700 border-black/15' : result.scenario.outcome === 'VETO' ? 'bg-rose-100 text-rose-800 border-rose-800/30' : 'bg-amber-100 text-amber-800 border-amber-800/30'}`}>
                  {result.scenario.outcome}
                </div>
              </div>
              
              {result.attack && (
                <div className="mt-4 p-3 bg-white/50 border border-black/5 text-sm">
                  <span className="font-bold text-[#92400e]">Attack applied: {result.attack.label}</span> — {result.attack.description}
                </div>
              )}
              
              <div className="mt-4 text-[11px] font-mono text-[#74736A]">
                Intent Hash: {result.scenario.intentHash}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Rule by Rule */}
              <div className="bg-white border border-black/15 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-black/15">
                  <h2 className="text-sm font-bold text-[#232323]">Rule by rule</h2>
                  <p className="text-[11px] text-[#74736A] mt-1">
                    Blocking rules first. A rule that passes is not evidence it was thoroughly tested (see coverage below).
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#FAF9F5] border-b border-black/15 font-mono text-[#74736A] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-bold">Result</th>
                        <th className="px-4 py-3 font-bold">Invariant</th>
                        <th className="px-4 py-3 font-bold">Enforced at</th>
                        <th className="px-4 py-3 font-bold">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {[...blocking, ...passing].map((verdict) => (
                        <tr key={verdict.id} className="hover:bg-[#FAF9F5]/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-1.5 py-0.5 font-mono font-bold border ${verdict.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : verdict.action === 'VETO' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {verdict.ok ? "PASS" : verdict.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-[#232323]">{verdict.id}</td>
                          <td className="px-4 py-3 text-[#74736A]">{verdict.enforcedAt}</td>
                          <td className="px-4 py-3 text-[#232323] min-w-[200px]">{verdict.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Adversarial Run */}
              <div className="flex flex-col gap-6">
                <div className="bg-white border border-black/15 overflow-hidden">
                  <div className="p-5 border-b border-black/15 flex flex-col gap-4">
                    <div>
                      <h2 className="text-sm font-bold text-[#232323]">Adversarial Run</h2>
                      <p className="text-[11px] text-[#74736A] mt-1">
                        {result.report.cases} generated states from seed <span className="font-mono bg-[#F0EFE3] px-1 py-0.5">{result.report.seed}</span>. Reproducible, not a fresh roll of the dice.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#FAF9F5] border border-black/15 p-3 flex flex-col items-center text-center">
                        <span className="text-[10px] font-mono text-[#74736A] uppercase tracking-widest mb-1">C.Examples</span>
                        <span className={`text-xl font-bold ${result.report.passed ? 'text-emerald-700' : 'text-rose-700'}`}>{result.report.counterexamples.length}</span>
                      </div>
                      <div className="bg-[#FAF9F5] border border-black/15 p-3 flex flex-col items-center text-center">
                        <span className="text-[10px] font-mono text-[#74736A] uppercase tracking-widest mb-1">Full Cover</span>
                        <span className={`text-xl font-bold ${result.report.fullyCovered ? 'text-emerald-700' : 'text-amber-700'}`}>{result.report.fullyCovered ? 'YES' : 'NO'}</span>
                      </div>
                      <div className="bg-[#FAF9F5] border border-black/15 p-3 flex flex-col items-center text-center">
                        <span className="text-[10px] font-mono text-[#74736A] uppercase tracking-widest mb-1">Activate</span>
                        <span className={`text-xl font-bold ${result.activation.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{result.activation.ok ? 'YES' : 'NO'}</span>
                      </div>
                    </div>
                    {result.report.counterexamples.length > 0 && (
                      <div className="bg-rose-50 border border-rose-800/20 p-3 mt-1">
                         <span className="text-[10px] font-mono font-bold text-rose-800 uppercase tracking-widest block mb-2">Discovered Counterexamples</span>
                         {result.report.counterexamples.map((counter) => (
                           <p key={`${counter.invariant}-${counter.seed}`} className="text-xs font-mono text-rose-950 mb-1 last:mb-0">
                             <strong>{counter.invariant}</strong> — {counter.description}
                           </p>
                         ))}
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#FAF9F5] border-b border-black/15 font-mono text-[#74736A] uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-bold">Fired</th>
                          <th className="px-4 py-3 font-bold">Invariant</th>
                          <th className="px-4 py-3 font-bold">Triggers</th>
                          <th className="px-4 py-3 font-bold">Title</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {result.report.coverage.map((row) => (
                          <tr key={row.invariant} className="hover:bg-[#FAF9F5]/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-1.5 py-0.5 font-mono font-bold border ${row.covered ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {row.covered ? "YES" : "NEVER"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-[#232323]">{row.invariant}</td>
                            <td className="px-4 py-3 font-mono text-[#74736A]">{row.triggered}</td>
                            <td className="px-4 py-3 text-[#232323] truncate max-w-[150px]">{row.title}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
