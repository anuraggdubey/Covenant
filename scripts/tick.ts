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
    console.log(`\n[DATA MODE] ${result.dataMode}`);
    if (result.dataMode === "SYNTHETIC_MOCK") {
      console.log("  Synthetic fixtures only. These intents are not live or historical evidence.");
    }

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
        const gov = item.governance;
        if (gov) {
          console.log("");
          console.log(`  [SAFETY KERNEL] ${gov.decision}`);
          console.log(`    Reason:  ${gov.reason}`);
          if (gov.failedInvariants.length > 0) {
            console.log(`    Failed:  ${gov.failedInvariants.join(", ")}`);
          }
          if (gov.shrunkQuantity !== undefined) {
            console.log(`    Shrunk:  ${intent.quantity} -> ${gov.shrunkQuantity} contracts`);
          }
          if (gov.permit) {
            console.log(`    Permit:  ${gov.permit.permitId}`);
            console.log(`    Expires: ${gov.permit.expiresAt}`);
          }
          if (gov.heldForOperator) {
            console.log("    Held:    permit issued; submission is opt-in (COVENANT_LIVE_SUBMIT=true)");
          }
          if (gov.execution?.submitted === true) {
            console.log(`    ORDER:   ${gov.execution.orderId} (request ${gov.execution.requestId})`);
          } else if (gov.execution?.submitted === false) {
            console.log(`    REJECTED at executor: ${gov.execution.code} - ${gov.execution.reason}`);
          }
        } else {
          console.log("  [SAFETY KERNEL] not reached");
        }
      } else {
        console.log("  Decision:  ABSTAIN");
        console.log(`  Reason:    ${item.proposal.reason}`);
      }
    }

    console.log(`
[SESSION] ${result.session?.state ?? "UNKNOWN"} on ${result.session?.sessionDate ?? "?"}`);
    if (result.session?.haltReason) console.log(`  Halt: ${result.session.haltReason}`);
    console.log(`[SUBMISSION MODE] ${result.submissionMode}`);
    console.log(`[JOURNAL] ${result.events?.length ?? 0} hash-chained events`);

    console.log("\n===============================================================");
    console.log("   Tick complete. Governance ran on every proposal.            ");
    console.log("===============================================================\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n[FAIL-CLOSED TICK ERROR] ${msg}\n`);
    process.exit(1);
  }
}

main();
