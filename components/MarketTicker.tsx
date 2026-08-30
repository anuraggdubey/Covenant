"use client";

import { useState, useEffect } from "react";

export function MarketTicker() {
  const [marketData, setMarketData] = useState({
    spyPrice: "504.25",
    qqqPrice: "452.80",
    vixPrice: "14.85",
    yield10y: "4.21%",
    feed: "INDICATIVE (OPRA READY)",
    marketOpen: true,
  });

  useEffect(() => {
    async function loadLiveData() {
      try {
        const res = await fetch("/api/health");
        const json = await res.json();
        if (json.alpaca) {
          setMarketData((prev) => ({
            ...prev,
            feed: json.alpaca.feed ? `${json.alpaca.feed.toUpperCase()} (OPRA READY)` : prev.feed,
            marketOpen: json.alpaca.marketOpen ?? prev.marketOpen,
          }));
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadLiveData();
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
          <span className="mono" style={{ fontWeight: 800 }}>${marketData.spyPrice}</span>
          <span style={{ color: "var(--emerald)", fontWeight: 700 }}>+0.85%</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>QQQ</span>
          <span className="mono" style={{ fontWeight: 800 }}>${marketData.qqqPrice}</span>
          <span style={{ color: "var(--emerald)", fontWeight: 700 }}>+1.12%</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>VIX</span>
          <span className="mono" style={{ fontWeight: 800 }}>{marketData.vixPrice}</span>
          <span style={{ color: "var(--cyan)", fontWeight: 700 }}>-3.40%</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>10Y YIELD</span>
          <span className="mono" style={{ fontWeight: 800 }}>{marketData.yield10y}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--emerald)", fontWeight: 700 }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--emerald)", boxShadow: "0 0 8px var(--emerald)" }} />
          DATA FEED: {marketData.feed}
        </span>
      </div>
    </div>
  );
}
