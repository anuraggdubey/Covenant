"use client";

import { useState } from "react";

const ACTIVE_PERMITS = [
  {
    permitId: "pmt_SPY_884920184",
    underlying: "SPY",
    structure: "BULL_CALL_DEBIT",
    exactLegs: [
      { side: "buy", symbol: "SPY260927C00500000", ratioQty: 1 },
      { side: "sell", symbol: "SPY260927C00510000", ratioQty: 1 },
    ],
    maxQuantity: 5,
    limitPriceBand: { min: "3.47", max: "3.83" },
    ttlSecondsRemaining: 42,
    nonce: "non_89a1f20d8847",
    status: "VALID_READY_TO_SUBMIT",
    signingKeyId: "ed25519_kernel_key_01",
    intentHash: "72a9fcf2c87d0bc0b13fd51b864d800243f8006a5c530d4400774c7876d641e5",
    signature: "3a8f9c1e0b4d7a6f2c8e1d9b0a7f3c4e5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c...",
  },
  {
    permitId: "pmt_QQQ_774920199",
    underlying: "QQQ",
    structure: "BULL_CALL_DEBIT",
    exactLegs: [
      { side: "buy", symbol: "QQQ260927C00450000", ratioQty: 1 },
      { side: "sell", symbol: "QQQ260927C00460000", ratioQty: 1 },
    ],
    maxQuantity: 5,
    limitPriceBand: { min: "3.47", max: "3.83" },
    ttlSecondsRemaining: 18,
    nonce: "non_33b8a1c99002",
    status: "VALID_READY_TO_SUBMIT",
    signingKeyId: "ed25519_kernel_key_01",
    intentHash: "819c4b8e1573dd3983ef7fc2ca205af09d2290e76b561bae168d3c159a4ae268",
    signature: "7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a...",
  },
];

export default function PermitConsolePage() {
  const [permits, setPermits] = useState(ACTIVE_PERMITS);

  return (
    <div className="page-container">
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
          <span className="badge badge-rose">PERMIT CONSOLE</span>
          <span className="badge badge-emerald">ED25519 VERIFICATION</span>
        </div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
          Permit Console
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Cryptographic TradePermits issued by the Safety Kernel. Only the Permit Executor can submit matching orders.
        </p>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        {permits.map((p) => (
          <div key={p.permitId} className="glass-panel-glow" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span className="mono" style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--cyan)" }}>
                    {p.permitId}
                  </span>
                  <span className="badge badge-emerald">{p.status}</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {p.underlying} · {p.structure} · Bound to Intent: <span className="mono" style={{ color: "var(--cyan)" }}>{p.intentHash.slice(0, 16)}...</span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  TTL Countdown
                </div>
                <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--amber)" }}>
                  {p.ttlSecondsRemaining}s
                </div>
              </div>
            </div>

            {/* Exact Legs Constraint */}
            <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px", fontWeight: 700 }}>
                Exact Bound Legs (Immutable)
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {p.exactLegs.map((leg, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <span className="mono" style={{ color: leg.side === "buy" ? "var(--emerald)" : "var(--rose)", fontWeight: 700 }}>
                      {leg.side.toUpperCase()} {leg.ratioQty}x
                    </span>
                    <span className="mono">{leg.symbol}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Constraints Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "0.82rem", marginBottom: "16px" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Max Quantity Allowed:</span>
                <div className="mono" style={{ fontWeight: 700 }}>{p.maxQuantity} contracts</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Limit Price Band:</span>
                <div className="mono" style={{ fontWeight: 700, color: "var(--cyan)" }}>
                  ${p.limitPriceBand.min} – ${p.limitPriceBand.max}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Single-Use Nonce:</span>
                <div className="mono" style={{ fontWeight: 700 }}>{p.nonce}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Signing Key:</span>
                <div className="mono" style={{ fontWeight: 700, color: "var(--emerald)" }}>{p.signingKeyId}</div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "12px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
              <span style={{ fontWeight: 700 }}>Ed25519 Signature: </span>
              <span className="mono" style={{ color: "var(--cyan)" }}>{p.signature}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
