import { NextResponse } from "next/server";

import {
  listProofSourcesAsync,
  loadDemoProof,
  loadLiveProof,
  loadPermitProof,
} from "@/lib/alpha/proof-explorer";

export const dynamic = "force-dynamic";

/**
 * GET /api/proof
 * GET /api/proof?source=demo
 * GET /api/proof?source=live&index=0
 * GET /api/proof?source=permit-1234
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");

  if (source === null || source === "") {
    const sources = await listProofSourcesAsync();
    return NextResponse.json({ sources });
  }

  if (source === "demo") {
    return NextResponse.json(loadDemoProof());
  }

  if (source.startsWith("permit-")) {
    const permitId = source.replace("permit-", "");
    const payload = await loadPermitProof(permitId);
    if (payload === null) {
      return NextResponse.json({ error: "Permit proof not found." }, { status: 404 });
    }
    return NextResponse.json(payload);
  }

  if (source === "live") {
    const index = Number(searchParams.get("index") ?? "0");
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json({ error: "index must be a non-negative integer." }, { status: 400 });
    }
    const payload = loadLiveProof(index);
    if (payload === null) {
      return NextResponse.json(
        { error: "No live tick journal at that index. Run a tick from Execution first." },
        { status: 404 }
      );
    }
    return NextResponse.json(payload);
  }

  return NextResponse.json({ error: "Unknown source. Use demo, live, or permit-[id]." }, { status: 400 });
}
