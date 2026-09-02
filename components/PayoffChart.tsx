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
    <div className="bg-[#FAF9F5] border border-black/15 p-4 shadow-none">
      <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2 pb-2 border-b border-black/10">
        <span className="text-[10px] font-mono font-bold text-[#74736A] uppercase tracking-wider">
          PAYOFF ENVELOPE
        </span>
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EAEEDD] text-emerald-900 border border-emerald-800/30">
          DEFINED RISK
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Metric label={entryLabel} value={`$${entryAmount}`} sublabel="/ share" color="text-[#0B4FFF]" />
        <Metric label="Max Gain" value={`$${maxGain}`} color="text-emerald-800" />
        <Metric label="Max Loss" value={`$${maxLoss}`} color="text-rose-700" />
        <Metric label="Breakeven" value={`$${breakeven}`} color="text-[#232323]" />
      </div>

      <div className="text-[10px] font-mono text-[#74736A] mt-3 pt-2.5 border-t border-black/10 flex items-center justify-between">
        <span>{structure.replace(/_/g, " ")}</span>
        <span>BOUNDED TAIL ONLY</span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <div className="bg-white p-2.5 border border-black/10">
      <div className="text-[#74736A] text-[9px] font-mono uppercase font-bold tracking-wider">{label}</div>
      <div className={`font-mono text-sm font-bold mt-0.5 ${color}`}>
        {value}
        {sublabel && <span className="text-[10px] font-normal text-[#74736A] ml-1">{sublabel}</span>}
      </div>
    </div>
  );
}
