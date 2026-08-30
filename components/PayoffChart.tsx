"use client";

interface PayoffChartProps {
  structure: string;
  maxLoss: string;
  maxGain: string;
  breakeven: string;
  limitPrice: string;
}

export function PayoffChart({
  structure,
  maxLoss,
  maxGain,
  breakeven,
  limitPrice,
}: PayoffChartProps) {
  const isBullish = structure.includes("BULL") || structure.includes("CALL");

  return (
    <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: "8px", padding: "16px", border: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
          Expiration Payoff Curve (Defined-Risk Envelope)
        </span>
        <span className="badge badge-emerald" style={{ fontSize: "0.65rem" }}>
          ZERO TAIL RISK
        </span>
      </div>

      {/* SVG Payoff Curve */}
      <div style={{ width: "100%", height: "130px", position: "relative" }}>
        <svg viewBox="0 0 400 120" style={{ width: "100%", height: "100%" }}>
          {/* Zero Line */}
          <line x1="20" y1="65" x2="380" y2="65" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Payoff Curve */}
          {isBullish ? (
            // Bull Call Debit Payoff: Flat loss on left, slopes up, flat gain on right
            <path
              d="M 20 95 L 120 95 L 260 25 L 380 25"
              fill="none"
              stroke="var(--cyan)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            // Bear Put Debit Payoff: Flat gain on left, slopes down, flat loss on right
            <path
              d="M 20 25 L 120 25 L 260 95 L 380 95"
              fill="none"
              stroke="var(--rose)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Breakeven Marker Point */}
          <circle cx={isBullish ? "190" : "190"} cy="65" r="4" fill="var(--amber)" />
          <text x="195" y="60" fill="var(--amber)" fontSize="10" fontFamily="monospace" fontWeight="bold">
            BE: ${breakeven}
          </text>

          {/* Max Gain Marker */}
          <text x={isBullish ? "300" : "40"} y="20" fill="var(--emerald)" fontSize="10" fontFamily="monospace" fontWeight="bold">
            Max Gain: +${maxGain}
          </text>

          {/* Max Loss Marker */}
          <text x={isBullish ? "40" : "300"} y="112" fill="var(--rose)" fontSize="10" fontFamily="monospace" fontWeight="bold">
            Max Loss: -${maxLoss}
          </text>
        </svg>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "8px" }}>
        <span>Entry Debit / Cost: <strong>${limitPrice} / share</strong></span>
        <span>Bounded by <strong>COV-01 & COV-02</strong></span>
      </div>
    </div>
  );
}
