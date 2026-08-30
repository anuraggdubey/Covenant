"use client";

import { useState, useEffect } from "react";

export function MarketTicker() {
  const [marketData, setMarketData] = useState({
    spy: { price: 504.25, change: "+0.85%", up: true },
    qqq: { price: 452.80, change: "+1.12%", up: true },
    vix: { price: 14.85, change: "-3.40%", up: false },
    tnx: { price: "4.21%", change: "-0.02", up: false },
  });

  // Micro-fluctuations for authentic market feel
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData((prev) => ({
        ...prev,
        spy: {
          ...prev.spy,
          price: Number((504.25 + (Math.random() - 0.5) * 0.15).toFixed(2)),
        },
        qqq: {
          ...prev.qqq,
          price: Number((452.80 + (Math.random() - 0.5) * 0.20).toFixed(2)),
        },
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 28px",
        background: "rgba(10, 14, 22, 0.95)",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "0.76rem",
        overflowX: "auto",
        gap: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>SPY</span>
          <span className="mono" style={{ fontWeight: 800 }}>${marketData.spy.price}</span>
          <span style={{ color: "var(--emerald)", fontWeight: 700 }}>{marketData.spy.change}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>QQQ</span>
          <span className="mono" style={{ fontWeight: 800 }}>${marketData.qqq.price}</span>
          <span style={{ color: "var(--emerald)", fontWeight: 700 }}>{marketData.qqq.change}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>VIX (VOLATILITY)</span>
          <span className="mono" style={{ fontWeight: 800 }}>{marketData.vix.price}</span>
          <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{marketData.vix.change}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>10Y YIELD</span>
          <span className="mono" style={{ fontWeight: 800 }}>{marketData.tnx.price}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--emerald)", fontWeight: 700 }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald)" }} />
          DATA FEED: INDICATIVE (OPRA READY)
        </span>
      </div>
    </div>
  );
}
