import { NextResponse } from "next/server";

import { count, report, rows } from "@/lib/shadow-ledger/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/shadow-ledger
 *
 * Governed versus ungoverned, on synchronised marks. Empty until ticks have
 * run — and it says so rather than seeding itself with plausible numbers,
 * because a shadow ledger that invents its own history is worse than none.
 */
export async function GET() {
  const candidates = count();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    candidates,
    empty: candidates === 0,
    emptyReason:
      candidates === 0
        ? "No kernel decisions recorded yet. Run a tick from the Execution page; " +
          "every candidate the kernel sees is marked here, approved or refused."
        : null,
    report: report(),
    rows: rows()
  });
}
