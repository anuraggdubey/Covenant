import { NextResponse } from "next/server";

import { verifyProofManifest } from "@/lib/alpha/proof-explorer";
import type { RunManifest } from "@/types/domain";

export const dynamic = "force-dynamic";

/**
 * POST /api/proof/verify
 * Re-runs manifest verification against the current code.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const manifest =
    typeof body === "object" && body !== null && "manifest" in body
      ? (body as { manifest: RunManifest }).manifest
      : (body as RunManifest);

  if (!Array.isArray(manifest?.events)) {
    return NextResponse.json({ error: "Body must include a RunManifest with events." }, { status: 400 });
  }

  const report = verifyProofManifest(manifest);
  return NextResponse.json({ report });
}
