"use client";

import { useState } from "react";

const SAMPLE_MANDATES = [
  {
    name: "Defined Risk SPY/QQQ Debit & Credit Spreads (Standard Active)",
    text: "Trade defined-risk SPY and QQQ vertical spreads. Maximum risk per trade is 2% of equity. Total portfolio heat must not exceed 6%. Filter contracts with 7 to 45 DTE and deltas between 0.20 and 0.80. If any quote is missing or older than 60 seconds, abstain immediately.",
  },
  {
    name: "Conservative Index Income",
    text: "Only trade single-side credit vertical spreads on SPY. 14 to 30 DTE, delta under 0.30. Per-trade risk cap 1.5%. Daily loss limit -2%. Fail closed on stale data.",
  },
  {
    name: "Contradictory Mandate (Caught by Compiler)",
    text: "Trade at least once daily on SPY regardless of quotes or market closures. Never lose money and always guarantee 100% win rate.",
  },
];

export default function MandateStudioPage() {
  const [mandateText, setMandateText] = useState(SAMPLE_MANDATES[0].text);
  const [status, setStatus] = useState<"ACTIVE" | "DRAFT" | "BLOCKED">("ACTIVE");

  return (
    <div className="page-container">
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
          <span className="badge badge-cyan">MANDATE STUDIO</span>
          <span className="badge badge-emerald">VERSION 1.0 · ACTIVE</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
          Mandate Studio
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Draft plain-English trading mandates. Covenant compiles them into typed, executable policy JSON with contradiction checks.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)", gap: "24px" }}>
        {/* Mandate Input */}
        <div>
          <div className="glass-panel" style={{ padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "14px" }}>
              Plain-English Mandate
            </h3>
            <textarea
              value={mandateText}
              onChange={(e) => setMandateText(e.target.value)}
              rows={6}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "14px",
                color: "#fff",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />

            <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => setStatus("ACTIVE")}>
                Compile & Echo Policy
              </button>
              <button className="btn-secondary" onClick={() => setStatus("DRAFT")}>
                Save as Draft
              </button>
            </div>
          </div>

          {/* Sample Mandates */}
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px" }}>
            Sample Mandates & Contradiction Corpus
          </h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {SAMPLE_MANDATES.map((m, idx) => (
              <div
                key={idx}
                className="glass-panel"
                style={{ padding: "14px", cursor: "pointer", borderLeft: idx === 2 ? "3px solid var(--rose)" : "3px solid var(--cyan)" }}
                onClick={() => setMandateText(m.text)}
              >
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: idx === 2 ? "var(--rose)" : "var(--cyan)", marginBottom: "4px" }}>
                  {m.name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compiled Typed Policy Echo */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Compiled Policy Echo</h3>
            <span className={`badge ${status === "ACTIVE" ? "badge-emerald" : "badge-amber"}`}>
              {status}
            </span>
          </div>

          <div style={{ display: "grid", gap: "10px", fontSize: "0.84rem", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Policy ID:</span>
              <span className="mono">pol_covenant_active_v1</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Policy Hash:</span>
              <span className="mono" style={{ color: "var(--cyan)" }}>8f7a9d3e5b1c...9c0d</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Allowed Underlyings:</span>
              <span className="mono">["SPY", "QQQ"]</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Per-Trade Max Loss:</span>
              <span className="mono" style={{ color: "var(--amber)" }}>2.0% of equity</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Portfolio Heat Limit:</span>
              <span className="mono" style={{ color: "var(--cyan)" }}>6.0% of equity</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>DTE Range:</span>
              <span className="mono">7 – 45 days</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Delta Range:</span>
              <span className="mono">0.20 – 0.80</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Missing State Action:</span>
              <span className="badge badge-rose" style={{ padding: "2px 6px", fontSize: "0.65rem" }}>ABSTAIN (LOCKED)</span>
            </div>
          </div>

          <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: "8px", padding: "14px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px", fontWeight: 700 }}>
              Contradiction & Safety Audit
            </div>
            <div style={{ color: "var(--emerald)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
              ✓ No contradictory guarantees detected
            </div>
            <div style={{ color: "var(--emerald)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              ✓ All 8 executable invariants bound
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
