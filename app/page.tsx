"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface HealthData {
  status: string;
  timestamp: string;
  mode: string;
  alpaca: {
    connected: boolean;
    marketOpen: boolean;
    accountStatus: string;
    optionsApprovedLevel: number;
    equity: string;
  };
  invariants: {
    alphaReadClientHasNoWriteMethods: boolean;
    permitExecutorImplemented: boolean;
    level3OptionsApproved: boolean;
  };
}

const INVARIANTS = [
  { id: "COV-01", name: "Exact unexpired single-use permit", owner: "Lane B", status: "ENFORCED" },
  { id: "COV-02", name: "Finite max loss inside per-trade cap", owner: "Lane A + B", status: "ENFORCED" },
  { id: "COV-03", name: "Portfolio heat under the configured ceiling", owner: "Lane B", status: "ENFORCED" },
  { id: "COV-04", name: "Daily halt until a verified new session", owner: "Lane B", status: "ENFORCED" },
  { id: "COV-05", name: "Fresh liquid contracts inside mandate bands", owner: "Lane B", status: "ENFORCED" },
  { id: "COV-06", name: "No duplicate equivalent exposure in cooldown", owner: "Lane B", status: "ENFORCED" },
  { id: "COV-07", name: "Timely exit attempts with escalation", owner: "Lane A", status: "ENFORCED" },
  { id: "COV-08", name: "Missing or inconsistent state returns ABSTAIN", owner: "Lane B", status: "ENFORCED" },
];

const LANE_STATUS = [
  { name: "Alpha Engine", lane: "A", progress: 100, detail: "Read client, candidate factory, payoff math, signals, ranking, tick loop, and position monitor." },
  { name: "Safety Kernel & Permits", lane: "B", progress: 100, detail: "Safety kernel, 8 invariant evaluators, Ed25519 permits, isolated executor, Break Me, Shadow Ledger, and replay verifier." },
  { name: "Mandate & Validation", lane: "C", progress: 100, detail: "12 benchmark mandates committed, risk profiles calibrated, walk-forward validation complete." },
];

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      {/* Hero */}
      <div style={{ maxWidth: "860px", marginBottom: "40px" }}>
        <span className="badge badge-cyan">ALPACA AI TRADING AGENTS HACKATHON</span>
        <h1 style={{ fontSize: "3.2rem", fontWeight: 900, margin: "16px 0 12px", letterSpacing: "-0.02em" }}>
          Covenant
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
          A proof-carrying options agent that compiles trader mandates into typed, executable policy,
          attacks that policy before it goes live, and enforces eight invariants on every trade —
          with cryptographic evidence that every decision was governed.
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" }}>
          <Link href="/candidates" className="btn-primary">Open Candidate Lab</Link>
          <Link href="/execution" className="btn-secondary">View Execution</Link>
          <Link href="/mandates" className="btn-secondary">Mandate Studio</Link>
        </div>
      </div>

      {/* System Health */}
      <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "16px" }}>System Health</h2>
      <div className="glass-panel" style={{ padding: "20px", marginBottom: "32px" }}>
        {loading ? (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
            Connecting to Alpaca paper account...
          </div>
        ) : health?.status === "healthy" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Status</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald)", display: "inline-block" }} />
                <span style={{ fontWeight: 700, color: "var(--emerald)" }}>HEALTHY</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Mode</div>
              <div className="mono" style={{ fontWeight: 700, color: "var(--cyan)", marginTop: "4px" }}>{health.mode}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Market</div>
              <span className={`badge ${health.alpaca.marketOpen ? "badge-emerald" : "badge-amber"}`} style={{ marginTop: "4px" }}>
                {health.alpaca.marketOpen ? "OPEN" : "CLOSED"}
              </span>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Equity</div>
              <div className="mono" style={{ fontWeight: 800, fontSize: "1.2rem", marginTop: "4px" }}>${health.alpaca.equity}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Options Level</div>
              <div className="mono" style={{ fontWeight: 800, fontSize: "1.2rem", color: health.alpaca.optionsApprovedLevel >= 3 ? "var(--emerald)" : "var(--rose)", marginTop: "4px" }}>
                Level {health.alpaca.optionsApprovedLevel}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Permit Executor</div>
              <span className={`badge ${health.invariants.permitExecutorImplemented ? "badge-emerald" : "badge-amber"}`} style={{ marginTop: "4px" }}>
                {health.invariants.permitExecutorImplemented ? "READY" : "AWAITING LANE B"}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--amber)", textAlign: "center", padding: "20px" }}>
            ⚠ Health check unavailable — using synthetic mock data or Alpaca unreachable.
          </div>
        )}
      </div>

      {/* Lane Progress */}
      <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "16px" }}>Lane Progress</h2>
      <div style={{ display: "grid", gap: "12px", marginBottom: "32px" }}>
        {LANE_STATUS.map((lane) => (
          <div key={lane.name} className="glass-panel" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`badge ${lane.progress >= 90 ? "badge-emerald" : lane.progress >= 50 ? "badge-cyan" : "badge-amber"}`}>
                  LANE {lane.lane}
                </span>
                <strong>{lane.name}</strong>
              </div>
              <span className="mono" style={{ fontWeight: 800, fontSize: "1.1rem", color: lane.progress >= 90 ? "var(--emerald)" : "var(--amber)" }}>
                {lane.progress}%
              </span>
            </div>
            <div style={{ height: "4px", background: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${lane.progress}%`, background: lane.progress >= 90 ? "var(--emerald)" : lane.progress >= 50 ? "var(--cyan)" : "var(--amber)", borderRadius: "2px", transition: "width 0.5s ease" }} />
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "8px" }}>{lane.detail}</p>
          </div>
        ))}
      </div>

      {/* Invariant Health Grid */}
      <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "16px" }}>Invariant Status (COV-01 through COV-08)</h2>
      <div className="grid-2" style={{ marginBottom: "32px" }}>
        {INVARIANTS.map((inv) => (
          <div key={inv.id} className="glass-panel" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="mono" style={{ fontWeight: 800, color: "var(--cyan)", marginRight: "8px" }}>{inv.id}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{inv.name}</span>
            </div>
            <span className={`badge ${inv.status === "ENFORCED" ? "badge-emerald" : "badge-amber"}`}>
              {inv.status}
            </span>
          </div>
        ))}
      </div>

      {/* Architecture Overview */}
      <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "16px" }}>Architecture</h2>
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", textAlign: "center" }}>
          {[
            { name: "Alpha Engine", desc: "Proposes defined-risk trades", color: "var(--cyan)", status: "ACTIVE" },
            { name: "Safety Kernel", desc: "Evaluates 8 invariants", color: "var(--cyan)", status: "ACTIVE" },
            { name: "Permit Signer", desc: "Ed25519 short-TTL permits", color: "var(--cyan)", status: "ACTIVE" },
            { name: "Executor", desc: "Credential-isolated order path", color: "var(--cyan)", status: "ACTIVE" },
          ].map((component) => (
            <div key={component.name} style={{ padding: "16px", border: `1px solid ${component.color}33`, borderRadius: "8px", background: `${component.color}08` }}>
              <div style={{ fontWeight: 800, color: component.color, marginBottom: "6px" }}>{component.name}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "8px" }}>{component.desc}</div>
              <span className={`badge ${component.status === "ACTIVE" ? "badge-emerald" : "badge-amber"}`} style={{ fontSize: "0.62rem" }}>
                {component.status}
              </span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "16px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
          Intent → Kernel → Permit → Execute — each boundary enforces credential isolation by construction
        </div>
      </div>
    </div>
  );
}
