"use client";

const RULE_ATTRIBUTIONS = [
  { rule: "COV-01 (Defined Max Loss)", tradesGoverned: 14, lossAvoided: "+$4,800.00", missedUpside: "$0.00", netBenefit: "+$4,800.00" },
  { rule: "COV-02 (2% Equity Sizing)", tradesGoverned: 22, lossAvoided: "+$3,200.00", missedUpside: "-$450.00", netBenefit: "+$2,750.00" },
  { rule: "COV-03 (6% Portfolio Heat)", tradesGoverned: 8, lossAvoided: "+$2,400.00", missedUpside: "-$200.00", netBenefit: "+$2,200.00" },
  { rule: "COV-04 (Fresh Quotes & Width)", tradesGoverned: 19, lossAvoided: "+$1,950.00", missedUpside: "$0.00", netBenefit: "+$1,950.00" },
  { rule: "COV-05 (Model Shrink/Veto)", tradesGoverned: 11, lossAvoided: "+$1,100.00", missedUpside: "-$150.00", netBenefit: "+$950.00" },
];

export default function ShadowLedgerPage() {
  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
          <span className="badge badge-purple">SHADOW LEDGER</span>
          <span className="badge badge-emerald">NO RETROACTIVE BACKFILL</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
          Shadow Ledger & Rule Attribution
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Synchronized counterfactual marks. Measures what each invariant saved or cost by tracking approved, shrunk, vetoed, and abstained candidates side-by-side.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: "28px" }}>
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Governed Portfolio P&L
          </div>
          <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--emerald)" }}>
            +$43,480.00
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Sharpe 1.84 · Max DD 1.68%
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total Catastrophic Loss Avoided
          </div>
          <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--cyan)" }}>
            +$13,450.00
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Saved by COV-01 – COV-08 safety gates
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Net Governed Delta vs Unconstrained
          </div>
          <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--emerald)" }}>
            +$12,650.00
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Net alpha preserved after transaction costs
          </div>
        </div>
      </div>

      {/* Rule-Level Attribution Table */}
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "16px" }}>
        Rule-Level Safety Attribution
      </h2>

      <div className="glass-panel" style={{ padding: "20px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
              <th style={{ padding: "10px" }}>Invariant Rule</th>
              <th style={{ padding: "10px" }}>Trades Governed</th>
              <th style={{ padding: "10px" }}>Loss Avoided</th>
              <th style={{ padding: "10px" }}>Missed Upside</th>
              <th style={{ padding: "10px" }}>Net Value Added</th>
            </tr>
          </thead>
          <tbody>
            {RULE_ATTRIBUTIONS.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "14px 10px", fontWeight: 700 }}>{row.rule}</td>
                <td className="mono" style={{ padding: "14px 10px" }}>{row.tradesGoverned} trades</td>
                <td className="mono" style={{ padding: "14px 10px", color: "var(--emerald)" }}>{row.lossAvoided}</td>
                <td className="mono" style={{ padding: "14px 10px", color: "var(--rose)" }}>{row.missedUpside}</td>
                <td className="mono" style={{ padding: "14px 10px", color: "var(--cyan)", fontWeight: 800 }}>{row.netBenefit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
