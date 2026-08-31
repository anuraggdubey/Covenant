import { NextResponse } from "next/server";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { monitorPositions } from "@/lib/monitor/position-monitor";
import { defaultActivePolicy } from "@/lib/alpha/loop";

export const dynamic = "force-dynamic";

/**
 * GET /api/positions
 * Returns open option positions with exit evaluations from the position monitor.
 */
export async function GET() {
  try {
    const readClient = new AlpacaReadClient();
    const clock = await readClient.getClock();
    const result = await monitorPositions(readClient, defaultActivePolicy);

    return NextResponse.json({
      timestamp: result.timestamp,
      dataMode: readClient.isMockMode() ? "SYNTHETIC_MOCK" : "PAPER",
      marketOpen: clock.is_open,
      positions: result.positions,
      summary: result.summary,
    });
  } catch (err: unknown) {
    console.error("Position monitor failed", err);
    return NextResponse.json(
      {
        error: "Position monitor unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
