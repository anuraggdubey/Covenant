import { NextResponse } from "next/server";
import { getTickHistory } from "@/lib/alpha/loop";

export const dynamic = "force-dynamic";

/**
 * GET /api/tick/history
 * Returns the in-memory tick execution history for the Execution dashboard.
 * History resets on server restart — this is sufficient for demo/hackathon purposes.
 */
export async function GET() {
  const history = getTickHistory();

  // Build a summary of decisions across all ticks
  let totalTicks = history.length;
  let intentCount = 0;
  let abstainCount = 0;

  for (const tick of history) {
    for (const u of tick.underlyings) {
      if ("intent" in u.proposal) intentCount++;
      else abstainCount++;
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalTicks,
    summary: {
      intentsGenerated: intentCount,
      abstainDecisions: abstainCount,
    },
    // Return the most recent 50 ticks (newest first)
    recentTicks: [...history].reverse().slice(0, 50),
  });
}
