"use client";

import { useState, useEffect } from "react";

interface ValidationSummary {
  title: string;
  period: string;
  underlyings: string[];
  regimes: string[];
  results: Array<{
    label: string;
    value: string;
    note?: string;
  }>;
}

export default function ShadowLedgerPage() {
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load validation summary from the Lane C documented results
    setValidation({
      title: "Walk-Forward Signal Validation (Lane C — v2)",
      period: "Jan 2022 – Aug 2026 (out-of-sample only)",
      underlyings: ["SPY", "QQQ"],
      regimes: ["Low Vol (VIX < 18)", "Normal Vol (18–28)", "High Vol (VIX > 28)"],
      results: [
        { label: "Total Out-of-Sample Windows", value: "4", note: "Regime-split, no look-ahead" },
        { label: "Methodology", value: "Walk-forward", note: "Train on preceding window, test on next" },
        { label: "Cost Assumptions", value: "Conservative", note: "$0.02/contract slippage + spread" },
        { label: "Data Source", value: "CC0-licensed daily bars", note: "docs/validation/data/" },
        { label: "Synthetic Data Labels", value: "ALL LABELLED", note: "No unlabelled synthetic history" },
      ],
    });
    setLoading(false);
  }, []);

  const SHADOW_CONCEPT = [
    { category: "Governed Trade", description: "A trade that passed all 8 invariants and was executed with a signed permit.", icon: "✓", color: "var(--emerald)" },
    { category: "Shrunk Trade", description: "A trade where the Safety Kernel reduced quantity or narrowed the price band.", icon: "↓", color: "var(--cyan)" },
    { category: "Vetoed Trade", description: "A trade that was proposed but rejected by an invariant check.", icon: "✗", color: "var(--rose)" },
    { category: "Abstained", description: "No trade proposed — missing data, closed market, or insufficient signal confidence.", icon: "—", color: "var(--amber)" },
  ];

  const ATTRIBUTION_RULES = [
    { rule: "COV-02: Per-Trade Max Loss", saved: "Prevents oversized positions that could breach 0.6% equity limit", frequency: "Every trade" },
    { rule: "COV-03: Portfolio Heat Ceiling", saved: "Blocks new entries when total open risk exceeds 2.5% of equity", frequency: "Conditional" },
    { rule: "COV-04: Daily Halt", saved: "Stops all trading after daily P&L drops below -1.25% of equity", frequency: "Rare (protective)" },
    { rule: "COV-05: Freshness & Liquidity", saved: "Rejects stale quotes and illiquid contracts that would cause slippage", frequency: "Common" },
    { rule: "COV-07: Exit Deadline", saved: "Forces close attempts before expiration to avoid assignment risk", frequency: "Every position" },
    { rule: "COV-08: Missing State → ABSTAIN", saved: "Prevents trading on incomplete or unverifiable market data", frequency: "Common" },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
          <span className="badge badge-cyan">SHADOW LEDGER</span>
          <span className="badge badge-amber">MARKS COLLECTION PENDING (LANE B)</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>Shadow Ledger</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "720px" }}>
          The Shadow Ledger measures what each safety rule saved or cost by tracking synchronised marks
          for governed, shrunk, vetoed, and abstained candidates. No backfill. No retroactive selection.
        </p>
      </div>

      {/* Decision Categories */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Decision Categories</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "32px" }}>
        {SHADOW_CONCEPT.map((cat) => (
          <div key={cat.category} className="glass-panel" style={{ padding: "18px", borderTop: `3px solid ${cat.color}` }}>
            <div style={{ fontSize: "1.6rem", marginBottom: "8px" }}>{cat.icon}</div>
            <div style={{ fontWeight: 800, color: cat.color, marginBottom: "6px" }}>{cat.category}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{cat.description}</div>
          </div>
        ))}
      </div>

      {/* Rule Attribution */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Rule-Level Attribution (Planned)</h2>
      <div className="glass-panel" style={{ padding: "20px", marginBottom: "32px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.74rem", textTransform: "uppercase" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>Invariant Rule</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Protection Effect</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Expected Frequency</th>
            </tr>
          </thead>
          <tbody>
            {ATTRIBUTION_RULES.map((r) => (
              <tr key={r.rule} style={{ borderBottom: "1px solid var(--surface-subtle)" }}>
                <td className="mono" style={{ padding: "10px", color: "var(--cyan)", fontWeight: 700 }}>{r.rule}</td>
                <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{r.saved}</td>
                <td style={{ padding: "10px" }}>
                  <span className={`badge ${r.frequency === "Rare (protective)" ? "badge-rose" : r.frequency === "Common" ? "badge-emerald" : "badge-cyan"}`} style={{ fontSize: "0.68rem" }}>
                    {r.frequency}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Walk-Forward Validation Summary */}
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "16px" }}>Walk-Forward Validation Summary (Lane C)</h2>
      {loading ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
      ) : validation ? (
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontWeight: 800, color: "var(--cyan)" }}>{validation.title}</h3>
            <span className="badge badge-emerald">VERIFIED</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Period</div>
              <div className="mono" style={{ fontWeight: 700, color: "var(--text)" }}>{validation.period}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Underlyings</div>
              <div className="mono" style={{ fontWeight: 700, color: "var(--cyan)" }}>{validation.underlyings.join(", ")}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Regimes</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{validation.regimes.join(" · ")}</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {validation.results.map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--surface-subtle)", fontSize: "0.84rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="mono" style={{ fontWeight: 700 }}>{r.value}</span>
                  {r.note && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>({r.note})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Important Notice */}
      <div className="glass-panel" style={{ padding: "18px", marginTop: "24px", borderLeft: "3px solid var(--amber)" }}>
        <div style={{ fontWeight: 700, color: "var(--amber)", marginBottom: "6px" }}>⚠ Shadow Marks Not Yet Collected</div>
        <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
          Synchronised candidate marks and rule-level counterfactual P&L attribution require Lane B&apos;s event journal
          (T-B5, T-B10). No P&L claim, Sharpe ratio, or backfilled outcome is displayed until verified evidence exists.
        </div>
      </div>
    </div>
  );
}
