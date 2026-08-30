"use client";

import { useState } from "react";

const SAMPLE_ORDERS = [
  {
    orderId: "ord_alpaca_99482103",
    clientOrderId: "cov_non_89a1f20d8847",
    symbol: "SPY",
    orderClass: "mleg",
    side: "BUY",
    qty: 5,
    filledQty: 5,
    limitPrice: "$3.65",
    status: "FILLED",
    submittedAt: "2026-08-30T14:30:00Z",
    alpacaRequestId: "req_alp_8839102",
  },
  {
    orderId: "ord_alpaca_77391029",
    clientOrderId: "cov_non_33b8a1c99002",
    symbol: "QQQ",
    orderClass: "mleg",
    side: "BUY",
    qty: 5,
    filledQty: 5,
    limitPrice: "$3.65",
    status: "FILLED",
    submittedAt: "2026-08-30T14:30:02Z",
    alpacaRequestId: "req_alp_9948210",
  },
];

const SAMPLE_POSITIONS = [
  {
    symbol: "SPY 500/510 BULL CALL",
    underlying: "SPY",
    qty: 5,
    entryPrice: "$3.65",
    currentPrice: "$4.20",
    unrealizedPnl: "+$275.00",
    pnlPct: "+15.1%",
    dte: 28,
    expiry: "2026-09-27",
    monitorAction: "HOLD (Within Risk Envelope)",
  },
  {
    symbol: "QQQ 450/460 BULL CALL",
    underlying: "QQQ",
    qty: 5,
    entryPrice: "$3.65",
    currentPrice: "$4.10",
    unrealizedPnl: "+$225.00",
    pnlPct: "+12.3%",
    dte: 28,
    expiry: "2026-09-27",
    monitorAction: "HOLD (Within Risk Envelope)",
  },
];

export default function ExecutionPage() {
  const [halted, setHalted] = useState(false);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "inline-flex", gap: "8px", marginBottom: "8px" }}>
            <span className="badge badge-rose">PERMIT EXECUTOR BLOTTER</span>
            <span className="badge badge-emerald">PAPER TRADING</span>
          </div>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
            Execution & Position Monitor
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Real-time Alpaca paper order execution, active position lifecycle monitoring, and emergency kill-switch status.
          </p>
        </div>

        <div>
          <button
            className={`btn-primary`}
            style={{ background: halted ? "var(--emerald)" : "var(--rose)", color: "#fff" }}
            onClick={() => setHalted(!halted)}
          >
            {halted ? "Resume Trading (New Session)" : "🛑 Emergency Kill Switch"}
          </button>
        </div>
      </div>

      {/* Halt Status Alert if Halted */}
      {halted && (
        <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid var(--rose)", borderRadius: "8px", padding: "16px", marginBottom: "28px" }}>
          <div style={{ fontWeight: 800, color: "var(--rose)", marginBottom: "4px" }}>
            ⚠️ TRADING HALTED: FAIL-CLOSED SAFETY LOCK ACTIVE
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            New order emissions are blocked. State machine will reset strictly upon verified new market session from /v2/clock.
          </div>
        </div>
      )}

      {/* Active Positions & Monitor Rules */}
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "16px" }}>
        Active Governed Positions (Position Monitor Active)
      </h2>

      <div style={{ display: "grid", gap: "16px", marginBottom: "40px" }}>
        {SAMPLE_POSITIONS.map((pos, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: "20px", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) repeat(4, minmax(100px, 1fr))", gap: "16px", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{pos.symbol}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                Exp: {pos.expiry} ({pos.dte} DTE) · {pos.qty} contracts
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Entry Price</div>
              <div className="mono" style={{ fontWeight: 700 }}>{pos.entryPrice}</div>
            </div>

            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Current Price</div>
              <div className="mono" style={{ fontWeight: 700, color: "var(--cyan)" }}>{pos.currentPrice}</div>
            </div>

            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Unrealized P&L</div>
              <div className="mono" style={{ fontWeight: 800, color: "var(--emerald)" }}>
                {pos.unrealizedPnl} ({pos.pnlPct})
              </div>
            </div>

            <div>
              <span className="badge badge-emerald" style={{ fontSize: "0.68rem" }}>
                {pos.monitorAction}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Order Blotter */}
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "16px" }}>
        Alpaca Paper Multi-Leg Order Blotter
      </h2>

      <div style={{ display: "grid", gap: "12px" }}>
        {SAMPLE_ORDERS.map((ord) => (
          <div key={ord.orderId} className="glass-panel" style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "0.82rem" }}>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Order ID:</span>
              <div className="mono" style={{ color: "var(--cyan)", fontWeight: 700 }}>{ord.orderId}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Client Order ID (Nonce):</span>
              <div className="mono">{ord.clientOrderId}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Structure / Qty:</span>
              <div style={{ fontWeight: 700 }}>{ord.symbol} ({ord.orderClass}) · {ord.qty}x</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Limit Price:</span>
              <div className="mono" style={{ fontWeight: 700 }}>{ord.limitPrice}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Status:</span>
              <div><span className="badge badge-emerald">{ord.status}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
