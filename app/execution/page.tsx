"use client";

import { useState, useEffect } from "react";

interface TickHistoryResponse {
  totalTicks: number;
  summary: {
    intentsGenerated: number;
    abstainDecisions: number;
  };
  recentTicks: Array<{
    timestamp: string;
    dataMode: string;
    clock: { isOpen: boolean; timestamp: string };
    account: { equity: string; snapshotHash: string };
    underlyings: Array<{
      symbol: string;
      marketSnapshotHash?: string;
      proposal: { intent?: { id: string; structure: string; quantity: number; limitPrice: string; standaloneMaxLoss: string; alphaScore: number; thesis: string; intentHash: string; legs: Array<{ symbol: string; positionIntent: string; ratioQty: number }> } } & { abstain?: true; reason?: string };
    }>;
    positionMonitor?: {
      summary: { total: number; holdCount: number; exitCount: number; escalateCount: number };
      positions: Array<{
        position: { symbol: string; underlying: string; qty: number; entryPrice: string; unrealizedPnl: string; dte: number };
        evaluation: { action: string; reason: string; shouldExit: boolean };
      }>;
    };
  }>;
}

interface PositionsResponse {
  dataMode: string;
  marketOpen: boolean;
  summary: { total: number; holdCount: number; exitCount: number; escalateCount: number };
  positions: Array<{
    position: { symbol: string; underlying: string; qty: number; entryPrice: string; currentPrice: string; unrealizedPnl: string; dte: number };
    evaluation: { action: string; reason: string; shouldExit: boolean };
  }>;
}

