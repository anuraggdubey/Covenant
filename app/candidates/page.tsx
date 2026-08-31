"use client";

import { useState, useEffect } from "react";
import { PayoffChart } from "@/components/PayoffChart";

interface ContractView {
  bid: string;
  ask: string;
  delta?: number;
  impliedVolatility?: number;
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
  dataMode: "PAPER" | "SYNTHETIC_MOCK";
  underlyings: UnderlyingView[];
}

export default function CandidateLabPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CandidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnderlying, setSelectedUnderlying] = useState<"SPY" | "QQQ">("SPY");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"SPREADS" | "CHAIN_LADDER">("SPREADS");

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidates");
      const json = await res.json() as CandidateResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Candidate data is unavailable.");
      setData(json);

      // Default selected expiry to first available
      const activeData = json.underlyings.find((underlying) => underlying.underlying === selectedUnderlying);
      if (activeData && activeData.expirations.length > 0 && !selectedExpiry) {
        setSelectedExpiry(activeData.expirations[0]);
      }
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : "Candidate data is unavailable.");
    } finally {
      setLoading(false);
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

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
            <span className="badge badge-cyan">LANE A · ALPACA MARKET DATA</span>
            <span className="badge badge-emerald">LATEST AVAILABLE SNAPSHOTS</span>
            {data?.dataMode === "SYNTHETIC_MOCK" && <span className="badge badge-amber">SYNTHETIC MOCK DATA</span>}
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
            Candidate Lab & Option Chains
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Ingesting Alpaca option snapshots, Greeks, implied volatility, and compiling defined-risk vertical spreads. Indicative data is delayed and modified by the provider.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "4px" }}>
            <button
              className={`btn-secondary ${selectedUnderlying === "SPY" ? "btn-primary" : ""}`}
              style={{ padding: "6px 14px", border: "none" }}
              onClick={() => {
                setSelectedUnderlying("SPY");
                setSelectedExpiry("");
              }}
            >
              SPY
            </button>
            <button
              className={`btn-secondary ${selectedUnderlying === "QQQ" ? "btn-primary" : ""}`}
              style={{ padding: "6px 14px", border: "none" }}
              onClick={() => {
                setSelectedUnderlying("QQQ");
                setSelectedExpiry("");
              }}
            >
              QQQ
            </button>
          </div>

          <div style={{ display: "flex", background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "4px" }}>
            <button
              className={`btn-secondary ${activeTab === "SPREADS" ? "btn-primary" : ""}`}
              style={{ padding: "6px 14px", border: "none" }}
              onClick={() => setActiveTab("SPREADS")}
            >
              Ranked Spreads
            </button>
            <button
              className={`btn-secondary ${activeTab === "CHAIN_LADDER" ? "btn-primary" : ""}`}
              style={{ padding: "6px 14px", border: "none" }}
              onClick={() => setActiveTab("CHAIN_LADDER")}
            >
              Option Snapshot Ladder
            </button>
          </div>

          <button className="btn-primary" onClick={fetchCandidates} disabled={loading}>
            {loading ? "Fetching..." : "Refresh Candidate Data"}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: "18px", marginBottom: "24px", color: "var(--amber)" }}>
          {error}
        </div>
      )}

      {/* Underlying Market State Bar */}
      {activeUnderlyingData && (
        <div className="glass-panel" style={{ padding: "20px", marginBottom: "28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {data?.dataMode === "SYNTHETIC_MOCK" ? "Synthetic Underlying Price" : "Latest Alpaca Paper Price"}
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff" }}>
              ${activeUnderlyingData.underlyingPrice}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Trend & Volatility Signal
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span className={`badge ${activeUnderlyingData.signals.trend === "BULLISH" ? "badge-emerald" : "badge-amber"}`}>
                {activeUnderlyingData.signals.trend}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Realized Vol: {(activeUnderlyingData.signals.realizedVol20d * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Feed & Total Contracts
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--cyan)" }}>
              {activeUnderlyingData.feed?.toUpperCase()} · {activeUnderlyingData.totalContractsInChain} contracts
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Eligible Spreads Generated
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--emerald)" }}>
              {activeUnderlyingData.candidatesCount} defined-risk setups
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Ranked Spread Candidates */}
      {activeTab === "SPREADS" && (
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "16px" }}>
            Ranked Spread Candidates ({selectedUnderlying})
          </h2>

          {loading ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              Ingesting live option chains and generating defined-risk spreads...
            </div>
          ) : activeUnderlyingData && activeUnderlyingData.rankedCandidates.length > 0 ? (
            <div style={{ display: "grid", gap: "24px" }}>
              {activeUnderlyingData.rankedCandidates.map((cand, idx) => (
                <div
                  key={cand.id}
                  className="glass-panel-glow"
                  style={{
                    padding: "24px",
                    borderLeft: `4px solid ${idx === 0 ? "var(--emerald)" : "var(--cyan)"}`,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)", gap: "24px", marginBottom: "18px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span className="badge badge-cyan">RANK #{idx + 1}</span>
                        <span className="badge badge-emerald">{cand.structure}</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          Exp: {cand.expiry} ({cand.dte} DTE)
                        </span>
                      </div>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "12px" }}>
                        {cand.thesis}
                      </h3>

                      {/* Legs Breakdown */}
                      <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "14px" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px", fontWeight: 700 }}>
                          Exact OCC Contract Legs
                        </div>
                        <div style={{ display: "grid", gap: "8px" }}>
                          {cand.legs.map((leg, lIdx) => (
                            <div key={lIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.86rem" }}>
                              <span className="mono" style={{ color: leg.side === "buy" ? "var(--emerald)" : "var(--rose)", fontWeight: 800 }}>
                                {leg.positionIntent.toUpperCase()} {leg.ratioQty}x
                              </span>
                              <span className="mono" style={{ color: "#fff" }}>
                                {leg.symbol}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Payoff Curve Visualizer */}
                    <div>
                      <PayoffChart
                        structure={cand.structure}
                        maxLoss={cand.standaloneMaxLoss}
                        maxGain={cand.standaloneMaxGain}
                        breakeven={cand.breakevenUnderlying}
                        limitPrice={cand.limitPrice}
                      />
                    </div>
                  </div>

                  {/* Payoff & Risk Metrics */}
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", fontSize: "0.84rem" }}>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Sized Quantity:</span>
                      <div className="mono" style={{ fontWeight: 800, color: "#fff" }}>{cand.quantity} contracts</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Limit Price / Share:</span>
                      <div className="mono" style={{ fontWeight: 800, color: "var(--cyan)" }}>${cand.limitPrice}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Standalone Max Loss:</span>
                      <div className="mono" style={{ fontWeight: 800, color: "var(--rose)" }}>${cand.standaloneMaxLoss}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Standalone Max Gain:</span>
                      <div className="mono" style={{ fontWeight: 800, color: "var(--emerald)" }}>${cand.standaloneMaxGain}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Risk / Reward:</span>
                      <div className="mono" style={{ fontWeight: 800, color: "var(--cyan)" }}>{cand.riskRewardRatio}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Alpha Score:</span>
                      <div className="mono" style={{ fontWeight: 900, color: "var(--emerald)" }}>{cand.alphaScore}/100</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>90% Lower Bound:</span>
                      <div className="mono" style={{ fontWeight: 800, color: "var(--emerald)" }}>${cand.lowerConfidenceBoundPnl}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--amber)" }}>
              No candidate vertical spreads currently meet active policy filter criteria. (Fail-closed ABSTAIN).
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Live Real Option Chain Ladder */}
      {activeTab === "CHAIN_LADDER" && (
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
              Option Snapshot Ladder — {selectedUnderlying}
            </h2>

            {/* Expiration Picker */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Expiration:</span>
              <select
                value={currentExpiry}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                style={{
                  background: "var(--bg-dark)",
                  color: "var(--cyan)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "0.82rem",
                  fontFamily: "monospace",
                  fontWeight: 700,
                }}
              >
                {activeExpirations.map((exp: string) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "center" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.5)", color: "var(--text-muted)", fontSize: "0.74rem", textTransform: "uppercase" }}>
                  <th colSpan={4} style={{ padding: "8px", color: "var(--cyan)" }}>CALLS (BULLISH)</th>
                  <th style={{ padding: "8px", background: "rgba(255,255,255,0.06)", color: "#fff" }}>STRIKE</th>
                  <th colSpan={4} style={{ padding: "8px", color: "var(--rose)" }}>PUTS (BEARISH)</th>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                  <th style={{ padding: "6px" }}>Delta</th>
                  <th style={{ padding: "6px" }}>IV</th>
                  <th style={{ padding: "6px" }}>Bid</th>
                  <th style={{ padding: "6px" }}>Ask</th>
                  <th style={{ padding: "6px", background: "rgba(255,255,255,0.06)" }}>$ Strike</th>
                  <th style={{ padding: "6px" }}>Bid</th>
                  <th style={{ padding: "6px" }}>Ask</th>
                  <th style={{ padding: "6px" }}>IV</th>
                  <th style={{ padding: "6px" }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {currentLadder.length > 0 ? (
                  currentLadder.map((row, rIdx) => {
                    const c = row.call;
                    const p = row.put;
                    return (
                      <tr key={rIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className="mono" style={{ padding: "8px", color: "var(--text-secondary)" }}>
                          {c?.delta !== undefined ? c.delta.toFixed(2) : "—"}
                        </td>
                        <td className="mono" style={{ padding: "8px", color: "var(--text-muted)" }}>
                          {c?.impliedVolatility ? (c.impliedVolatility * 100).toFixed(1) + "%" : "—"}
                        </td>
                        <td className="mono" style={{ padding: "8px", color: "var(--emerald)", fontWeight: 700 }}>
                          {c?.bid ? `$${c.bid}` : "—"}
                        </td>
                        <td className="mono" style={{ padding: "8px" }}>
                          {c?.ask ? `$${c.ask}` : "—"}
                        </td>
                        <td className="mono" style={{ padding: "8px", fontWeight: 800, background: "rgba(255,255,255,0.06)", color: "var(--cyan)" }}>
                          ${row.strike}
                        </td>
                        <td className="mono" style={{ padding: "8px", color: "var(--emerald)", fontWeight: 700 }}>
                          {p?.bid ? `$${p.bid}` : "—"}
                        </td>
                        <td className="mono" style={{ padding: "8px" }}>
                          {p?.ask ? `$${p.ask}` : "—"}
                        </td>
                        <td className="mono" style={{ padding: "8px", color: "var(--text-muted)" }}>
                          {p?.impliedVolatility ? (p.impliedVolatility * 100).toFixed(1) + "%" : "—"}
                        </td>
                        <td className="mono" style={{ padding: "8px", color: "var(--text-secondary)" }}>
                          {p?.delta !== undefined ? p.delta.toFixed(2) : "—"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ padding: "20px", color: "var(--text-muted)" }}>
                      No contracts found for expiration {currentExpiry}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
