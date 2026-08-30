import { runWalkForwardValidation } from "../lib/alpha/validation";

console.log("==================================================================");
console.log("   COVENANT — Walk-Forward Signal Validation Summary (2 Years)    ");
console.log("==================================================================");

for (const symbol of ["SPY", "QQQ"] as const) {
  const report = runWalkForwardValidation(symbol);
  console.log(`\n### Underlying: ${report.symbol} (${report.period})`);
  console.log(`  Total Trades Evaluated:      ${report.totalTrades}`);
  console.log(`  Overall Win Rate:            ${report.overallWinRate}`);
  console.log(`  Net Governed P&L:            ${report.overallPnl}`);
  console.log(`  Estimated Sharpe Ratio:      ${report.overallSharpe}`);
  console.log(`  Max Governed Drawdown:       ${report.overallMaxDrawdownPct}`);
  console.log(`  Loss Avoided by Gates:       ${report.lossAvoidedBySafetyGates}`);

  console.log("\n  Regime-Split Performance:");
  for (const r of report.regimes) {
    console.log(
      `    - ${r.regime.padEnd(16)} | Trades: ${String(r.totalTrades).padStart(2)} | Win Rate: ${r.winRate.padStart(6)} | PnL: ${r.totalPnl.padStart(10)} | Profit Factor: ${r.profitFactor}`
    );
  }
}

console.log("\n==================================================================");
console.log("   Walk-Forward Validation complete. Conservative costs applied.   ");
console.log("==================================================================\n");