export default function ExecutionPage() {
  const [tickData, setTickData] = useState<TickHistoryResponse | null>(null);
  const [posData, setPosData] = useState<PositionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TICK_HISTORY" | "POSITIONS" | "PIPELINE">("TICK_HISTORY");

  useEffect(() => {
    Promise.all([
      fetch("/api/tick/history").then((r) => r.json()).catch(() => null),
      fetch("/api/positions").then((r) => r.json()).catch(() => null),
    ]).then(([ticks, positions]) => {
      setTickData(ticks);
      setPosData(positions);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-container">
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
          <span className="badge badge-cyan">AUTONOMOUS LOOP</span>
          <span className="badge badge-emerald">PERMIT EXECUTOR ACTIVE</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>Execution</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "720px" }}>
          Tick execution history, position monitoring, and the autonomous order pipeline.
          The Alpha Engine proposes TradeIntents — executed solely via signed Ed25519 TradePermits.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "28px" }}>
        <div className="glass-panel" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Ticks</div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--cyan)" }}>{tickData?.totalTicks ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Intents Generated</div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--emerald)" }}>{tickData?.summary.intentsGenerated ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Abstain Decisions</div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--amber)" }}>{tickData?.summary.abstainDecisions ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Open Positions</div>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--cyan)" }}>{posData?.summary.total ?? 0}</div>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: "flex", background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "4px", marginBottom: "24px", width: "fit-content" }}>
        {(["TICK_HISTORY", "POSITIONS", "PIPELINE"] as const).map((tab) => (
          <button
            key={tab}
            className={`btn-secondary ${activeTab === tab ? "btn-primary" : ""}`}
            style={{ padding: "6px 16px", border: "none" }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "TICK_HISTORY" ? "Tick History" : tab === "POSITIONS" ? "Position Monitor" : "Order Pipeline"}
          </button>
        ))}
      </div>

      {/* TAB: Tick History */}
      {activeTab === "TICK_HISTORY" && (
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Recent Tick Decisions</h2>
          {loading ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading tick history...</div>
          ) : tickData && tickData.recentTicks.length > 0 ? (
            <div style={{ display: "grid", gap: "12px" }}>
              {tickData.recentTicks.map((tick, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="mono" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{new Date(tick.timestamp).toLocaleString()}</span>
                      <span className={`badge ${tick.dataMode === "PAPER" ? "badge-emerald" : "badge-amber"}`} style={{ fontSize: "0.62rem" }}>{tick.dataMode}</span>
                      <span className={`badge ${tick.clock.isOpen ? "badge-emerald" : "badge-amber"}`} style={{ fontSize: "0.62rem" }}>
                        {tick.clock.isOpen ? "MARKET OPEN" : "MARKET CLOSED"}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Equity: ${tick.account.equity}</span>
                  </div>
                  {tick.underlyings.map((u) => (
                    <div key={u.symbol} style={{ padding: "10px", background: "var(--surface-sunken)", borderRadius: "6px", marginBottom: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mono" style={{ fontWeight: 800 }}>{u.symbol}</span>
                        {"intent" in u.proposal && u.proposal.intent ? (
                          <span className="badge badge-emerald">TRADE INTENT</span>
                        ) : (
                          <span className="badge badge-amber">ABSTAIN</span>
                        )}
                      </div>
                      {"intent" in u.proposal && u.proposal.intent ? (
                        <div style={{ marginTop: "8px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          <div>{u.proposal.intent.structure} · {u.proposal.intent.quantity} contracts · ${u.proposal.intent.limitPrice} limit</div>
                          <div style={{ color: "var(--text-muted)", marginTop: "4px" }}>Max Loss: ${u.proposal.intent.standaloneMaxLoss} · Alpha: {u.proposal.intent.alphaScore}/100</div>
                          <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>Hash: {u.proposal.intent.intentHash?.slice(0, 24)}...</div>
                        </div>
                      ) : (
                        <div style={{ marginTop: "6px", fontSize: "0.82rem", color: "var(--amber)" }}>
                          {u.proposal.reason ?? "No reason provided"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              No ticks recorded yet. Run <code className="mono" style={{ color: "var(--cyan)" }}>npm run tick</code> or trigger <code className="mono" style={{ color: "var(--cyan)" }}>POST /api/cron/tick</code> to start.
            </div>
          )}
        </div>
      )}

      {/* TAB: Position Monitor */}
      {activeTab === "POSITIONS" && (
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Open Positions & Exit Monitor</h2>
          {posData && posData.positions.length > 0 ? (
            <div style={{ display: "grid", gap: "12px" }}>
              {posData.positions.map((p, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: "18px", borderLeft: `4px solid ${p.evaluation.shouldExit ? "var(--rose)" : "var(--emerald)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono" style={{ fontWeight: 800 }}>{p.position.symbol}</span>
                    <span className={`badge ${p.evaluation.action === "HOLD" ? "badge-emerald" : p.evaluation.action === "ESCALATE" ? "badge-rose" : "badge-amber"}`}>
                      {p.evaluation.action}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginTop: "10px", fontSize: "0.82rem" }}>
                    <div><span style={{ color: "var(--text-muted)" }}>Qty:</span> <span className="mono" style={{ fontWeight: 700 }}>{p.position.qty}</span></div>
                    <div><span style={{ color: "var(--text-muted)" }}>Entry:</span> <span className="mono" style={{ fontWeight: 700 }}>${p.position.entryPrice}</span></div>
                    <div><span style={{ color: "var(--text-muted)" }}>Current:</span> <span className="mono" style={{ fontWeight: 700 }}>${p.position.currentPrice}</span></div>
                    <div><span style={{ color: "var(--text-muted)" }}>P&L:</span> <span className="mono" style={{ fontWeight: 700, color: parseFloat(p.position.unrealizedPnl) >= 0 ? "var(--emerald)" : "var(--rose)" }}>${p.position.unrealizedPnl}</span></div>
                    <div><span style={{ color: "var(--text-muted)" }}>DTE:</span> <span className="mono" style={{ fontWeight: 700 }}>{p.position.dte}</span></div>
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{p.evaluation.reason}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              No open option positions. Positions will appear here after the first permit-bound order is executed.
            </div>
          )}
        </div>
      )}

      {/* TAB: Order Pipeline */}
      {activeTab === "PIPELINE" && (
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Order Pipeline Architecture</h2>
          <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", textAlign: "center", marginBottom: "20px" }}>
              {[
                { step: "1", name: "Alpha Engine", desc: "Proposes TradeIntent", color: "var(--emerald)", status: "✓ ACTIVE" },
                { step: "→", name: "", desc: "", color: "var(--text-muted)", status: "" },
                { step: "2", name: "Safety Kernel", desc: "Evaluates COV-01…08", color: "var(--amber)", status: "⏳ LANE B" },
                { step: "→", name: "", desc: "", color: "var(--text-muted)", status: "" },
                { step: "3", name: "Permit Executor", desc: "Submits mleg order", color: "var(--amber)", status: "⏳ LANE B" },
              ].map((item, idx) => (
                item.name ? (
                  <div key={idx} style={{ padding: "14px", border: `1px solid ${item.color}33`, borderRadius: "8px", background: `${item.color}08` }}>
                    <div style={{ fontWeight: 800, color: item.color, fontSize: "0.9rem" }}>{item.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "4px 0" }}>{item.desc}</div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: item.color }}>{item.status}</span>
                  </div>
                ) : (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--text-muted)" }}>→</div>
                )
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
              <h3 style={{ fontWeight: 800, marginBottom: "12px" }}>Credential Isolation Boundaries</h3>
              <div style={{ display: "grid", gap: "8px", fontSize: "0.84rem" }}>
                <div style={{ padding: "10px", background: "var(--surface-sunken)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--emerald)", fontWeight: 700 }}>Alpha Engine</span>
                  <span style={{ color: "var(--text-secondary)" }}> — Zero broker credentials. Cannot submit orders, sign permits, or read API keys.</span>
                </div>
                <div style={{ padding: "10px", background: "var(--surface-sunken)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--cyan)", fontWeight: 700 }}>Safety Kernel</span>
                  <span style={{ color: "var(--text-secondary)" }}> — Holds signing private key. Re-fetches state independently (never trusts caller).</span>
                </div>
                <div style={{ padding: "10px", background: "var(--surface-sunken)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--amber)", fontWeight: 700 }}>Executor</span>
                  <span style={{ color: "var(--text-secondary)" }}> — Sole module with Alpaca write access. Verifies signature + intent hash before submission.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
