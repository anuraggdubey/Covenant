"use client";

import { useEffect, useState } from "react";

type HealthSummary =
  | { status: "loading" | "unavailable" }
  | {
      status: "available";
      mode: "PAPER_TRADING" | "SYNTHETIC_MOCK";
      marketOpen: boolean;
      optionFeed: string;
      stockFeed: string;
    };

export function MarketTicker() {
  const [health, setHealth] = useState<HealthSummary>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealth() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Health endpoint unavailable");

        const payload = (await response.json()) as {
          mode?: "PAPER_TRADING" | "SYNTHETIC_MOCK";
          alpaca?: {
            marketOpen?: boolean;
            optionFeed?: string;
            stockFeed?: string;
          };
        };
        if (
          !payload.mode ||
          typeof payload.alpaca?.marketOpen !== "boolean" ||
          !payload.alpaca.optionFeed ||
          !payload.alpaca.stockFeed
        ) {
          throw new Error("Health response incomplete");
        }

        setHealth({
          status: "available",
          mode: payload.mode,
          marketOpen: payload.alpaca.marketOpen,
          optionFeed: payload.alpaca.optionFeed.toUpperCase(),
          stockFeed: payload.alpaca.stockFeed.toUpperCase(),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHealth({ status: "unavailable" });
      }
    }

    void loadHealth();
    return () => controller.abort();
  }, []);

  const items =
    health.status === "available"
      ? [
          ["RUNTIME", health.mode],
          ["MARKET", health.marketOpen ? "OPEN" : "CLOSED"],
          ["STOCK FEED", health.stockFeed],
          ["OPTIONS FEED", health.optionFeed],
        ]
      : [["ALPACA HEALTH", health.status === "loading" ? "CHECKING" : "UNAVAILABLE"]];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 28px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "0.76rem",
        overflowX: "auto",
        gap: "24px",
      }}
    >
      {items.map(([label, value]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>{label}</span>
          <span className="mono" style={{ fontWeight: 800 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
