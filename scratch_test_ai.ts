import { draftMandateWithAi } from "@/lib/ai/client";
import { compileMandate } from "@/lib/mandates/compile";

async function main() {
  const mandate = await draftMandateWithAi("conservative spy with maximum loss of $300 and profit with 1.5x on 10 first bc");
  console.log("DRAFTED MANDATE RESULT:\n", mandate);

  const compiled = compileMandate(mandate);
  console.log("\nSTATUS:", compiled.draft.status);
  console.log("CONTRADICTIONS:", compiled.contradictions);
}

if (process.env.NODE_ENV !== "test") {
  main().catch(console.error);
}
