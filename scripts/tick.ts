import dotenv from "dotenv";
import { executeTick } from "../lib/alpha/loop";

// Load .env.local if present, else .env
dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  console.log("===============================================================");
  console.log("   COVENANT — Autonomous Tick Execution (Lane A Read Path)    ");
  console.log("===============================================================");
  console.log(`[INIT] Running at ${new Date().toISOString()}`);

  try {
    const result = await executeTick();

    console.log("\n[MARKET CLOCK]");
    console.log(`  Status:    ${result.clock.isOpen ? "OPEN" : "CLOSED"}`);
    console.log(`  Timestamp: ${result.clock.timestamp}`);
    console.log(`  Next Open: ${result.clock.nextOpen}`);
    console.log(`  Next Close:${result.clock.nextClose}`);

    console.log("\n[ACCOUNT SNAPSHOT]");
    console.log(`  Account ID:   ${result.account.id}`);
    console.log(`  Equity:       $${result.account.equity}`);
    console.log(`  Buying Power: $${result.account.buyingPower}`);
    console.log(`  Options Level:${result.account.optionsLevel}`);
    console.log(`  Snapshot Hash:${result.account.snapshotHash}`);

    console.log("\n[ALPHA ENGINE PROPOSALS]");
    for (const item of result.underlyings) {
      console.log(`\n--- Underlying: ${item.symbol} ---`);
      if (item.marketSnapshotHash) {
        console.log(`  Market Snapshot Hash: ${item.marketSnapshotHash}`);
      }
      if ("intent" in item.proposal) {
        const intent = item.proposal.intent;
        console.log("  Decision:  TRADE INTENT CREATED");
        console.log(`  Intent ID: ${intent.id}`);
        console.log(`  Structure: ${intent.structure}`);
        console.log(`  Quantity:  ${intent.quantity} contract(s)`);
        console.log(`  Limit Price: $${intent.limitPrice} (Band: $${intent.limitPriceBand.min} - $${intent.limitPriceBand.max})`);
        console.log(`  Max Loss:  $${intent.standaloneMaxLoss}`);
        console.log(`  Alpha Score: ${intent.alphaScore}`);
        console.log(`  Thesis:    ${intent.thesis}`);
        console.log(`  Intent Hash: ${intent.intentHash}`);
        console.log("  Legs:");
        for (const leg of intent.legs) {
          console.log(`    - ${leg.positionIntent} ${leg.ratioQty}x ${leg.symbol}`);
        }
      } else {
        console.log("  Decision:  ABSTAIN");
        console.log(`  Reason:    ${item.proposal.reason}`);
      }
    }

    console.log("\n===============================================================");
    console.log("   Tick completed successfully. Zero write credentials used.  ");
    console.log("===============================================================\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n[FAIL-CLOSED TICK ERROR] ${msg}\n`);
    process.exit(1);
  }
}

main();
