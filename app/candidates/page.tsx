"use client";

import { useState, useEffect } from "react";

export default function CandidateLabPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedUnderlying, setSelectedUnderlying] = useState<"SPY" | "QQQ">("SPY");

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidates");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const activeUnderlyingData = data?.underlyings?.find(
    (u: any) => u.underlying === selectedUnderlying
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
            <span className="badge badge-cyan">LANE A · ALPHA ENGINE</span>
            <span className="badge badge-emerald">DEFINED RISK ONLY</span>
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
            Candidate Lab
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Real-time SPY & QQQ option chain filtering, defined-risk vertical assembly, exact max loss calculations, and alpha ranking.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "4px" }}>
            <button
              className={`btn-secondary ${selectedUnderlying === "SPY" ? "btn-primary" : ""}`}
              style={{ padding: "6px 14px", border: "none" }}
              onClick={() => setSelectedUnderlying("SPY")}
            >
              SPY
            </button>
            <button
              className={`btn-secondary ${selectedUnderlying === "QQQ" ? "btn-primary" : ""}`}
              style={{ padding: "6px 14px", border: "none" }}
              onClick={() => setSelectedUnderlying("QQQ")}
            >
              QQQ
            </button>
          </div>

          <button className="btn-primary" onClick={fetchCandidates} disabled={loading}>
            {loading ? "Refreshing..." : "↻ Refresh Chains"}
          </button>
        </div>
      </div>

      {/* Underlying Market State Bar */}
      {activeUnderlyingData && (
        <div className="glass-panel" style={{ padding: "20px", marginBottom: "28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Underlying Price
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
              Contracts In Chain
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--cyan)" }}>
              {activeUnderlyingData.totalContractsInChain} snapshots
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Eligible Spreads Generated
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--emerald)" }}>
              {activeUnderlyingData.candidatesCount} vertical candidates
            </div>
          </div>
        </div>
      )}

      {/* Ranked Candidate Spreads List */}
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "16px" }}>
        Ranked Spread Candidates ({selectedUnderlying})
      </h2>

      {loading ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          Fetching option chains and computing payoff distributions...
        </div>
      ) : activeUnderlyingData?.rankedCandidates?.length > 0 ? (
        <div style={{ display: "grid", gap: "16px" }}>
          {activeUnderlyingData.rankedCandidates.map((cand: any, idx: number) => (
            <div
              key={cand.id}
              className="glass-panel"
              style={{
                padding: "20px",
                borderLeft: `4px solid ${idx === 0 ? "var(--emerald)" : "var(--cyan)"}`,
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span className="badge badge-cyan">RANK #{idx + 1}</span>
                    <span className="badge badge-emerald">{cand.structure}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Exp: {cand.expiry} ({cand.dte} DTE)
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800 }}>
                    {cand.thesis}
                  </h3>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Alpha Score
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: idx === 0 ? "var(--emerald)" : "var(--cyan)" }}>
                    {cand.alphaScore} <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>/100</span>
                  </div>
                </div>
              </div>

              {/* Legs Table */}
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "12px", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px", fontWeight: 700 }}>
                  Contract Legs
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {cand.legs.map((leg: any, lIdx: number) => (
                    <div key={lIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem" }}>
                      <span className="mono" style={{ color: leg.side === "buy" ? "var(--emerald)" : "var(--rose)", fontWeight: 700 }}>
                        {leg.positionIntent.toUpperCase()} {leg.ratioQty}x
                      </span>
                      <span className="mono" style={{ color: "var(--text-primary)" }}>
                        {leg.symbol}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payoff & Risk Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Sized Quantity:</span>
                  <div className="mono" style={{ fontWeight: 700, color: "#fff" }}>{cand.quantity} contracts</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Limit Price:</span>
                  <div className="mono" style={{ fontWeight: 700, color: "var(--cyan)" }}>${cand.limitPrice}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Standalone Max Loss:</span>
                  <div className="mono" style={{ fontWeight: 700, color: "var(--rose)" }}>${cand.standaloneMaxLoss}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Standalone Max Gain:</span>
                  <div className="mono" style={{ fontWeight: 700, color: "var(--emerald)" }}>${cand.standaloneMaxGain}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Risk / Reward:</span>
                  <div className="mono" style={{ fontWeight: 700, color: "#fff" }}>{cand.riskRewardRatio}</div>
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
  );
}
