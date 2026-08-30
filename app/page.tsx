import Link from "next/link";

const STATUS = [
  { name: "Alpaca read adapter", owner: "Lane A", state: "REPAIRED", detail: "Paper/data hostname allowlists, typed responses, feed separation and option pagination." },
  { name: "Candidate and alpha path", owner: "Lane A", state: "IN REVIEW", detail: "Defined-risk verticals, exact payoff, deterministic scenario ranking and fail-closed inputs." },
  { name: "Snapshot persistence", owner: "Lane B dependency", state: "BLOCKED", detail: "Canonical snapshots exist; Neon repositories and migrations do not." },
  { name: "Safety Kernel and permits", owner: "Lane B", state: "NOT IMPLEMENTED", detail: "No invariant kernel, signer, nonce store or permit executor exists." },
  { name: "Execution and proof", owner: "Lane B then Lane A", state: "BLOCKED", detail: "Autonomous orders, monitoring and proof UI wait for the permit and event-journal interfaces." },
  { name: "Historical validation", owner: "Lane C", state: "NOT AVAILABLE", detail: "No performance metric is published without a verified dataset and split manifest." },
];

const INVARIANTS = [
  "COV-01 Exact unexpired single-use permit",
  "COV-02 Finite max loss inside per-trade cap",
  "COV-03 Portfolio heat under the configured ceiling",
  "COV-04 Daily halt until a verified new session",
  "COV-05 Fresh liquid contracts inside mandate bands",
  "COV-06 No duplicate equivalent exposure in cooldown",
  "COV-07 Timely exit attempts with escalation",
  "COV-08 Missing or inconsistent state returns ABSTAIN",
];

export default function OverviewPage() {
  return (
    <div className="page-container">
      <div style={{ maxWidth: "820px", marginBottom: "36px" }}>
        <span className="badge badge-cyan">ALPACA AI TRADING AGENTS HACKATHON</span>
        <h1 style={{ fontSize: "3.2rem", fontWeight: 900, margin: "16px 0 12px" }}>Covenant</h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
          A paper-trading options agent under active construction. The Alpha Engine can build and rank defined-risk SPY/QQQ candidates, but broker execution remains disabled until Lane B supplies a verified permit executor.
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" }}>
          <Link href="/candidates" className="btn-primary">Open Candidate Lab</Link>
          <Link href="/permits" className="btn-secondary">View Integration Blockers</Link>
        </div>
      </div>

      <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "16px" }}>Implementation Status</h2>
      <div style={{ display: "grid", gap: "10px", marginBottom: "36px" }}>
        {STATUS.map((item) => (
          <div key={item.name} className="glass-panel" style={{ padding: "18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "center" }}>
            <div><strong>{item.name}</strong><div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{item.owner}</div></div>
            <span className={`badge ${item.state === "REPAIRED" ? "badge-emerald" : "badge-amber"}`}>{item.state}</span>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.86rem" }}>{item.detail}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: "16px" }}>Target Invariants</h2>
      <div className="grid-2">
        {INVARIANTS.map((invariant) => (
          <div key={invariant} className="glass-panel" style={{ padding: "16px", color: "var(--text-secondary)" }}>
            {invariant} <span className="badge badge-amber" style={{ marginLeft: "8px" }}>TARGET</span>
          </div>
        ))}
      </div>
    </div>
  );
}
