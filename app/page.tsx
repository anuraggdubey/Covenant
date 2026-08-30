"use client";

import { useState } from "react";
import Link from "next/link";

const INVARIANTS = [
  { id: "COV-01", title: "Max Loss Finite & Defined", desc: "No undefined-risk or naked option positions. Max loss is strictly positive and bounded at emission." },
  { id: "COV-02", title: "Single-Trade Equity Cap", desc: "Standalone max loss ≤ 2% of verified paper account equity." },
  { id: "COV-03", title: "Portfolio Heat Ceiling", desc: "Aggregate potential max loss across open positions and pending orders ≤ 6% of equity." },
  { id: "COV-04", title: "Fresh Quotes & Spread Width", desc: "Quotes must be ≤ 60s old; bid/ask width within policy maximums; non-zero bid." },
  { id: "COV-05", title: "Strict Model Authority", desc: "AI models can only draft, veto, shrink, or explain. Models never author OCC symbols or activate policies." },
  { id: "COV-06", title: "Short-TTL Permit Binding", desc: "Orders require an Ed25519-signed permit bound to exact legs, price band, snapshot hashes, and nonces." },
  { id: "COV-07", title: "Deterministic Replay", desc: "Every approve, shrink, veto, and abstain is recorded into an append-only hash chain replayable by one command." },
  { id: "COV-08", title: "Daily Loss Halt & Session Reset", desc: "Daily drawdown of -3% halts new entries. Resets strictly on verified next market session from clock." },
];

export default function OverviewPage() {
  const [tickLoading, setTickLoading] = useState(false);
  const [tickResult, setTickResult] = useState<any>(null);

  const handleRunTick = async () => {
    setTickLoading(true);
    try {
      const res = await fetch("/api/cron/tick", { method: "POST" });
      const data = await res.json();
      setTickResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setTickLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Hero Section */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.9fr)", gap: "28px", marginBottom: "40px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <span className="badge badge-cyan">Alpaca AI Trading Agents Hackathon</span>
            <span className="badge badge-emerald">Sun 30 Aug 2026</span>
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 3.8rem)", fontWeight: 900, lineHeight: 1.05, marginBottom: "16px", letterSpacing: "-0.02em" }}>
            The Proof-Carrying <br />
            <span style={{ color: "var(--cyan)" }}>Options Agent.</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "680px", marginBottom: "28px" }}>
            A trader declares a mandate in plain English. Covenant compiles it into a versioned typed policy, attacks it with adversarial counterexamples before activation, and lets an Alpha Engine propose defined-risk SPY/QQQ spreads that it <strong>cannot execute</strong> without a signed, short-lived TradePermit.
          </p>

          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={handleRunTick} disabled={tickLoading}>
              {tickLoading ? "Executing Alpha Engine..." : "⚡ Run Autonomous Tick"}
            </button>
            <Link href="/candidates" className="btn-secondary">
              Explore Candidate Lab →
            </Link>
            <Link href="/proof" className="btn-secondary">
              View Proof Explorer →
            </Link>
          </div>
        </div>

        {/* Live Telemetry Panel */}
        <div className="glass-panel-glow" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Active System Status
              </span>
              <span className="badge badge-emerald">OPERATIONAL</span>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", marginBottom: "4px" }}>
              $100,000.00
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Alpaca Paper Equity · Level 3 Options Approved
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px", display: "grid", gap: "10px", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Target Underlyings:</span>
                <span className="mono" style={{ color: "#fff" }}>SPY, QQQ</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Risk Per Trade Cap:</span>
                <span className="mono" style={{ color: "var(--amber)" }}>2.0% ($2,000.00)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Portfolio Heat Limit:</span>
                <span className="mono" style={{ color: "var(--cyan)" }}>6.0% ($6,000.00)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Order Writing Auth:</span>
                <span className="mono" style={{ color: "var(--rose)" }}>ISOLATED EXECUTOR ONLY</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Zero write credentials in browser or alpha layer.
          </div>
        </div>
      </div>

      {/* Live Tick Execution Output (if triggered) */}
      {tickResult && (
        <div className="glass-panel" style={{ padding: "24px", marginBottom: "40px", borderColor: "var(--cyan)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--cyan)" }}>
              ⚡ Live Tick Execution Result
            </h3>
            <span className="mono" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {tickResult.timestamp}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {tickResult.underlyings?.map((u: any) => (
              <div key={u.symbol} style={{ background: "rgba(0,0,0,0.4)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 800, fontSize: "1rem" }}>{u.symbol}</span>
                  {"intent" in u.proposal ? (
                    <span className="badge badge-emerald">TRADE INTENT CREATED</span>
                  ) : (
                    <span className="badge badge-amber">ABSTAIN</span>
                  )}
                </div>

                {"intent" in u.proposal ? (
                  <div style={{ fontSize: "0.82rem", display: "grid", gap: "6px" }}>
                    <div><strong>Structure:</strong> {u.proposal.intent.structure}</div>
                    <div><strong>Quantity:</strong> {u.proposal.intent.quantity} contract(s)</div>
                    <div><strong>Limit Price:</strong> ${u.proposal.intent.limitPrice}</div>
                    <div><strong>Max Loss:</strong> ${u.proposal.intent.standaloneMaxLoss}</div>
                    <div><strong>Alpha Score:</strong> {u.proposal.intent.alphaScore}/100</div>
                    <div className="mono" style={{ fontSize: "0.72rem", color: "var(--cyan)", wordBreak: "break-all" }}>
                      Hash: {u.proposal.intent.intentHash}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {u.proposal.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Roles Section */}
      <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "20px" }}>
        Four Roles · Clear Authority Boundaries
      </h2>
      <div className="grid-4" style={{ marginBottom: "40px" }}>
        <div className="glass-panel" style={{ padding: "20px" }}>
          <span className="badge badge-cyan" style={{ marginBottom: "12px" }}>DRAFT ROLE</span>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "8px 0" }}>Mandate Studio</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Compiles natural language into versioned, typed policy JSON. Checks for contradictions before activation.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <span className="badge badge-amber" style={{ marginBottom: "12px" }}>ATTACK ROLE</span>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "8px 0" }}>Break Me Engine</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Property testing generates adversarial market states, nonce replays, and mutated permits to break policies before trading.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <span className="badge badge-emerald" style={{ marginBottom: "12px" }}>ALPHA ROLE</span>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "8px 0" }}>Alpha Engine</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Ingests real-time option chains, models exact standalone max loss, sizes defined-risk spreads, and emits TradeIntents.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <span className="badge badge-rose" style={{ marginBottom: "12px" }}>EXECUTION ROLE</span>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "8px 0" }}>Permit Executor</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            The sole order-writing path. Only submits exact multi-leg orders bound to verified, short-lived TradePermits.
          </p>
        </div>
      </div>

      {/* Invariants Grid */}
      <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "20px" }}>
        Eight Executable Invariants (COV-01 – COV-08)
      </h2>
      <div className="grid-2">
        {INVARIANTS.map((inv) => (
          <div key={inv.id} className="glass-panel" style={{ padding: "20px", borderLeft: "3px solid var(--cyan)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="mono" style={{ fontWeight: 800, color: "var(--cyan)" }}>{inv.id}</span>
              <span className="badge badge-emerald" style={{ fontSize: "0.65rem" }}>ENFORCED</span>
            </div>
            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "6px" }}>{inv.title}</h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{inv.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
