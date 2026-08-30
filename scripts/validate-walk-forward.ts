import { runWalkForwardValidation } from "../lib/alpha/validation";

console.log("COVENANT - WALK-FORWARD VALIDATION STATUS");

for (const symbol of ["SPY", "QQQ"] as const) {
  const report = runWalkForwardValidation(symbol);
  console.log(`\n${report.symbol}: ${report.status} (${report.provenance})`);
  console.log(report.reason);
  for (const requirement of report.requirements) {
    console.log(`- ${requirement}`);
  }
}

console.log("\nNo performance metrics are published until these requirements pass.");
