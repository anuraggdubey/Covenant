import { NextResponse } from "next/server";

import { executeTick } from "@/lib/alpha/loop";

export const dynamic = "force-dynamic";

/**
 * POST /api/tick/run — trigger one cycle from the dashboard.
 *
 * Unlike /api/cron/tick this carries no CRON_SECRET, because it is driven by
 * a button in the operator UI rather than a scheduler. That is safe for the
 * same reason the tick itself is: submission to the broker is gated behind
 * COVENANT_LIVE_SUBMIT, so the worst this endpoint can do without that flag
 * is read market data, evaluate invariants, and issue a permit it then holds.
 */
export async function POST() {
  const startedAt = Date.now();
  try {
    const result = await executeTick();
    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      tick: result
    });
  } catch (error) {
    // Provider errors are sanitised: a stack trace is not something the
    // browser needs, and it is not something we want in a screenshot.
    const message = error instanceof Error ? error.message : "Tick failed.";
    return NextResponse.json(
      {
        ok: false,
        durationMs: Date.now() - startedAt,
        error: message.replace(/[A-Za-z0-9/+]{24,}/g, "[redacted]").slice(0, 300)
      },
      { status: 200 }
    );
  }
}
