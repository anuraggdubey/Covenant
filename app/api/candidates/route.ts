import { NextResponse } from "next/server";
import { AlpacaReadClient } from "@/lib/alpaca/client";
import { loadCandidateLab } from "@/lib/alpha/candidate-lab";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true" || searchParams.get("refresh") === "true";

    const readClient = new AlpacaReadClient();
    const payload = await loadCandidateLab(readClient, { force });

    return NextResponse.json(payload);
  } catch (err: unknown) {
    console.error("Candidate generation failed", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to generate candidates",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
