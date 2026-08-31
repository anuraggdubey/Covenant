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
  const signedPrice = Number(limitPrice);
  const entryLabel = signedPrice < 0 ? "Entry Credit" : "Entry Debit";
  const entryAmount = Number.isFinite(signedPrice) ? Math.abs(signedPrice).toFixed(2) : limitPrice;

  return (
    <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: "8px", padding: "16px", border: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
          Expiration Payoff Envelope
        </span>
        <span className="badge badge-emerald" style={{ fontSize: "0.65rem" }}>
          DEFINED RISK
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "14px" }}>
        <Metric label={entryLabel} value={`$${entryAmount} / share`} color="var(--cyan)" />
        <Metric label="Maximum Gain" value={`$${maxGain}`} color="var(--emerald)" />
        <Metric label="Maximum Loss" value={`$${maxLoss}`} color="var(--rose)" />
        <Metric label="Breakeven" value={`$${breakeven}`} color="var(--amber)" />
      </div>

      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "14px" }}>
        {structure} payoff values are computed from the contract legs. Permit enforcement is not yet implemented.
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>{label}</div>
      <div className="mono" style={{ color, fontWeight: 800, marginTop: "3px" }}>{value}</div>
    </div>
  );
}
