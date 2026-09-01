"use client";

const TOTAL_TESTS_PASSING = 203;
const GENERATED_HOSTILE_STATES = 318;

const TEST_COVERAGE = [
  { file: "tests/alpaca/client.test.ts", tests: 9, module: "Alpaca Read Client", invariants: ["COV-08"] },
  { file: "tests/alpha/engine.test.ts", tests: 6, module: "Alpha Engine", invariants: ["COV-02", "COV-05", "COV-08"] },
  { file: "tests/alpha/factory.test.ts", tests: 3, module: "Candidate Factory", invariants: ["COV-02", "COV-05"] },
  { file: "tests/alpha/loop.test.ts", tests: 6, module: "Autonomous Tick Loop", invariants: ["COV-08"] },
  { file: "tests/alpha/payoff.test.ts", tests: 6, module: "Payoff & Max Loss", invariants: ["COV-02"] },
  { file: "tests/alpha/signals.test.ts", tests: 2, module: "Market Signals", invariants: ["COV-08"] },
  { file: "tests/alpha/snapshots.test.ts", tests: 5, module: "Snapshot Hashing", invariants: ["COV-05", "COV-08"] },
  { file: "tests/alpha/validation.test.ts", tests: 2, module: "Walk-Forward Status", invariants: [] },
  { file: "tests/alpha/occ.test.ts", tests: 3, module: "OCC Symbol Parser", invariants: ["COV-05"] },
  { file: "tests/monitor/monitor-integration.test.ts", tests: 5, module: "Position Monitor Integration", invariants: ["COV-07", "COV-08"] },
  { file: "tests/monitor/position-monitor.test.ts", tests: 6, module: "Position Monitor", invariants: ["COV-07", "COV-08"] },
  { file: "tests/env/server.test.ts", tests: 8, module: "Env Validation", invariants: ["COV-08"] },
  { file: "tests/boundaries/credentials.test.ts", tests: 7, module: "Credential Boundaries", invariants: ["COV-01", "COV-08"] },
  { file: "tests/safety/invariants.test.ts", tests: 28, module: "Invariant Evaluators", invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"] },
  { file: "tests/safety/kernel.test.ts", tests: 18, module: "Safety Kernel", invariants: ["COV-02", "COV-04", "COV-08"] },
  { file: "tests/safety/kill-switch.test.ts", tests: 5, module: "Kill Switch", invariants: ["COV-04", "COV-08"] },
  { file: "tests/execution/executor.attacks.test.ts", tests: 14, module: "Permit Executor Attacks", invariants: ["COV-01"] },
  { file: "tests/audit/audit.test.ts", tests: 10, module: "Replay Verifier & Hash Chain", invariants: ["COV-01", "COV-04"] },
  { file: "tests/break-me/break-me.test.ts", tests: 18, module: "Break Me Property Engine", invariants: ["COV-01", "COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-07", "COV-08"] },
  { file: "tests/shadow-ledger/shadow.test.ts", tests: 9, module: "Shadow Ledger", invariants: ["COV-02", "COV-03", "COV-04", "COV-05", "COV-06", "COV-08"] },
  { file: "tests/mandates/corpus.test.ts", tests: 33, module: "Mandate Compiler", invariants: ["COV-08"] },
];

const INVARIANT_COVERAGE: Record<string, { name: string; testCount: number; status: "COVERED" | "PARTIAL" | "UNTESTED" }> = {
  "COV-01": { name: "Exact unexpired single-use permit", testCount: 24, status: "COVERED" },
  "COV-02": { name: "Finite max loss inside per-trade cap", testCount: 34, status: "COVERED" },
  "COV-03": { name: "Portfolio heat under ceiling", testCount: 10, status: "COVERED" },
  "COV-04": { name: "Daily halt until new session", testCount: 18, status: "COVERED" },
  "COV-05": { name: "Fresh liquid contracts in bands", testCount: 28, status: "COVERED" },
  "COV-06": { name: "No duplicate exposure in cooldown", testCount: 8, status: "COVERED" },
  "COV-07": { name: "Timely exit with escalation", testCount: 6, status: "COVERED" },
  "COV-08": { name: "Missing state returns ABSTAIN", testCount: 41, status: "COVERED" },
};

const ATTACK_SCENARIOS = [
  { name: "Mutated Contract Before Submit", invariant: "COV-01", result: "BLOCKED", detail: "Executor rejects changed legs before any Alpaca transport call." },
  { name: "Quantity Increased After Shrink", invariant: "COV-01", result: "BLOCKED", detail: "Executor rejects 3 lots against a permit capped at 1." },
  { name: "Replayed Permit Nonce", invariant: "COV-01", result: "BLOCKED", detail: "Second use of the same signed permit is rejected as NONCE_REPLAYED." },
  { name: "Expired Permit TTL", invariant: "COV-01", result: "BLOCKED", detail: "A permit older than its 60-second TTL is rejected without burning the nonce." },
  { name: "Tampered Market Snapshot Hash", invariant: "COV-08", result: "BLOCKED", detail: "Engine returns ABSTAIN when snapshotHash doesn't match canonical content." },
  { name: "Below Level 3 Options Account", invariant: "COV-08", result: "BLOCKED", detail: "Engine rejects proposals from accounts with insufficient options level." },
  { name: "Inactive Policy Status", invariant: "COV-08", result: "BLOCKED", detail: "Engine refuses to propose against DRAFT or BLOCKED policies." },
  { name: "Inverted Strike Structure", invariant: "COV-02", result: "BLOCKED", detail: "Payoff math throws on Bull Call where long strike >= short strike." },
  { name: "Debit Exceeds Spread Width", invariant: "COV-02", result: "BLOCKED", detail: "Payoff math rejects debit larger than the spread width." },
  { name: "Cross-Underlying Legs", invariant: "COV-05", result: "BLOCKED", detail: "Payoff math rejects legs from different underlyings (SPY + QQQ)." },
  { name: "Insufficient Signal History", invariant: "COV-08", result: "BLOCKED", detail: "Engine ABSTAINS when fewer than 21 daily bars are available." },
  { name: "Exit Deadline Expired", invariant: "COV-07", result: "ESCALATED", detail: "Monitor escalates when close attempts exceed the deadline." },
  { name: "Incomplete Position State", invariant: "COV-07", result: "ESCALATED", detail: "Monitor escalates on positions with zero legs or invalid data." },
  { name: "Zero Confidence Multiplier (Model Veto)", invariant: "COV-08", result: "BLOCKED", detail: "Engine ABSTAINS when model confidence is 0, respecting veto authority." },
];

export default function BreakMePage() {
  const coveredInvariants = Object.values(INVARIANT_COVERAGE).filter((v) => v.status === "COVERED").length;

  return (
    <div className="page-container">
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
          <span className="badge badge-cyan">BREAK ME ENGINE</span>
          <span className="badge badge-emerald">{TOTAL_TESTS_PASSING} TESTS PASSING</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>Break Me</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "720px" }}>
          Can you break the trader? This page shows the test coverage across all invariants,
          recorded attack scenarios, and property test results. The current Break Me run
          covers all eight invariants across deterministic attacks and generated hostile states.
        </p>
      </div>

      {/* Test Suite Summary */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Test Suite Coverage</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "28px" }}>
        <div className="glass-panel" style={{ padding: "18px", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 900, color: "var(--emerald)" }}>{TOTAL_TESTS_PASSING}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Tests Passing</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 900, color: "var(--cyan)" }}>{GENERATED_HOSTILE_STATES}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Generated States</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 900, color: "var(--emerald)" }}>{coveredInvariants}/8</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Invariants Covered</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: "2rem", fontWeight: 900, color: "var(--emerald)" }}>0</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Untested Invariants</div>
        </div>
      </div>

      {/* Invariant Coverage Map */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Invariant Coverage Map</h2>
      <div style={{ display: "grid", gap: "8px", marginBottom: "28px" }}>
        {Object.entries(INVARIANT_COVERAGE).map(([id, inv]) => (
          <div key={id} className="glass-panel" style={{ padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="mono" style={{ fontWeight: 800, color: "var(--cyan)", minWidth: "60px" }}>{id}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{inv.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {inv.testCount > 0 && (
                <span className="mono" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{inv.testCount} tests</span>
              )}
              <span className={`badge ${inv.status === "COVERED" ? "badge-emerald" : inv.status === "PARTIAL" ? "badge-cyan" : "badge-amber"}`}>
                {inv.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recorded Attack Scenarios */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Recorded Attack Scenarios</h2>
      <div style={{ display: "grid", gap: "10px", marginBottom: "28px" }}>
        {ATTACK_SCENARIOS.map((attack, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: "14px", borderLeft: `3px solid ${attack.result === "BLOCKED" ? "var(--emerald)" : "var(--amber)"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>{attack.name}</span>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--cyan)" }}>{attack.invariant}</span>
              </div>
              <span className={`badge ${attack.result === "BLOCKED" ? "badge-emerald" : "badge-amber"}`}>{attack.result}</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{attack.detail}</div>
          </div>
        ))}
      </div>

      {/* Test File Breakdown */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Test File Breakdown</h2>
      <div className="glass-panel" style={{ padding: "20px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.74rem", textTransform: "uppercase" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>File</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Module</th>
              <th style={{ textAlign: "center", padding: "10px" }}>Tests</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Invariants Tested</th>
            </tr>
          </thead>
          <tbody>
            {TEST_COVERAGE.map((file) => (
              <tr key={file.file} style={{ borderBottom: "1px solid var(--surface-subtle)" }}>
                <td className="mono" style={{ padding: "10px", color: "var(--cyan)", fontWeight: 600 }}>{file.file}</td>
                <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{file.module}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>
                  <span className="badge badge-emerald" style={{ fontSize: "0.68rem" }}>{file.tests}</span>
                </td>
                <td style={{ padding: "10px" }}>
                  {file.invariants.length > 0 ? (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {file.invariants.map((inv) => (
                        <span key={inv} className="mono" style={{ fontSize: "0.72rem", color: "var(--cyan)", background: "var(--accent-subtle)", padding: "2px 6px", borderRadius: "4px" }}>{inv}</span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
